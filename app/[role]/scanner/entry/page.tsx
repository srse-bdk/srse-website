"use client";

import { GateScanner } from "../../attendance/_components/staff-gate-scanner";

export default function EntryScannerPage() {
  return (
    <div className="p-4 sm:p-6">
      <GateScanner mode="entry" />
    </div>
  );
}
