"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  exportSubjectsToCSV,
  downloadCSV,
} from "@/lib/utils/subjects-import-export";
import type { Subject } from "@/lib/types/subject.type";
import { toast } from "sonner";
import { useState } from "react";

interface ExportSubjectsButtonProps {
  subjects: Subject[];
  disabled?: boolean;
}

export function ExportSubjectsButton({
  subjects,
  disabled = false,
}: ExportSubjectsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (subjects.length === 0) {
      toast.error("No subjects to export");
      return;
    }

    setIsExporting(true);
    try {
      // Generate CSV content
      const csvContent = exportSubjectsToCSV(subjects);

      // Generate filename with current date
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const filename = `subjects_export_${dateStr}.csv`;

      // Download the file
      downloadCSV(csvContent, filename);

      toast.success(`Exported ${subjects.length} subject(s) to CSV`);
    } catch (error) {
      console.error("Error exporting subjects:", error);
      toast.error("Failed to export subjects. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || subjects.length === 0}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
    >
      <Download className={`h-4 w-4 ${isExporting ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Export</span>
    </Button>
  );
}
