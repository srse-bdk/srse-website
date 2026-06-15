"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyEntryScannerRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/gate/entry");
  }, [router]);

  return null;
}
