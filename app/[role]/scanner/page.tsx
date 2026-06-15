"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyScannerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/gate");
  }, [router]);

  return null;
}
