import { RoleAppShell } from "@/components/layout/role-app-shell";

export default function RoleLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <RoleAppShell>{children}</RoleAppShell>;
}
