import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-3">
      {/* search bar + add button */}
      <div className="flex items-center gap-2">
        <SkeletonBlock className="h-10 flex-1 rounded-xl" />
        <SkeletonBlock className="h-10 w-28 rounded-xl" />
      </div>

      {/* mobile cards */}
      <div className="grid gap-2 lg:hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-[14px] border border-white/[0.06] bg-[#111115] p-3">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <SkeletonText className="w-36" />
                <SkeletonText className="w-24" />
              </div>
              <SkeletonBlock className="h-7 w-20 rounded-lg" />
            </div>
          </div>
        ))}
      </div>

      {/* desktop table */}
      <div className="hidden overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#111115] lg:block">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <SkeletonText className="w-32" />
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-t border-white/[0.06]">
                <td className="px-4 py-3"><SkeletonText className="w-28" /></td>
                <td className="px-4 py-3"><SkeletonText className="w-16" /></td>
                <td className="px-4 py-3"><SkeletonText className="w-20" /></td>
                <td className="px-4 py-3"><SkeletonText className="w-24" /></td>
                <td className="px-4 py-3"><SkeletonBlock className="h-7 w-20 rounded-lg" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
