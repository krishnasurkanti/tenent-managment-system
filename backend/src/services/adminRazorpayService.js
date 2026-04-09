const crypto = require("crypto");
const Invoice = require("../models/Invoice");

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
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    throw new Error("Invoice not found.");
  }

  const amount = Math.round(invoice.total_amount * 100);
  if (amount <= 0) {
    throw new Error("Invoice amount must be greater than zero for Razorpay order.");
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: String(invoice._id),
      notes: {
        invoice_id: String(invoice._id),
        hostel_id: String(invoice.hostel_id),
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.description || "Unable to create Razorpay order.");
  }

  invoice.payment_provider = "razorpay";
  invoice.razorpay_order_id = data.id;
  await invoice.save();

  return {
    invoice_id: invoice._id,
    razorpay_key_id: keyId,
    razorpay_order_id: data.id,
    amount: data.amount,
    currency: data.currency,
  };
}

function verifyRazorpayWebhookSignature(rawBody, signature) {
  const { webhookSecret } = requireRazorpayConfig();
  if (!webhookSecret) {
    throw new Error("Razorpay webhook secret is not configured.");
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
}

async function processRazorpayWebhook(rawBody, signature) {
  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    throw new Error("Invalid Razorpay webhook signature.");
  }

  const payload = JSON.parse(rawBody.toString("utf8"));
  const event = payload.event;
  const orderId = payload.payload?.payment?.entity?.order_id || payload.payload?.order?.entity?.id;
  const paymentId = payload.payload?.payment?.entity?.id || "";

  if (!orderId) {
    return { ignored: true, reason: "Missing order id." };
  }

  const invoice = await Invoice.findOne({ razorpay_order_id: orderId });
  if (!invoice) {
    return { ignored: true, reason: "Invoice not found for order id." };
  }

  if (event === "payment.captured" || event === "order.paid") {
    invoice.status = "paid";
    invoice.razorpay_payment_id = paymentId || invoice.razorpay_payment_id;
    invoice.payment_note = "Auto-marked paid from Razorpay webhook.";
    await invoice.save();
    return { ok: true, invoice_id: invoice._id, status: invoice.status };
  }

  if (event === "payment.failed") {
    invoice.status = "pending";
    invoice.payment_note = "Razorpay payment failed event received.";
    await invoice.save();
    return { ok: true, invoice_id: invoice._id, status: invoice.status };
  }

  return { ignored: true, reason: `Unhandled event: ${event}` };
}

module.exports = {
  createRazorpayOrderForInvoice,
  processRazorpayWebhook,
};
