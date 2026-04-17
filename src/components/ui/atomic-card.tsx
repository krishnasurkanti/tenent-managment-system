import { AtomicButton } from "@/components/ui/atomic-button";

export function AtomicCard() {
  return (
    <article className="w-full max-w-sm overflow-hidden rounded-[6px] border border-[color:var(--border)] bg-[color:var(--bg-surface)] shadow-[0_24px_60px_rgba(0,0,0,0.32)]">
      <div className="h-32 bg-[linear-gradient(135deg,var(--brand)_0%,#8b5cf6_100%)]" />
      <div className="space-y-4 p-4">
        <div>
          <h3 className="text-token-2xl text-[color:var(--fg-primary)]">Card Title</h3>
          <p className="mt-2 text-sm leading-6 text-[color:var(--fg-secondary)]">
            A short description with just enough detail to preview the content inside.
          </p>
        </div>
        <AtomicButton size="small">Action</AtomicButton>
      </div>
    </article>
  );
}
