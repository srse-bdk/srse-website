import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Edit Staff",
  description: "Update staff profile details.",
};

export default function EditStaffLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
