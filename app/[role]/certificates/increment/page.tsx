"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyIncrementRedirect() {
  const params = useParams();
  const router = useRouter();
  const role = params.role as string;

  useEffect(() => {
    router.replace(`/${role}/certificates/annual-increment`);
  }, [role, router]);

  return null;
}
