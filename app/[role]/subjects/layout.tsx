import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subjects",
  description: "Manage subjects and their assignments to classes and staff.",
};

export default function SubjectsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}

