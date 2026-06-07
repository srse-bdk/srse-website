"use client";

import { useParams } from "next/navigation";
import { ParentPasswordChangeForm } from "./_components/parent-password-change-form";

export default function ChangeParentPasswordPage() {
  const params = useParams();
  const id = params.id as string;

  return <ParentPasswordChangeForm parentId={id} />;
}
