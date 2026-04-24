import { Suspense } from "react";
import AcceptInvitePage from "@/features/auth/accept-invite/AcceptInvitePage";

export default function Page() {
  return (
    <Suspense>
      <AcceptInvitePage />
    </Suspense>
  );
}
