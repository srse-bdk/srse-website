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
import { staffService, studentService } from "@/lib/services";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import {
  buildStaffIdCardUpdate,
  buildStudentIdCardUpdate,
  downloadStaffIdCardTemplate,
  downloadStudentIdCardTemplate,
  findStaffForIdCardRow,
  findStudentForIdCardRow,
  parseStaffIdCardFile,
  parseStudentIdCardFile,
  type StaffIdCardRow,
  type StudentIdCardRow,
} from "@/lib/utils/id-card-import";
import { compareStudentsByClassSectionRoll } from "@/lib/utils/student-roll-number";

type IdCardImportKind = "student" | "staff";

interface ImportIdCardDialogProps {
  kind: IdCardImportKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type ParsedRow = (StudentIdCardRow | StaffIdCardRow) & {
  _matchLabel: string;
  _status: "ready" | "not_found";
  _matchedStudent?: Student;
};

function toStudentParsedRow(row: StudentIdCardRow, match?: Student): ParsedRow {
  const status: "ready" | "not_found" = match ? "ready" : "not_found";
  return {
    ...row,
    _matchLabel: match?.fullName || "Not found",
    _status: status,
    _matchedStudent: match,
  };
}

function toStaffParsedRow(row: StaffIdCardRow, match?: User): ParsedRow {
  const status: "ready" | "not_found" = match ? "ready" : "not_found";
  return {
    ...row,
    _matchLabel: match?.name || "Not found",
    _status: status,
  };
}

export function ImportIdCardDialog({
  kind,
  open,
  onOpenChange,
  onSuccess,
}: ImportIdCardDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const title =
    kind === "student" ? "Import Student ID Card Data" : "Import Staff ID Card Data";

  const handleDownloadTemplate = () => {
    if (kind === "student") {
      downloadStudentIdCardTemplate();
    } else {
      downloadStaffIdCardTemplate();
    }
    toast.success("Template downloaded");
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().match(/\.(csv|xlsx|xls)$/)) {
      toast.error("Please select an Excel or CSV file");
      return;
    }

    setFile(selectedFile);
    setParseErrors([]);
    setParsedRows([]);

    const lowerName = selectedFile.name.toLowerCase();
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;
      if (!content) {
        toast.error("Failed to read file");
        return;
      }

      try {
        let fileErrors: string[] = [];

        if (kind === "student") {
          const { rows, errors } = parseStudentIdCardFile(
            selectedFile.name,
            isExcel ? (content as ArrayBuffer) : (content as string),
          );
          fileErrors = errors;
          const students = await studentService.getAll();
          const preview = rows
            .map((row) => toStudentParsedRow(row, findStudentForIdCardRow(students, row)))
            .sort((left, right) => {
              if (left._matchedStudent && right._matchedStudent) {
                return compareStudentsByClassSectionRoll(
                  left._matchedStudent,
                  right._matchedStudent,
                );
              }
              if (left._matchedStudent) return -1;
              if (right._matchedStudent) return 1;
              return left.rowNumber - right.rowNumber;
            });
          setParsedRows(preview);
          setParseErrors(errors);
        } else {
          const { rows, errors } = parseStaffIdCardFile(
            selectedFile.name,
            isExcel ? (content as ArrayBuffer) : (content as string),
          );
          fileErrors = errors;
          const staffs = await staffService.getAll();
          const preview: ParsedRow[] = rows.map((row) =>
            toStaffParsedRow(row, findStaffForIdCardRow(staffs, row)),
          );
          setParsedRows(preview);
          setParseErrors(errors);
        }

        if (fileErrors.length > 0) {
          toast.error(`File has ${fileErrors.length} validation error(s). Fix them before importing.`);
        }
      } catch (error) {
        console.error("Error parsing ID card file:", error);
        toast.error("Failed to parse file");
      }
    };

