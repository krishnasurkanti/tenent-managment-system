export const ownerHeroCardClass =
  "rounded-[28px] border border-[color:var(--border)] bg-[radial-gradient(circle_at_top_right,rgba(249,193,42,0.12),transparent_28%),linear-gradient(180deg,rgba(30,41,59,0.96)_0%,rgba(15,23,42,0.98)_100%)] shadow-[0_24px_60px_rgba(2,6,23,0.24)]";

export const ownerPanelClass =
  "border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(30,41,59,0.94)_0%,rgba(15,23,42,0.98)_100%)] shadow-[0_20px_48px_rgba(2,6,23,0.2)]";

export const ownerSubtlePanelClass =
  "border border-[color:var(--border)] bg-[color:var(--surface-soft)] shadow-[0_12px_28px_rgba(2,6,23,0.16)]";

export const ownerTableHeadClass =
  "bg-[color:color-mix(in_srgb,var(--surface-strong)_88%,#0f172a)] text-[color:color-mix(in_srgb,var(--fg-secondary)_88%,white)]";

export const ownerInputClass =
  "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-primary)] placeholder:text-[color:var(--fg-secondary)]";

export function ownerStatusClass(tone: string) {
  if (tone === "red") {
    return "inline-flex h-fit rounded-full border border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_12px_24px_rgba(220,38,38,0.28)]";
  }

  if (tone === "orange" || tone === "yellow") {
    return "inline-flex h-fit rounded-full border border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] px-2.5 py-1 text-[10px] font-semibold text-[#422006] shadow-[0_12px_24px_rgba(250,204,21,0.28)]";
  }

  return "inline-flex h-fit rounded-full border border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] px-2.5 py-1 text-[10px] font-semibold text-white shadow-[0_12px_24px_rgba(34,197,94,0.26)]";
}

export function ownerMetricToneClass(tone: "default" | "warning" | "danger" | "success" = "default") {
  if (tone === "warning") {
    return "border-[#facc15] bg-[linear-gradient(180deg,#facc15_0%,#eab308_100%)] text-[#422006] shadow-[0_18px_36px_rgba(250,204,21,0.24)]";
  }

  if (tone === "danger") {
    return "border-[#ef4444] bg-[linear-gradient(180deg,#dc2626_0%,#b91c1c_100%)] text-white shadow-[0_18px_36px_rgba(220,38,38,0.28)]";
  }

  if (tone === "success") {
    return "border-[#4ade80] bg-[linear-gradient(180deg,#22c55e_0%,#16a34a_100%)] text-white shadow-[0_18px_36px_rgba(34,197,94,0.22)]";
  }

  return "border-[color:color-mix(in_srgb,var(--brand)_34%,transparent)] bg-[color:var(--brand-soft)] text-[#9edcff]";
}

export function ownerFilterLinkClass(active: boolean) {
  return active
    ? "border border-[color:color-mix(in_srgb,var(--brand)_42%,transparent)] bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] text-white shadow-[0_14px_32px_rgba(37,99,235,0.24)]"
    : "border border-[color:var(--border)] bg-[color:var(--surface-soft)] text-[color:var(--fg-primary)] hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-strong)]";
}
