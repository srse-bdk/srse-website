"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  exportAttendanceToCSV,
  downloadCSV,
} from "@/lib/utils/attendance-import-export";
import type { StudentAttendance } from "@/lib/types/student-attendance.type";
import { toast } from "sonner";
import { useState } from "react";

interface ExportAttendanceButtonProps {
  attendance: StudentAttendance[];
  disabled?: boolean;
}

export function ExportAttendanceButton({
  attendance,
  disabled = false,
}: ExportAttendanceButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (attendance.length === 0) {
      toast.error("No attendance records to export");
      return;
    }

    setIsExporting(true);
    try {
      // Generate CSV content
      const csvContent = exportAttendanceToCSV(attendance);

      // Generate filename with current date
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const filename = `attendance_export_${dateStr}.csv`;

      // Download the file
      downloadCSV(csvContent, filename);

      toast.success(
        `Exported ${attendance.length} attendance record(s) to CSV`
      );
    } catch (error) {
      console.error("Error exporting attendance:", error);
      toast.error("Failed to export attendance. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || attendance.length === 0}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
    >
      <Download className={`h-4 w-4 ${isExporting ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Export</span>
    </Button>
  );
}
