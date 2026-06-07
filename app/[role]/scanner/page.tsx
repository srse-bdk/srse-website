"use client";

import { ScanLine } from "lucide-react";
import { StaffGateScanner } from "../attendance/_components/staff-gate-scanner";

export default function UnifiedScannerPage() {
  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
          <ScanLine className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
            Unified Gate Scanner
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1 font-medium">
            One scanner for both staff and students.
          </p>
        </div>
      </div>

      <StaffGateScanner />
    </div>
  );
}
