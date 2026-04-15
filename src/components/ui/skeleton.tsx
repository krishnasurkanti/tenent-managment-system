import { cn } from "@/utils/cn";

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/80 bg-slate-100/90",
        "after:absolute after:inset-y-0 after:w-1/2 after:bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.75)_50%,transparent_100%)] after:animate-[shimmer-sweep_1.8s_ease-in-out_infinite]",
        className,
      )}
    />
  );
}
