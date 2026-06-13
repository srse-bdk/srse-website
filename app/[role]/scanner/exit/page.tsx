"use client";

import { GateScanner } from "../../attendance/_components/staff-gate-scanner";

export default function ExitScannerPage() {
  return (
    <div className="p-4 sm:p-6">
      <GateScanner mode="exit" />
    </div>
  );
}
