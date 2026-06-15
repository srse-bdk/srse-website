import { GateShell } from "@/components/layout/gate-shell";

export default function GateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <GateShell>{children}</GateShell>;
}
