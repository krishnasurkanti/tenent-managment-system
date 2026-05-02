import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3">
      {/* filter bar */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* room grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-[14px] border border-white/[0.06] bg-[#111115] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <SkeletonText className="w-16" />
              <SkeletonBlock className="h-5 w-14 rounded-full" />
            </div>
            <SkeletonText className="w-20" />
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <SkeletonBlock key={j} className="h-6 w-6 rounded-md" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
