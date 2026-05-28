"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  exportEnrollmentsToCSV,
  downloadCSV,
} from "@/lib/utils/enrollments-import-export";
import type { Enrollment } from "@/lib/types/enrollment.type";
import { toast } from "sonner";
import { useState } from "react";

interface ExportEnrollmentsButtonProps {
  enrollments: Enrollment[];
  disabled?: boolean;
}

export function ExportEnrollmentsButton({
  enrollments,
  disabled = false,
}: ExportEnrollmentsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (enrollments.length === 0) {
      toast.error("No enrollments to export");
      return;
    }

    setIsExporting(true);
    try {
      // Generate CSV content
      const csvContent = exportEnrollmentsToCSV(enrollments);

      // Generate filename with current date
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const filename = `enrollments_export_${dateStr}.csv`;

      // Download the file
      downloadCSV(csvContent, filename);

      toast.success(`Exported ${enrollments.length} enrollment(s) to CSV`);
    } catch (error) {
      console.error("Error exporting enrollments:", error);
      toast.error("Failed to export enrollments. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || enrollments.length === 0}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
    >
      <Download className={`h-4 w-4 ${isExporting ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Export</span>
    </Button>
  );
}
