"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  parseCSVToAttendance,
  validateAttendanceData,
  generateCSVTemplate,
  downloadCSV,
} from "@/lib/utils/attendance-import-export";
import { studentAttendanceService } from "@/lib/services";
import type { StudentAttendanceInput } from "@/lib/types/student-attendance.type";
import { toast } from "sonner";
import { useAppStore } from "@/hooks/use-app-store";

interface ImportAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedAttendance extends Partial<StudentAttendanceInput> {
  _rowNumber: number;
  _errors: string[];
  _valid: boolean;
}

export function ImportAttendanceDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportAttendanceDialogProps) {
  const user = useAppStore((state) => state.user);
  const [file, setFile] = useState<File | null>(null);
  const [parsedAttendance, setParsedAttendance] = useState<ParsedAttendance[]>(
    []
  );
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setParseErrors([]);
    setParsedAttendance([]);

    // Read and parse file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("Failed to read file");
        return;
      }

      const { attendance, errors } = parseCSVToAttendance(text);

      // Validate each attendance record
      const validatedAttendance: ParsedAttendance[] = attendance.map(
        (record, index) => {
          const validation = validateAttendanceData(record);
          return {
            ...record,
            _rowNumber: index + 2, // +2 because row 1 is header
            _errors: validation.errors,
            _valid: validation.valid,
          };
        }
      );

      setParsedAttendance(validatedAttendance);
      setParseErrors(errors);

      if (errors.length > 0) {
        toast.warning(`Found ${errors.length} error(s) in CSV file`);
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    reader.readAsText(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadCSV(template, "attendance_import_template.csv");
    toast.success("Template downloaded");
  };

  const handleImport = async () => {
    if (parsedAttendance.length === 0) {
      toast.error("No attendance records to import");
      return;
    }

    // Filter only valid attendance records
    const validAttendance = parsedAttendance.filter((a) => a._valid);

    if (validAttendance.length === 0) {
      toast.error(
        "No valid attendance records to import. Please fix errors first."
      );
      return;
    }

    if (!user) {
      toast.error("User not authenticated");
      return;
    }

    const markedBy = user.id || user.uid || "";
    if (!markedBy) {
      toast.error("User ID not found");
      return;
    }

    setIsImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Import attendance records one by one
      for (const record of validAttendance) {
        try {
          await studentAttendanceService.markAttendance(
            record as StudentAttendanceInput,
            markedBy
          );
          successCount++;
        } catch (error) {
          console.error(
            `Error importing attendance ${record._rowNumber}:`,
            error
          );
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} attendance record(s)${
            errorCount > 0 ? `. ${errorCount} failed.` : ""
          }`
        );
        onSuccess();
        handleClose();
      } else {
        toast.error(
          "Failed to import attendance records. Please check the errors."
        );
      }
    } catch (error) {
      console.error("Error importing attendance:", error);
      toast.error("Failed to import attendance records. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedAttendance([]);
    setParseErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const validCount = parsedAttendance.filter((a) => a._valid).length;
  const invalidCount = parsedAttendance.filter((a) => !a._valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Attendance from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple attendance records at once.
            Download the template to see the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {file ? "Change File" : "Select CSV File"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-xs">
                  ({(file.size / 1024).toFixed(2)} KB)
                </span>
              </div>
            )}
          </div>

          {/* Errors Alert */}
          {parseErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">
                    Found {parseErrors.length} error(s):
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {parseErrors.slice(0, 5).map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                    {parseErrors.length > 5 && (
                      <li>... and {parseErrors.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Summary */}
          {parsedAttendance.length > 0 && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {validCount} valid record(s)
                </span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">
                    {invalidCount} invalid record(s)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedAttendance.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[50px]">Row</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Class ID</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedAttendance.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {record._rowNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {record.studentId}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {record.classId}
                        </TableCell>
                        <TableCell className="text-sm">
                          {record.section}
                        </TableCell>
                        <TableCell className="text-sm">{record.date}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "present"
                                ? "default"
                                : record.status === "late"
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-xs"
                          >
                            {record.status || "present"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record._valid ? (
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200"
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="bg-red-50 text-red-700 border-red-200"
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Error Details */}
          {parsedAttendance.some((a) => !a._valid && a._errors.length > 0) && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Validation Errors:</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {parsedAttendance
                  .filter((a) => !a._valid)
                  .map((record, index) => (
                    <Alert key={index} variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">
                        <span className="font-semibold">
                          Row {record._rowNumber}:
                        </span>{" "}
                        {record._errors.join(", ")}
                      </AlertDescription>
                    </Alert>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isImporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={
              isImporting || parsedAttendance.length === 0 || validCount === 0
            }
          >
            {isImporting ? "Importing..." : `Import ${validCount} Record(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
