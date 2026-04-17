import { cn } from "@/utils/cn";

export function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl bg-[#1e293b]",
        "after:absolute after:inset-y-0 after:w-1/2 after:animate-[shimmer-sweep_2s_ease-in-out_infinite] after:bg-[linear-gradient(90deg,transparent_0%,rgba(148,163,184,0.08)_50%,transparent_100%)]",
        className,
      )}
    />
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return (
    <SkeletonBlock
      className={cn("h-3.5 rounded-full", className)}
    />
  );
}

export function SkeletonTableRow() {
  return (
    <tr className="border-t border-white/[0.06]">
      <td className="px-3 py-3"><SkeletonText className="w-16" /></td>
      <td className="px-3 py-3"><SkeletonText className="w-28" /></td>
      <td className="px-3 py-3">
        <SkeletonText className="w-24" />
        <SkeletonText className="mt-1.5 w-32" />
      </td>
      <td className="px-3 py-3"><SkeletonText className="w-28" /></td>
      <td className="px-3 py-3"><SkeletonText className="w-20" /></td>
      <td className="px-3 py-3"><SkeletonText className="w-20" /></td>
      <td className="px-3 py-3"><SkeletonBlock className="h-7 w-24 rounded-xl" /></td>
    </tr>
  );
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-[8px] border border-white/[0.08] bg-[#1e293b] p-3", className)}>
      <div className="flex items-start gap-2.5">
        <SkeletonBlock className="h-8 w-8 flex-shrink-0 rounded-xl" />
        <div className="flex-1 space-y-1.5 pt-0.5">
          <SkeletonText className="w-16" />
          <SkeletonText className="w-10" />
        </div>
      </div>
    </div>
  );
}
