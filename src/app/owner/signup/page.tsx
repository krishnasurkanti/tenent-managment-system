import { Suspense } from "react";
import OwnerSignupPage from "@/features/auth/owner-signup/OwnerSignupPage";

export default function Page() {
  return (
    <Suspense>
      <OwnerSignupPage />
    </Suspense>
  );
}
