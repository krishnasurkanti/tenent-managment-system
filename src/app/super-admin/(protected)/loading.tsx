import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-4">
      {/* stat row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[14px] border border-white/[0.06] bg-[#111115] p-4 space-y-2">
            <SkeletonText className="w-20" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>

      {/* owner list */}
      <div className="overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#111115]">
        <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between">
          <SkeletonText className="w-32" />
          <SkeletonBlock className="h-8 w-24 rounded-xl" />
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-t border-white/[0.06]">
                <td className="px-4 py-3"><SkeletonText className="w-36" /></td>
                <td className="px-4 py-3"><SkeletonText className="w-24" /></td>
                <td className="px-4 py-3"><SkeletonText className="w-16" /></td>
                <td className="px-4 py-3"><SkeletonBlock className="h-6 w-20 rounded-full" /></td>
                <td className="px-4 py-3"><SkeletonBlock className="h-7 w-16 rounded-lg" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
