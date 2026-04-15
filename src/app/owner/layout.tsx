import { OwnerShell } from "@/components/layout/owner/OwnerShell";

export default function OwnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <OwnerShell>{children}</OwnerShell>;
}
