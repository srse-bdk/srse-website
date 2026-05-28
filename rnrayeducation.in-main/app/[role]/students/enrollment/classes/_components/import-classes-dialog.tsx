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
  parseCSVToClasses,
  validateClassData,
  generateCSVTemplate,
  downloadCSV,
} from "@/lib/utils/classes-import-export";
import { classService } from "@/lib/services";
import type { ClassInput } from "@/lib/types/class.type";
import { toast } from "sonner";

interface ImportClassesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedClass extends Partial<ClassInput> {
  _rowNumber: number;
  _errors: string[];
  _valid: boolean;
}

export function ImportClassesDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportClassesDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedClasses, setParsedClasses] = useState<ParsedClass[]>([]);
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
    setParsedClasses([]);

    // Read and parse file
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        toast.error("Failed to read file");
        return;
      }

      const { classes, errors } = parseCSVToClasses(text);

      // Validate each class
      const validatedClasses: ParsedClass[] = classes.map(
        (classItem, index) => {
          const validation = validateClassData(classItem);
          return {
            ...classItem,
            _rowNumber: index + 2, // +2 because row 1 is header
            _errors: validation.errors,
            _valid: validation.valid,
          };
        }
      );

      setParsedClasses(validatedClasses);
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
    downloadCSV(template, "classes_import_template.csv");
    toast.success("Template downloaded");
  };

  const handleImport = async () => {
    if (parsedClasses.length === 0) {
      toast.error("No classes to import");
      return;
    }

    // Filter only valid classes
    const validClasses = parsedClasses.filter((c) => c._valid);

    if (validClasses.length === 0) {
      toast.error("No valid classes to import. Please fix errors first.");
      return;
    }

    setIsImporting(true);
    try {
      const results = await classService.importClasses(
        validClasses as ClassInput[]
      );

      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (successCount > 0) {
        toast.success(
          `Successfully imported ${successCount} class(es)${errorCount > 0 ? `. ${errorCount} failed.` : ""
          }`
        );
        onSuccess();
        handleClose();
      } else {
        toast.error("Failed to import classes. Please check the errors.");
      }
    } catch (error) {
      console.error("Error importing classes:", error);
      toast.error("Failed to import classes. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedClasses([]);
    setParseErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const validCount = parsedClasses.filter((c) => c._valid).length;
  const invalidCount = parsedClasses.filter((c) => !c._valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Classes from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple classes at once. Download the
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
          {parsedClasses.length > 0 && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">
                  {validCount} valid class(es)
                </span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">
                    {invalidCount} invalid class(es)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedClasses.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[50px]">Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedClasses.map((classItem, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {classItem._rowNumber}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {classItem.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {classItem.sections?.slice(0, 3).map((section) => (
                              <Badge
                                key={section}
                                variant="outline"
                                className="text-xs"
                              >
                                {section}
                              </Badge>
                            ))}
                            {classItem.sections &&
                              classItem.sections.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{classItem.sections.length - 3}
                                </Badge>
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {classItem.capacityPerSection}
                        </TableCell>
                        <TableCell className="text-sm">
                          {classItem.academicYear}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              classItem.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {classItem.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {classItem._valid ? (
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
          {parsedClasses.some((c) => !c._valid && c._errors.length > 0) && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Validation Errors:</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {parsedClasses
                  .filter((c) => !c._valid)
                  .map((classItem, index) => (
                    <Alert key={index} variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">
                        <span className="font-semibold">
                          Row {classItem._rowNumber}:
                        </span>{" "}
                        {classItem._errors.join(", ")}
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
              isImporting || parsedClasses.length === 0 || validCount === 0
            }
          >
            {isImporting ? "Importing..." : `Import ${validCount} Class(es)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
