import { redirect } from "next/navigation";
import { getOwnerHostel } from "@/data/ownerHostelStore";

export default function OwnerWelcomePage() {
  const hostel = getOwnerHostel();

  if (hostel) {
    redirect("/owner/dashboard");
  }

  redirect("/owner/create-hostel");
}
