"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  buildEnrollmentRollIndex,
  reserveRollNumberInIndex,
} from "@/lib/utils/student-roll-number";
import {
  buildStudentImportMatchIndexes,
  findExistingStudentIdForImport,
  generateCSVTemplate,
  downloadCSV,
  parseStudentsFile,
  registerStudentInImportIndexes,
  validateStudentData,
} from "@/lib/utils/students-import-export";
import { classService, enrollmentService, studentService } from "@/lib/services";
import type { Class } from "@/lib/types/class.type";
import type { Enrollment } from "@/lib/types/enrollment.type";
import type { StudentInput, StudentUpdateInput, Student } from "@/lib/types/student.type";
import { toast } from "sonner";

interface ImportStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedStudent extends Partial<StudentInput> {
  _rowNumber: number;
  _errors: string[];
  _valid: boolean;
  _importAction?: "create" | "update" | "skip";
}

function normalizeClassName(value?: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^class\s+/i, "")
    .replace(/\s+/g, " ");
}

function normalizeSection(value?: string): string {
  return String(value || "").trim().toUpperCase();
}

function getCurrentAcademicYear(): string {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${String(currentYear + 1).slice(-2)}`;
}

function resolveClassFromStudent(classes: Class[], student: Partial<StudentInput>) {
  const targetClass = normalizeClassName(student.currentClass);
  const targetSection = normalizeSection(student.currentSection);

  if (!targetClass || !targetSection) {
    return null;
  }

  const matchedClass = classes.find((classItem) => {
    const className = normalizeClassName(classItem.name);
    return className === targetClass;
  });

  if (!matchedClass) {
    return null;
  }

  const matchedSection = (matchedClass.sections || []).find(
    (section) => normalizeSection(section) === targetSection,
  );

  if (!matchedSection) {
    return null;
  }

  return {
    classId: matchedClass.id,
    section: matchedSection,
    academicYear: matchedClass.academicYear || getCurrentAcademicYear(),
  };
}

function toStudentUpdateInput(student: ParsedStudent): StudentUpdateInput {
  const updateData: StudentUpdateInput = {};

  if (student.scanId !== undefined) {
    updateData.scanId = student.scanId;
  }
  if (student.admissionNumber !== undefined) {
    updateData.admissionNumber = student.admissionNumber;
  }
  if (student.firstName !== undefined) {
    updateData.firstName = student.firstName;
  }
  if (student.lastName !== undefined) {
    updateData.lastName = student.lastName;
  }
  if (student.email !== undefined) {
    updateData.email = student.email;
  }
  if (student.phone !== undefined) {
    updateData.phone = student.phone;
  }
  if (student.gender !== undefined) {
    updateData.gender = student.gender;
  }
  if (student.dateOfBirth !== undefined) {
    updateData.dateOfBirth = student.dateOfBirth;
  }
  if (student.status !== undefined) {
    updateData.status = student.status;
  }
  if (student.currentClass !== undefined) {
    updateData.currentClass = student.currentClass;
  }
  if (student.currentSection !== undefined) {
    updateData.currentSection = student.currentSection;
  }
  if (student.pen !== undefined) {
    updateData.pen = student.pen;
  }
  if (student.fatherName !== undefined) {
    updateData.fatherName = student.fatherName;
  }
  if (student.motherName !== undefined) {
    updateData.motherName = student.motherName;
  }
  if (student.socialCategory !== undefined) {
    updateData.socialCategory = student.socialCategory;
  }
  if (student.socialCategoryCode !== undefined) {
    updateData.socialCategoryCode = student.socialCategoryCode;
  }
  if (student.address !== undefined) {
    updateData.address = student.address;
  }
  if (student.guardians && student.guardians.length > 0) {
    updateData.guardians = student.guardians;
  }

  return updateData;
}

export function ImportStudentsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportStudentsDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedStudents, setParsedStudents] = useState<ParsedStudent[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const annotateImportActions = async (
    students: ParsedStudent[],
    shouldUpdateExisting: boolean,
  ): Promise<ParsedStudent[]> => {
    const existingStudents = await studentService.getAll();
    const indexes = buildStudentImportMatchIndexes(existingStudents);
    const annotated: ParsedStudent[] = [];

    for (const student of students) {
      if (!student._valid) {
        annotated.push({ ...student, _importAction: undefined });
        continue;
      }

      const existingId = findExistingStudentIdForImport(student, indexes);
      if (existingId) {
        annotated.push({
          ...student,
          _importAction: shouldUpdateExisting ? "update" : "skip",
        });
        continue;
      }

      registerStudentInImportIndexes(`preview-${student._rowNumber}`, student, indexes);
      annotated.push({ ...student, _importAction: "create" });
    }

    return annotated;
  };

  useEffect(() => {
    if (parsedStudents.length === 0) return;

    let cancelled = false;
    annotateImportActions(parsedStudents, updateExisting).then((annotated) => {
      if (!cancelled) {
        setParsedStudents(annotated);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [updateExisting]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    const lowerName = selectedFile.name.toLowerCase();
    const isCSV = lowerName.endsWith(".csv");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

    // Validate file type
    if (!isCSV && !isExcel) {
      toast.error("Please select a CSV or Excel file");
      return;
    }

    setFile(selectedFile);
    setParseErrors([]);
    setParsedStudents([]);

    // Read and parse file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result;
      if (!content) {
        toast.error("Failed to read file");
        return;
      }

      const { students, errors } = parseStudentsFile(selectedFile.name, content);

      const validatedStudents: ParsedStudent[] = students.map(
        (student, index) => {
          const validation = validateStudentData(student);
          return {
            ...student,
            _rowNumber: index + 2,
            _errors: validation.errors,
            _valid: validation.valid,
          };
        },
      );

      const annotatedStudents = await annotateImportActions(
        validatedStudents,
        updateExisting,
      );

      setParsedStudents(annotatedStudents);
      setParseErrors(errors);

      const duplicateCount = annotatedStudents.filter(
        (student) => student._importAction === "skip",
      ).length;
      if (errors.length > 0) {
        toast.warning(`Found ${errors.length} error(s) in file`);
      } else if (duplicateCount > 0 && !updateExisting) {
        toast.info(
          `${duplicateCount} row(s) match existing students and will be skipped. Enable "Update existing students" to refresh them.`,
        );
      }
    };

    reader.onerror = () => {
      toast.error("Failed to read file");
    };

    if (isCSV) {
      reader.readAsText(selectedFile);
    } else {
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    downloadCSV(template, "students_import_template.csv");
    toast.success("Template downloaded");
  };

  const handleImport = async () => {
    if (parsedStudents.length === 0) {
      toast.error("No students to import");
      return;
    }

    // Filter only valid students
    const validStudents = parsedStudents.filter((s) => s._valid);

    if (validStudents.length === 0) {
      toast.error("No valid students to import. Please fix errors first.");
      return;
    }

    setIsImporting(true);
    try {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let enrollmentsCreatedCount = 0;
      let enrollmentBackfillCount = 0;
      let enrollmentErrorCount = 0;

      const existingStudents = await studentService.getAll();
      const validStudentIds = new Set(existingStudents.map((student) => student.id));
      const orphanedEnrollmentsRemoved =
        await enrollmentService.deleteOrphanedEnrollments(validStudentIds);

      const [classes, enrollments] = await Promise.all([
        classService.getAll(),
        enrollmentService.getAll(),
      ]);
      const importIndexes = buildStudentImportMatchIndexes(existingStudents);
      const enrollmentsByStudentId = new Map<string, Enrollment[]>();
      const enrollmentRollIndex = buildEnrollmentRollIndex(
        enrollments,
        validStudentIds,
      );

      for (const enrollment of enrollments) {
        const list = enrollmentsByStudentId.get(enrollment.studentId) || [];
        list.push(enrollment);
        enrollmentsByStudentId.set(enrollment.studentId, list);
      }

      const ensureEnrollmentForStudent = async (
        studentId: string,
        student: Partial<StudentInput>,
      ) => {
        try {
          const resolved = resolveClassFromStudent(classes, student);
          if (!resolved) return false;

          const studentEnrollments = enrollmentsByStudentId.get(studentId) || [];
          const alreadyActive = studentEnrollments.some(
            (enrollment) =>
              enrollment.status === "active" &&
              enrollment.academicYear === resolved.academicYear,
          );
          if (alreadyActive) return false;

          const rollNumber = reserveRollNumberInIndex(
            enrollmentRollIndex,
            resolved.classId,
            resolved.section,
            String(student.rollNumber || "").trim() || undefined,
          );
          student.rollNumber = rollNumber;

          const enrollmentId = await enrollmentService.enroll({
            studentId,
            classId: resolved.classId,
            section: resolved.section,
            rollNumber,
            academicYear: resolved.academicYear,
            notes: "Auto-enrolled during student import/backfill",
          });

          const newEnrollment: Enrollment = {
            id: enrollmentId,
            studentId,
            classId: resolved.classId,
            section: resolved.section,
            rollNumber,
            academicYear: resolved.academicYear,
            enrollmentDate: new Date().toISOString(),
            status: "active",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          enrollmentsByStudentId.set(studentId, [...studentEnrollments, newEnrollment]);
          return true;
        } catch (enrollmentError) {
          console.error(`Enrollment create failed for student ${studentId}:`, enrollmentError);
          enrollmentErrorCount++;
          return false;
        }
      };

      // Backfill missing active enrollments for all existing active students first.
      for (const existingStudent of existingStudents) {
        if (existingStudent.status !== "active") continue;
        const created = await ensureEnrollmentForStudent(existingStudent.id, existingStudent);
        if (created) enrollmentBackfillCount++;
      }

      for (const student of validStudents) {
        try {
          const existingStudentId = findExistingStudentIdForImport(
            student,
            importIndexes,
          );

          if (existingStudentId) {
            if (!updateExisting) {
              skippedCount++;
              continue;
            }

            const updateData = toStudentUpdateInput(student);
            await studentService.update(existingStudentId, updateData);
            updatedCount++;
            const enrolled = await ensureEnrollmentForStudent(
              existingStudentId,
              student,
            );
            if (enrolled) enrollmentsCreatedCount++;
            registerStudentInImportIndexes(existingStudentId, student, importIndexes);
            continue;
          }

          const studentId = await studentService.create(student as StudentInput);
          createdCount++;
          const createdRecord = await studentService.getById(studentId);
          if (createdRecord?.rollNumber) {
            student.rollNumber = createdRecord.rollNumber;
          }
          const enrolled = await ensureEnrollmentForStudent(studentId, student);
          if (enrolled) enrollmentsCreatedCount++;

          const createdStudent = {
            id: studentId,
            status: student.status || "active",
            currentClass: student.currentClass,
            currentSection: student.currentSection,
            rollNumber: student.rollNumber,
            fullName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
            firstName: student.firstName || "",
            lastName: student.lastName || "",
            admissionNumber: student.admissionNumber || "",
            pen: student.pen,
            scanId: student.scanId,
          } as Student;
          existingStudents.push(createdStudent);
          registerStudentInImportIndexes(studentId, createdStudent, importIndexes);
        } catch (error) {
          console.error(
            `Error importing student ${student._rowNumber}:`,
            error
          );
          errorCount++;
        }
      }

      const invalidCount = parsedStudents.filter((student) => !student._valid).length;

      if (createdCount > 0 || updatedCount > 0 || enrollmentBackfillCount > 0) {
        const parts = [
          `${createdCount} created`,
          ...(updateExisting ? [`${updatedCount} updated`] : []),
          ...(skippedCount > 0 ? [`${skippedCount} skipped (already exist)`] : []),
          ...(invalidCount > 0 ? [`${invalidCount} invalid rows ignored`] : []),
          ...(enrollmentsCreatedCount > 0
            ? [`${enrollmentsCreatedCount} enrolled from import`]
            : []),
          ...(enrollmentBackfillCount > 0
            ? [`${enrollmentBackfillCount} enrollments backfilled`]
            : []),
          ...(enrollmentErrorCount > 0
            ? [`${enrollmentErrorCount} enrollment failures`]
            : []),
          ...(orphanedEnrollmentsRemoved > 0
            ? [`${orphanedEnrollmentsRemoved} orphan enrollments removed`]
            : []),
          ...(errorCount > 0 ? [`${errorCount} failed`] : []),
        ];
        toast.success(`Import completed: ${parts.join(", ")}.`);
        onSuccess();
        handleClose();
      } else {
        const invalidCount = parsedStudents.filter((student) => !student._valid).length;
        toast.error(
          invalidCount > 0
            ? `No students imported. ${invalidCount} row(s) invalid — check validation errors below.`
            : skippedCount > 0
              ? `No new students imported. ${skippedCount} existing student(s) skipped. Enable "Update existing students" to update them.`
              : "Failed to import students. Please check the errors.",
        );
      }
    } catch (error) {
      console.error("Error importing students:", error);
      toast.error("Failed to import students. Please try again.");
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setParsedStudents([]);
    setParseErrors([]);
    setUpdateExisting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    onOpenChange(false);
  };

  const validCount = parsedStudents.filter((s) => s._valid).length;
  const invalidCount = parsedStudents.filter((s) => !s._valid).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Students from File
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import students. PEN must be a valid
            10–11 digit student PEN (state codes are not used). Existing students
            are matched by PEN, admission number, or name + class + section.
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
                {file ? "Change File" : "Select CSV / Excel File"}
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
                accept=".csv,.xlsx,.xls"
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
          {parsedStudents.length > 0 && (
            <div className="space-y-3 p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">
                    {validCount} valid student(s)
                  </span>
                </div>
                {invalidCount > 0 && (
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">
                      {invalidCount} invalid student(s)
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                <Checkbox
                  id="update-existing-students"
                  checked={updateExisting}
                  onCheckedChange={(checked) => setUpdateExisting(Boolean(checked))}
                />
                <div className="space-y-1">
                  <label
                    htmlFor="update-existing-students"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Update existing students
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Checked: update existing students and create missing students.
                    Unchecked: skip existing students and only create new students.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedStudents.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-[50px]">Row</TableHead>
                      <TableHead>Scan ID</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[110px]">Import</TableHead>
                      <TableHead className="w-[100px]">Validation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedStudents.map((student) => (
                      <TableRow key={student._rowNumber}>
                        <TableCell className="font-mono text-xs">
                          {student._rowNumber}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {student.scanId || "-"}
                        </TableCell>
                        <TableCell>
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {student.admissionNumber}
                        </TableCell>
                        <TableCell className="text-sm">
                          {student.email || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              student.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {student.status || "active"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student._importAction === "create" ? (
                            <Badge variant="outline" className="text-xs">
                              New
                            </Badge>
                          ) : student._importAction === "update" ? (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            >
                              Update
                            </Badge>
                          ) : student._importAction === "skip" ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-50 text-amber-800 border-amber-200 text-xs"
                            >
                              Skip
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          {student._valid ? (
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
          {parsedStudents.some((s) => !s._valid && s._errors.length > 0) && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Validation Errors:</p>
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {parsedStudents
                  .filter((s) => !s._valid)
                  .map((student) => (
                    <Alert key={student._rowNumber} variant="destructive" className="py-2">
                      <AlertDescription className="text-xs">
                        <span className="font-semibold">
                          Row {student._rowNumber}:
                        </span>{" "}
                        {student._errors.join(", ")}
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
              isImporting || parsedStudents.length === 0 || validCount === 0
            }
          >
            {isImporting ? "Importing..." : `Import ${validCount} Student(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
