import dynamic from "next/dynamic";

const OwnerTenantsPage = dynamic(
  () => import("@/features/tenants/pages/OwnerTenantsPage"),
  { ssr: false },
);

export default OwnerTenantsPage;
