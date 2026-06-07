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
  parseCSVToEnrollments,
  validateEnrollmentData,
  generateCSVTemplate,
  downloadCSV,
} from "@/lib/utils/enrollments-import-export";
import { enrollmentService } from "@/lib/services";
import type { EnrollmentInput } from "@/lib/types/enrollment.type";
import { toast } from "sonner";

interface ImportEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedEnrollment extends Partial<EnrollmentInput> {
  _rowNumber: number;
  _errors: string[];
  _valid: boolean;
}

export function ImportEnrollmentsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportEnrollmentsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedEnrollments, setParsedEnrollments] = useState<
    ParsedEnrollment[]
  >([]);
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
    setParsedEnrollments([]);

    // Read and parse file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("Failed to read file");
        return;
      }

      const { enrollments, errors } = parseCSVToEnrollments(text);

      // Validate each enrollment
      const validatedEnrollments: ParsedEnrollment[] = enrollments.map(
        (enrollment, index) => {
          const validation = validateEnrollmentData(enrollment);
          return {
            ...enrollment,
            _rowNumber: index + 2, // +2 because row 1 is header
            _errors: validation.errors,
            _valid: validation.valid,
          };
        }
      );

      setParsedEnrollments(validatedEnrollments);
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
    downloadCSV(template, "enrollments_import_template.csv");
    toast.success("Template downloaded");
  };

  const handleImport = async () => {
    if (parsedEnrollments.length === 0) {
      toast.error("No enrollments to import");
      return;
    }

    // Filter only valid enrollments
    const validEnrollments = parsedEnrollments.filter((e) => e._valid);

    if (validEnrollments.length === 0) {
      toast.error("No valid enrollments to import. Please fix errors first.");
      return;
    }

    setIsImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Import enrollments one by one
      for (const enrollment of validEnrollments) {
        try {
          await enrollmentService.enroll(enrollment as EnrollmentInput);
          successCount++;
        } catch (error) {
          console.error(
            `Error importing enrollment ${enrollment._rowNumber}:`,
            error
          );
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} enrollment(s)${
            errorCount > 0 ? `. ${errorCount} failed.` : ""
          }`
        );
        onSuccess();
        handleClose();
      } else {
        toast.error("Failed to import enrollments. Please check the errors.");
      }
    } catch (error) {
      console.error("Error importing enrollments:", error);
      toast.error("Failed to import enrollments. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedEnrollments([]);
    setParseErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const validCount = parsedEnrollments.filter((e) => e._valid).length;
  const invalidCount = parsedEnrollments.filter((e) => !e._valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Enrollments from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple enrollments at once. Download
            the template to see the required format.
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
          {parsedEnrollments.length > 0 && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {validCount} valid enrollment(s)
                </span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">
                    {invalidCount} invalid enrollment(s)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedEnrollments.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[50px]">Row</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Class ID</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedEnrollments.map((enrollment, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {enrollment._rowNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {enrollment.studentId}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {enrollment.classId}
                        </TableCell>
                        <TableCell className="text-sm">
                          {enrollment.section}
                        </TableCell>
                        <TableCell className="text-sm">
                          {enrollment.rollNumber}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              enrollment.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {enrollment.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {enrollment._valid ? (
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
          {parsedEnrollments.some((e) => !e._valid && e._errors.length > 0) && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Validation Errors:</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {parsedEnrollments
                  .filter((e) => !e._valid)
                  .map((enrollment, index) => (
                    <Alert key={index} variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">
                        <span className="font-semibold">
                          Row {enrollment._rowNumber}:
                        </span>{" "}
                        {enrollment._errors.join(", ")}
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
              isImporting || parsedEnrollments.length === 0 || validCount === 0
            }
          >
            {isImporting
              ? "Importing..."
              : `Import ${validCount} Enrollment(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
