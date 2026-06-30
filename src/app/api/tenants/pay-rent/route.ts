import { NextResponse } from "next/server";
import { recordTenantPayment, type RecordPaymentOptions } from "@/data/tenantStore";
import { savePaymentProofImage } from "@/lib/payment-proof-upload";
import { validatePaymentProofWithMagicBytes } from "@/lib/document-upload";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { backendFetch } from "@/services/core/backend-api";
import { calculateNextDueDate, getDueStatus } from "@/utils/payment";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.NODE_ENV === "production" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  // In demo mode only the demo-owner may record payments (local owners must upgrade to live)
  if (session.isDemo && session.ownerId !== "demo-owner") {
    return NextResponse.json({ message: "Forbidden." }, { status: 403 });
  }

  const contentType = request.headers.get("content-type") ?? "";
  let tenantId: string, amount: number, paidOnDate: string, paymentMethod: string, txnId: string;
  let proofImage: FormDataEntryValue | null = null;
  let payOptions: RecordPaymentOptions = {};

  if (contentType.includes("application/json")) {
    const json = await request.json() as Record<string, unknown>;
    tenantId = String(json.tenantId ?? "").trim();
    amount = Number(json.amount ?? 0);
    paidOnDate = String(json.paidOnDate ?? "").trim();
    paymentMethod = String(json.paymentMethod ?? "").trim().toLowerCase();
    txnId = String(json.txnId ?? "").trim();
    payOptions = extractPayOptions(json);
  } else {
    const formData = await request.formData();
    tenantId = String(formData.get("tenantId") ?? "").trim();
    amount = Number(formData.get("amount") ?? 0);
    paidOnDate = String(formData.get("paidOnDate") ?? "").trim();
    paymentMethod = String(formData.get("paymentMethod") ?? "").trim().toLowerCase();
    txnId = String(formData.get("txnId") ?? "").trim();
    proofImage = formData.get("proofImage");
    // Extract discount/partial fields from FormData
    const fdObj: Record<string, unknown> = {};
    for (const [k, v] of formData.entries()) { if (k !== "proofImage") fdObj[k] = v; }
    payOptions = extractPayOptions(fdObj);
  }

  if (!tenantId || !paidOnDate || !Number.isFinite(amount) || amount < 0 || !paymentMethod) {
    return NextResponse.json({ message: "Tenant, payment amount, payment mode, and paid date are required." }, { status: 400 });
  }
  if (!["cash", "online"].includes(paymentMethod)) {
    return NextResponse.json({ message: "Invalid payment method. Must be 'cash' or 'online'." }, { status: 400 });
  }
  if (amount > 10_000_000) {
    return NextResponse.json({ message: "Payment amount cannot exceed 10,000,000." }, { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOnDate)) {
    return NextResponse.json({ message: "Payment date must be YYYY-MM-DD." }, { status: 400 });
  }
  // M-01 fix: reject future paidOnDate â€” prevents tenant appearing "Active/Paid" for years
  {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (paidOnDate > todayStr) {
      return NextResponse.json({ message: "Payment date cannot be in the future." }, { status: 400 });
    }
  }

  if (proofImage instanceof File && proofImage.name) {
    const proofError = await validatePaymentProofWithMagicBytes(proofImage);
    if (proofError) {
      return NextResponse.json({ message: proofError }, { status: 400 });
    }
  }

  try {
    let proofImageName = "";
    let proofImageUrl = "";
    let proofMimeType = "";

    if (proofImage instanceof File && proofImage.name) {
      const savedProof = await savePaymentProofImage(proofImage, tenantId);
      proofImageName = savedProof.proofImageName;
      proofImageUrl = savedProof.proofImageUrl;
      proofMimeType = savedProof.proofMimeType;
    }

    if (session.isLive) {
      const existingResponse = await backendFetch(`/api/tenants/${encodeURIComponent(tenantId)}`);
      const existingPayload = (await existingResponse.json()) as { tenant?: Record<string, unknown>; message?: string };

      if (!existingResponse.ok || !existingPayload.tenant) {
        return NextResponse.json({ message: existingPayload.message || "Tenant not found." }, { status: existingResponse.status || 404 });
      }

      const tenant = existingPayload.tenant;
      const billingAnchorDate = typeof tenant.billingAnchorDate === "string" ? tenant.billingAnchorDate : paidOnDate;
      const rawCycle = tenant.billingCycle;
      const billingCycleForCalc: "daily" | "weekly" | "monthly" =
        rawCycle === "daily" || rawCycle === "weekly" ? rawCycle : "monthly";
      const nextDueDate = calculateNextDueDate(paidOnDate, billingAnchorDate, billingCycleForCalc);
      const paymentHistory = Array.isArray(tenant.paymentHistory) ? tenant.paymentHistory : [];
      const tone = getDueStatus(nextDueDate).tone;

      const updateResponse = await backendFetch(`/api/tenants/${encodeURIComponent(tenantId)}`, {
        method: "PUT",
        body: JSON.stringify({
          rentPaid: amount,
          paidOnDate,
          nextDueDate,
          // send the updatedAt the client last saw so the backend conflict check fires
          expectedUpdatedAt: existingPayload.tenant?.updatedAt ?? existingPayload.tenant?.updated_at,
          paymentHistory: [
            {
              paymentId: `pay-${tenantId}-${crypto.randomUUID()}`,
              amount,
              paidOnDate,
              nextDueDate,
              status: tone === "green" ? "active" : tone === "orange" || tone === "yellow" ? "due-soon" : "overdue",
              paymentMethod: paymentMethod === "online" ? "online" : "cash",
              txnId,
              proofImageName,
              proofImageUrl,
              proofMimeType,
            },
            // cap at 119 existing so total never exceeds 120
            ...paymentHistory.slice(0, 119),
          ],
        }),
      });
      const updatePayload = (await updateResponse.json()) as { tenant?: unknown; message?: string };

      if (!updateResponse.ok) {
        return NextResponse.json({ message: updatePayload.message || "Unable to record payment." }, { status: updateResponse.status });
      }

      return NextResponse.json({ tenant: updatePayload.tenant });
    }

    const tenant = recordTenantPayment(
      tenantId,
      amount,
      paidOnDate,
      paymentMethod === "online" ? "online" : "cash",
      txnId,
      proofImageName,
      proofImageUrl,
      proofMimeType,
      session.isDemo,
      payOptions,
    );
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to record payment." },
      { status: 400 },
    );
  }
}

