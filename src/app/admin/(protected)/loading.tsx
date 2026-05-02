import { SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-4">
      {/* stat row */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-[14px] border border-white/[0.06] bg-[#111115] p-4 space-y-2">
            <SkeletonText className="w-20" />
            <SkeletonBlock className="h-8 w-24 rounded-lg" />
          </div>
        ))}
      </div>

      {/* table */}
      <div className="overflow-hidden rounded-[18px] border border-white/[0.06] bg-[#111115]">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <SkeletonText className="w-40" />
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-t border-white/[0.06]">
                <td className="px-4 py-3"><SkeletonText className="w-32" /></td>
                <td className="px-4 py-3"><SkeletonText className="w-20" /></td>
                <td className="px-4 py-3"><SkeletonText className="w-16" /></td>
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
