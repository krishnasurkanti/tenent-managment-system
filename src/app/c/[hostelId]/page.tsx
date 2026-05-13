import { getApiBaseUrl } from "@/lib/api-config";
import { ComplaintForm } from "@/features/complaints/ComplaintForm";

export const dynamic = "force-dynamic";

export default async function PublicComplaintPage({
  params,
}: {
  params: Promise<{ hostelId: string }>;
}) {
  const { hostelId } = await params;

  let hostelName = "Hostel";
  let complaintsEnabled = true;

  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/complaints/public/hostels/${encodeURIComponent(hostelId)}/info`,
      { cache: "no-store", signal: AbortSignal.timeout(5000) },
    );
    if (res.ok) {
      const data = (await res.json()) as { hostelName?: string; complaintsEnabled?: boolean };
      if (data.hostelName) hostelName = data.hostelName;
      if (typeof data.complaintsEnabled === "boolean") complaintsEnabled = data.complaintsEnabled;
    }
  } catch {
    // silently fall back to defaults if backend unreachable
  }

  return (
    <div
      className="min-h-dvh bg-[#09090b] text-white"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-3xl">
            📝
          </div>
          <h1 className="text-xl font-bold text-white">{hostelName}</h1>
          <p className="mt-1 text-sm text-white/45">Complaint Box</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/8 bg-[#111114] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
          <ComplaintForm
            hostelId={hostelId}
            hostelName={hostelName}
            complaintsEnabled={complaintsEnabled}
          />
        </div>

        <p className="mt-5 text-center text-[11px] text-white/20">
          Powered by HostelHub &middot; Anonymous &middot; Secure
        </p>
      </div>
    </div>
  );
}
