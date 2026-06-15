"use client";

import { GateScanner } from "@/app/[role]/attendance/_components/staff-gate-scanner";

export default function GateExitPage() {
  return (
    <div className="p-4 sm:p-6">
      <GateScanner mode="exit" />
    </div>
  );
}
