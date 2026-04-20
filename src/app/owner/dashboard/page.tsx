import dynamic from "next/dynamic";

const OwnerDashboardPage = dynamic(
  () => import("@/features/owner/dashboard/OwnerDashboardPage"),
  { ssr: false },
);

export default OwnerDashboardPage;
