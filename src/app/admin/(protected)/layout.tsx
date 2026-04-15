import { AdminShell } from "@/components/admin-shell";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
