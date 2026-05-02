import { SkeletonBlock } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3">
      {/* mobile */}
      <div className="grid gap-3 lg:hidden">
        <SkeletonBlock className="h-48 rounded-[18px]" />
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-20 rounded-[12px]" />
          ))}
        </div>
        <SkeletonBlock className="h-64 rounded-[18px]" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-16 rounded-[12px]" />
          ))}
        </div>
      </div>

      {/* desktop */}
      <div className="hidden gap-3 lg:grid">
        <SkeletonBlock className="h-48 rounded-[22px]" />
        <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <SkeletonBlock className="h-64 rounded-[18px]" />
          <SkeletonBlock className="h-64 rounded-[18px]" />
        </div>
      </div>
    </div>
  );
}
