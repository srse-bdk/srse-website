"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  exportClassesToCSV,
  downloadCSV,
} from "@/lib/utils/classes-import-export";
import type { Class } from "@/lib/types/class.type";
import { toast } from "sonner";
import { useState } from "react";

interface ExportClassesButtonProps {
  classes: Class[];
  disabled?: boolean;
}

export function ExportClassesButton({
  classes,
  disabled = false,
}: ExportClassesButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (classes.length === 0) {
      toast.error("No classes to export");
      return;
    }

    setIsExporting(true);
    try {
      // Generate CSV content
      const csvContent = exportClassesToCSV(classes);

      // Generate filename with current date
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const filename = `classes_export_${dateStr}.csv`;

      // Download the file
      downloadCSV(csvContent, filename);

      toast.success(`Exported ${classes.length} class(es) to CSV`);
    } catch (error) {
      console.error("Error exporting classes:", error);
      toast.error("Failed to export classes. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || classes.length === 0}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
    >
      <Download className={`h-4 w-4 ${isExporting ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Export</span>
    </Button>
  );
}
