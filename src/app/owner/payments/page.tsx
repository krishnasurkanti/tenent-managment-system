import dynamic from "next/dynamic";

const OwnerPaymentsPage = dynamic(
  () => import("@/features/owner/payments/OwnerPaymentsPage"),
  { ssr: false },
);

export default OwnerPaymentsPage;
