import { redirect } from "next/navigation";
import { getOwnerHostel } from "@/data/ownerHostelStore";

export default function OwnerEditHostelPage() {
  const hostel = getOwnerHostel();

  if (!hostel) {
    redirect("/owner/create-hostel");
  }

  redirect("/owner/create-hostel?mode=edit");
}
