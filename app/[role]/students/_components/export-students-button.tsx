"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  exportStudentsToCSV,
  downloadCSV,
} from "@/lib/utils/students-import-export";
import type { Student } from "@/lib/types/student.type";
import { toast } from "sonner";
import { useState } from "react";

interface ExportStudentsButtonProps {
  students: Student[];
  disabled?: boolean;
}

export function ExportStudentsButton({
  students,
  disabled = false,
}: ExportStudentsButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (students.length === 0) {
      toast.error("No students to export");
      return;
    }

    setIsExporting(true);
    try {
      // Generate CSV content
      const csvContent = exportStudentsToCSV(students);

      // Generate filename with current date
      const date = new Date();
      const dateStr = date.toISOString().split("T")[0];
      const filename = `students_export_${dateStr}.csv`;

      // Download the file
      downloadCSV(csvContent, filename);

      toast.success(`Exported ${students.length} student(s) to CSV`);
    } catch (error) {
      console.error("Error exporting students:", error);
      toast.error("Failed to export students. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isExporting || students.length === 0}
      variant="outline"
      size="sm"
      className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
    >
      <Download className={`h-4 w-4 ${isExporting ? "animate-spin" : ""}`} />
      <span className="hidden sm:inline">Export</span>
    </Button>
  );
}