    if (isExcel) {
      reader.readAsArrayBuffer(selectedFile);
    } else {
      reader.readAsText(selectedFile);
    }
  };

  const handleImport = async () => {
    const readyRows = parsedRows.filter((row) => row._status === "ready");
    if (readyRows.length === 0) {
      toast.error("No matching records to update. Check Bar Code ID or names.");
      return;
    }

    setIsImporting(true);
    let updatedCount = 0;
    let notFoundCount = 0;
    let errorCount = 0;

    try {
      if (kind === "student") {
        const students = await studentService.getAll();
        for (const row of parsedRows) {
          const studentRow = row as StudentIdCardRow & ParsedRow;
          const student = findStudentForIdCardRow(students, studentRow);
          if (!student) {
            notFoundCount++;
            continue;
          }

          try {
            const update = await buildStudentIdCardUpdate(student, studentRow);
            if (Object.keys(update).length === 0) {
              continue;
            }
            await studentService.update(student.id, update);
            updatedCount++;
          } catch (error) {
            console.error(`Student row ${studentRow.rowNumber} failed:`, error);
            errorCount++;
          }
        }
      } else {
        const staffs = await staffService.getAll();
        for (const row of parsedRows) {
          const staffRow = row as StaffIdCardRow & ParsedRow;
          const staff = findStaffForIdCardRow(staffs, staffRow);
          if (!staff) {
            notFoundCount++;
            continue;
          }

          try {
            const update = await buildStaffIdCardUpdate(staff, staffRow);
            if (Object.keys(update).length === 0) {
              continue;
            }
            await staffService.update(staff.id, update);
            updatedCount++;
          } catch (error) {
            console.error(`Staff row ${staffRow.rowNumber} failed:`, error);
            errorCount++;
          }
        }
      }

      if (updatedCount > 0) {
        const parts = [
          `${updatedCount} updated`,
          ...(notFoundCount > 0 ? [`${notFoundCount} not found`] : []),
          ...(errorCount > 0 ? [`${errorCount} failed`] : []),
        ];
        toast.success(`Import completed: ${parts.join(", ")}.`);
        onSuccess?.();
        handleClose();
      } else {
        toast.error("No records were updated. Please review the file and try again.");
      }
    } catch (error) {
      console.error("ID card import failed:", error);
      toast.error("Failed to import ID card data");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedRows([]);
    setParseErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const readyCount = parsedRows.filter((row) => row._status === "ready").length;
  const notFoundCount = parsedRows.filter((row) => row._status === "not_found").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Use the same columns as export: Student Name, Class-Section, Contact
            Num, Alt. Contact Num, DoB, Blood Group, Bar Code ID. Minor header
            spelling differences and class/date formats are accepted. Invalid
            values are rejected before import.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="mr-2 h-4 w-4" />
              {file ? "Change File" : "Select Excel / CSV File"}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {file ? (
            <p className="text-sm text-muted-foreground">{file.name}</p>
          ) : null}

          {parseErrors.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {parseErrors.slice(0, 5).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                  {parseErrors.length > 5 ? (
                    <li>... and {parseErrors.length - 5} more</li>
                  ) : null}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {parsedRows.length > 0 ? (
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle className="h-4 w-4" />
                {readyCount} ready
              </span>
              {notFoundCount > 0 ? (
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  {notFoundCount} not found
                </span>
              ) : null}
            </div>
          ) : null}

          {parsedRows.length > 0 ? (
            <div className="border rounded-lg overflow-hidden max-h-[320px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Row</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Bar Code ID</TableHead>
                    <TableHead>Match</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>
                        {"studentName" in row ? row.studentName : row.staffName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.scanId || "-"}
                      </TableCell>
                      <TableCell>
                        {row._status === "ready" ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            {row._matchLabel}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800">
                            <XCircle className="mr-1 h-3 w-3" />
                            Not found
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting || readyCount === 0 || parseErrors.length > 0}
          >
            {isImporting ? "Importing..." : `Update ${readyCount} Record(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
