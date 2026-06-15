"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyExitScannerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/gate/exit");
  }, [router]);

  return null;
}
