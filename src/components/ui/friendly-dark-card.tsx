import { cn } from "@/utils/cn";
import { SkeletonBlock } from "@/components/ui/skeleton";

export function FriendlyDarkCard({
  title,
  subtitle,
  buttonLabel,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  buttonLabel: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-[40px] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(249,115,22,0.08),transparent_34%),linear-gradient(180deg,#111322_0%,#090b16_100%)] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.35)]",
        className,
      )}
    >
      <div className="space-y-4">
        <div>
          <p className="text-lg font-semibold text-white">{title}</p>
          {subtitle ? <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{subtitle}</p> : null}
        </div>

        {children ?? (
          <div className="space-y-3">
            <SkeletonBlock className="h-4 rounded-[32px] border-0 bg-white/8 after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.16)_50%,transparent_100%)]" />
            <SkeletonBlock className="h-4 w-[84%] rounded-[32px] border-0 bg-white/8 after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.16)_50%,transparent_100%)]" />
            <SkeletonBlock className="h-28 rounded-[32px] border-0 bg-white/6 after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.14)_50%,transparent_100%)]" />
          </div>
        )}

        <button
          type="button"
          className="inline-flex min-h-14 w-full items-center justify-center rounded-[36px] bg-[linear-gradient(90deg,#f97316_0%,#fb923c_100%)] px-5 text-sm font-semibold text-white shadow-[0_22px_40px_rgba(249,115,22,0.3)] transition hover:brightness-[1.03]"
        >
          {buttonLabel}
        </button>
      </div>
    </section>
  );
}