function extractPayOptions(src: Record<string, unknown>): RecordPaymentOptions {
  const discountTypeRaw = String(src.discountType ?? "").trim();
  const discountType = discountTypeRaw === "fixed" || discountTypeRaw === "percent" ? discountTypeRaw : undefined;
  // N-04 fix: cap percent discount at 100% â€” values > 100 create negative effective rent
  const rawDiscountValue = discountType ? Math.max(0, Number(src.discountValue ?? 0)) : undefined;
  const discountValue = rawDiscountValue !== undefined
    ? (discountTypeRaw === "percent" ? Math.min(100, rawDiscountValue) : rawDiscountValue)
    : undefined;
  const discountMonths = discountType ? Math.max(1, Math.floor(Number(src.discountMonths ?? 1))) : undefined;
  const discountNote = discountType ? String(src.discountNote ?? "").trim() || undefined : undefined;
  const isPartial = src.isPartial === true || src.isPartial === "true";
  const isBalanceCollection = src.isBalanceCollection === true || src.isBalanceCollection === "true";
  const partialNote = String(src.partialNote ?? "").trim() || undefined;
  const balanceNote = String(src.balanceNote ?? "").trim() || undefined;
  const deferredTo = String(src.deferredTo ?? "").trim() || undefined;
  return { discountType, discountValue, discountMonths, discountNote, isPartial, partialNote, deferredTo, isBalanceCollection, balanceNote };
}
