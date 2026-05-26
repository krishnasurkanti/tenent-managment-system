import { NextResponse } from "next/server";
import { addFinanceLedgerEntry } from "@/data/financeLedgerStore";
import { getTenantRecordById, removeTenantRecord } from "@/data/tenantStore";
import { requireOwnerSession } from "@/lib/session-mode";
import { apiRateLimit, getTrustedClientIp } from "@/lib/rate-limit";
import { backendFetch } from "@/services/core/backend-api";
import { parseJsonBody } from "@/lib/safe-json";

export const dynamic = "force-dynamic";

type TenantForSettlement = {
  tenantId?: string;
  fullName?: string;
  hostelId?: string;
  advanceAmount?: number;
  advanceBalance?: number;
};

export async function POST(request: Request) {
  const session = await requireOwnerSession();
  if (!session) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  if (process.env.PLAYWRIGHT_TEST !== "true" && apiRateLimit(getTrustedClientIp(request))) {
    return NextResponse.json({ message: "Too many requests. Try again later." }, { status: 429 });
  }

  const { body, error: jsonError } = await parseJsonBody<{
    tenantId?: string;
    advanceRefundEligible?: boolean;
    refundAdvance?: boolean;
    refundAmount?: number;
    settlementNote?: string;
    settlementDate?: string;
  }>(request);
  if (jsonError) return jsonError;

  if (!body.tenantId) {
    return NextResponse.json({ message: "Tenant ID is required." }, { status: 400 });
  }

  try {
    const refundAmount = Number(body.refundAmount ?? 0);
    if (!Number.isFinite(refundAmount) || refundAmount < 0 || refundAmount > 10_000_000) {
      return NextResponse.json({ message: "Refund amount must be a valid amount." }, { status: 400 });
    }

    if (session.isLive) {
      let tenantForLedger: TenantForSettlement | null = null;
      const existingResponse = await backendFetch(`/api/tenants/${encodeURIComponent(body.tenantId)}`);
      if (existingResponse.ok) {
        const existingPayload = (await existingResponse.json()) as { tenant?: TenantForSettlement };
        tenantForLedger = existingPayload.tenant ?? null;
      }

      const backendResponse = await backendFetch(`/api/tenants/${encodeURIComponent(body.tenantId)}`, {
        method: "DELETE",
      });
      const payload = (await backendResponse.json()) as { tenant?: unknown; message?: string };

      if (!backendResponse.ok) {
        return NextResponse.json({ message: payload.message || "Unable to remove tenant." }, { status: backendResponse.status });
      }

      recordRefundLedgerEntry({
        ownerId: session.ownerId ?? undefined,
        tenantId: body.tenantId,
        tenantName: tenantForLedger?.fullName ?? "Tenant",
        hostelId: tenantForLedger?.hostelId,
        refundAmount,
        refundAdvance: body.refundAdvance ?? refundAmount > 0,
        eligible: body.advanceRefundEligible,
        settlementDate: body.settlementDate,
        settlementNote: body.settlementNote,
        isDemo: session.isDemo,
      });

      return NextResponse.json({ tenant: payload.tenant });
    }

    const currentTenant = getTenantRecordById(body.tenantId, session.isDemo);
    const tenant = removeTenantRecord(body.tenantId, session.isDemo);
    recordRefundLedgerEntry({
      ownerId: session.ownerId ?? undefined,
      tenantId: body.tenantId,
      tenantName: currentTenant?.fullName ?? "Tenant",
      hostelId: currentTenant?.assignment?.hostelId ?? currentTenant?.hostelId,
      refundAmount,
      refundAdvance: body.refundAdvance ?? refundAmount > 0,
      eligible: body.advanceRefundEligible,
      settlementDate: body.settlementDate,
      settlementNote: body.settlementNote,
      isDemo: session.isDemo,
    });
    return NextResponse.json({ tenant });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Unable to remove tenant." },
      { status: 400 },
    );
  }
}

function recordRefundLedgerEntry({
  ownerId,
  tenantId,
  tenantName,
  hostelId,
  refundAmount,
  refundAdvance,
  eligible,
  settlementDate,
  settlementNote,
  isDemo,
}: {
  ownerId?: string;
  tenantId: string;
  tenantName: string;
  hostelId?: string;
  refundAmount: number;
  refundAdvance: boolean;
  eligible?: boolean;
  settlementDate?: string;
  settlementNote?: string;
  isDemo: boolean;
}) {
  if (!refundAdvance || refundAmount <= 0) return;

  addFinanceLedgerEntry({
    ownerId,
    hostelId,
    tenantId,
    tenantName,
    type: "advance_refund",
    direction: "debit",
    amount: refundAmount,
    date: settlementDate && /^\d{4}-\d{2}-\d{2}$/.test(settlementDate)
      ? settlementDate
      : new Date().toISOString().slice(0, 10),
    note: [
      eligible === undefined ? "" : `Advance refund eligible: ${eligible ? "Yes" : "No"}.`,
      settlementNote?.trim() ?? "",
    ].filter(Boolean).join(" "),
  }, isDemo);
}
