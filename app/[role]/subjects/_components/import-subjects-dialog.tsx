"use client";

import {
  AlertCircle,
  CheckCircle,
  Download,
  FileText,
  Upload,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { subjectService } from "@/lib/services";
import type { SubjectInput } from "@/lib/types/subject.type";
import {
  downloadCSV,
  generateCSVTemplate,
  parseCSVToSubjects,
  validateSubjectData,
} from "@/lib/utils/subjects-import-export";

interface ImportSubjectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedSubject extends Partial<SubjectInput> {
  _rowNumber: number;
  _errors: string[];
  _valid: boolean;
}

export function ImportSubjectsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportSubjectsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedSubjects, setParsedSubjects] = useState<ParsedSubject[]>([]);
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
    setParsedSubjects([]);

    // Read and parse file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("Failed to read file");
        return;
      }

      const { subjects, errors } = parseCSVToSubjects(text);

      // Validate each subject
      const validatedSubjects: ParsedSubject[] = subjects.map(
        (subject, index) => {
          const validation = validateSubjectData(subject);
          return {
            ...subject,
            _rowNumber: index + 2, // +2 because row 1 is header
            _errors: validation.errors,
            _valid: validation.valid,
          };
        },
      );

      setParsedSubjects(validatedSubjects);
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
    downloadCSV(template, "subjects_import_template.csv");
    toast.success("Template downloaded");
  };

  const handleImport = async () => {
    if (parsedSubjects.length === 0) {
      toast.error("No subjects to import");
      return;
    }

    // Filter only valid subjects
    const validSubjects = parsedSubjects.filter((s) => s._valid);

    if (validSubjects.length === 0) {
      toast.error("No valid subjects to import. Please fix errors first.");
      return;
    }

    setIsImporting(true);
    try {
      let successCount = 0;
      let errorCount = 0;

      // Import subjects one by one
      for (const subject of validSubjects) {
        try {
          await subjectService.create(subject as SubjectInput);
          successCount++;
        } catch (error) {
          console.error(
            `Error importing subject ${subject._rowNumber}:`,
            error,
          );
          errorCount++;
        }
      }

      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} subject(s)${
            errorCount > 0 ? `. ${errorCount} failed.` : ""
          }`,
        );
        onSuccess();
        handleClose();
      } else {
        toast.error("Failed to import subjects. Please check the errors.");
      }
    } catch (error) {
      console.error("Error importing subjects:", error);
      toast.error("Failed to import subjects. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedSubjects([]);
    setParseErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const validCount = parsedSubjects.filter((s) => s._valid).length;
  const invalidCount = parsedSubjects.filter((s) => !s._valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Subjects from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple subjects at once. Download the
            template to see the required format.
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
                    {parseErrors.slice(0, 5).map((error) => (
                      <li key={error}>{error}</li>
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
          {parsedSubjects.length > 0 && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {validCount} valid subject(s)
                </span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">
                    {invalidCount} invalid subject(s)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedSubjects.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[50px]">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedSubjects.map((subject) => (
                      <TableRow key={subject._rowNumber}>
                        <TableCell className="font-mono text-xs">
                          {subject._rowNumber}
                        </TableCell>
                        <TableCell>{subject.name}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {subject.code || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              subject.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {subject.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {subject._valid ? (
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
          {parsedSubjects.some((s) => !s._valid && s._errors.length > 0) && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Validation Errors:</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {parsedSubjects
                  .filter((s) => !s._valid)
                  .map((subject) => (
                    <Alert
                      key={subject._rowNumber}
                      variant="destructive"
                      className="py-2"
                    >
                      <AlertDescription className="text-xs">
                        <span className="font-semibold">
                          Row {subject._rowNumber}:
                        </span>{" "}
                        {subject._errors.join(", ")}
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
              isImporting || parsedSubjects.length === 0 || validCount === 0
            }
          >
            {isImporting ? "Importing..." : `Import ${validCount} Subject(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
