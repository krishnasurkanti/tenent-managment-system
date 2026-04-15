import { OwnerShell } from "@/components/layout/owner/OwnerShell";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OwnerShell>{children}</OwnerShell>;
}
