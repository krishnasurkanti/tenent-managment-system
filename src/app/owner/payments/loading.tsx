import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3">
      {/* stat cards */}
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[14px] border border-white/[0.06] bg-[#111115] p-3">
            <SkeletonText className="w-16" />
            <SkeletonBlock className="mt-2 h-7 w-24 rounded-lg" />
          </div>
        ))}
      </div>

      {/* search */}
      <SkeletonBlock className="h-10 w-full rounded-xl" />

      {/* payment rows */}
      <div className="space-y-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-[14px] border border-white/[0.06] bg-[#111115] p-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonText className="w-32" />
                <SkeletonText className="w-20" />
              </div>
              <div className="space-y-1.5 text-right">
                <SkeletonText className="w-16" />
                <SkeletonBlock className="h-6 w-14 rounded-lg" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
