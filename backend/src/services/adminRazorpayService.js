const crypto = require("crypto");
const { query } = require("../config/db");

function requireRazorpayConfig() {
  const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
  const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();

  if (!keyId || !keySecret) {
    throw new Error("Razorpay keys are not configured.");
  }

  return { keyId, keySecret, webhookSecret };
}

async function createRazorpayOrderForInvoice(invoiceId) {
  const { keyId, keySecret } = requireRazorpayConfig();

  const result = await query(
    `SELECT id, owner_id, total_amount FROM owner_invoices WHERE id = $1 LIMIT 1`,
    [invoiceId],
  );
  if (result.rowCount === 0) throw new Error("Invoice not found.");

  const invoice = result.rows[0];
  const amount = Math.round(Number(invoice.total_amount) * 100);
  if (amount <= 0) throw new Error("Invoice amount must be greater than zero for Razorpay order.");

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: String(invoice.id),
      notes: {
        invoice_id: String(invoice.id),
        owner_id: String(invoice.owner_id),
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.description || "Unable to create Razorpay order.");
  }

  await query(
    `UPDATE owner_invoices SET payment_provider = 'razorpay', razorpay_order_id = $2, updated_at = NOW() WHERE id = $1`,
    [invoice.id, data.id],
  );

  return {
    invoice_id: invoice.id,
    razorpay_key_id: keyId,
    razorpay_order_id: data.id,
    amount: data.amount,
    currency: data.currency,
  };
}

function verifyRazorpayWebhookSignature(rawBody, signature) {
  const { webhookSecret } = requireRazorpayConfig();
  if (!webhookSecret) throw new Error("Razorpay webhook secret is not configured.");

  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
}

async function processRazorpayWebhook(rawBody, signature) {
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new Error("Invalid Razorpay webhook signature.");
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const event = payload.event;
  const orderId =
    payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;
  const paymentId = payload.payload?.payment?.entity?.id || "";

  if (!orderId) return { ignored: true, reason: "Missing order id." };

  const result = await query(
    `SELECT id FROM owner_invoices WHERE razorpay_order_id = $1 LIMIT 1`,
    [orderId],
  );
  if (result.rowCount === 0) return { ignored: true, reason: "Invoice not found for order id." };

  const invoiceId = result.rows[0].id;

  if (event === "payment.captured" || event === "order.paid") {
    await query(
      `UPDATE owner_invoices
       SET status = 'paid',
           razorpay_payment_id = $2,
           payment_note = 'Auto-marked paid from Razorpay webhook.',
           updated_at = NOW()
       WHERE id = $1`,
      [invoiceId, paymentId || null],
    );
    return { ok: true, invoice_id: invoiceId, status: "paid" };
  }

  if (event === "payment.failed") {
    await query(
      `UPDATE owner_invoices
       SET status = 'pending',
           payment_note = 'Razorpay payment failed event received.',
           updated_at = NOW()
       WHERE id = $1`,
      [invoiceId],
    );
    return { ok: true, invoice_id: invoiceId, status: "pending" };
  }

  return { ignored: true, reason: `Unhandled event: ${event}` };
}

module.exports = { createRazorpayOrderForInvoice, processRazorpayWebhook };
