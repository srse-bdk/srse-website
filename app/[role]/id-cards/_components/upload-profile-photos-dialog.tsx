"use client";

import {
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  ImageIcon,
  Loader2,
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
import { PROFILE_PHOTO_MAX_BYTES } from "@/lib/config/profile-photo";
import { profilePhotoService, staffService, studentService } from "@/lib/services";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import { formatFileSize } from "@/lib/utils/image-optimization";
import {
  buildStaffSerialMap,
  buildStudentSerialMap,
  findStaffForIdCardRow,
  findStudentForIdCardRow,
  parseStaffIdCardFile,
  parseStudentIdCardFile,
  type StaffIdCardRow,
  type StudentIdCardRow,
} from "@/lib/utils/id-card-import";
import {
  parseSerialFromPhotoFilename,
  prepareProfilePhotoFile,
} from "@/lib/utils/profile-photo";
import { useUploadThing } from "@/lib/utils/uploadthing";

type ProfilePhotoKind = "student" | "staff";

interface UploadProfilePhotosDialogProps {
  kind: ProfilePhotoKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type PhotoRowStatus = "ready" | "not_found" | "no_excel_row" | "too_large" | "invalid";

interface PhotoPreviewRow {
  file: File;
  serialNumber: number | null;
  personName: string;
  personId?: string;
  status: PhotoRowStatus;
  error?: string;
}

async function readFileContent(file: File): Promise<string | ArrayBuffer> {
  const lowerName = file.name.toLowerCase();
  const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) resolve(reader.result as string | ArrayBuffer);
      else reject(new Error("Failed to read file"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  });
}

export function UploadProfilePhotosDialog({
  kind,
  open,
  onOpenChange,
  onSuccess,
}: UploadProfilePhotosDialogProps) {
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [excelParseErrors, setExcelParseErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<PhotoPreviewRow[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const excelInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const title =
    kind === "student"
      ? "Upload Student Profile Photos"
      : "Upload Staff Profile Photos";

  const { startUpload } = useUploadThing("imageUploader");

  const buildPreviewRows = async (excel: File, files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const content = await readFileContent(excel);

    const { rows: excelRows, errors } =
      kind === "student"
        ? parseStudentIdCardFile(excel.name, content)
        : parseStaffIdCardFile(excel.name, content);

    setExcelParseErrors(errors);

    if (errors.length > 0) {
      setRows([]);
      return;
    }

    const serialMap =
      kind === "student"
        ? buildStudentSerialMap(excelRows as StudentIdCardRow[])
        : buildStaffSerialMap(excelRows as StaffIdCardRow[]);

    const [students, staffMembers] = await Promise.all([
      kind === "student" ? studentService.getAll() : Promise.resolve([]),
      kind === "staff" ? staffService.getAll() : Promise.resolve([]),
    ]);

    const previewRows: PhotoPreviewRow[] = fileArray.map((file) => {
      const serialNumber = parseSerialFromPhotoFilename(file.name);
      if (serialNumber === null) {
        return {
          file,
          serialNumber: null,
          personName: "-",
          status: "invalid",
          error: "Filename must be a number (e.g. 1.jpg)",
        };
      }

      if (file.size > 10 * 1024 * 1024) {
        return {
          file,
          serialNumber,
          personName: "-",
          status: "too_large",
          error: "Source file exceeds 10 MB",
        };
      }

      const excelRow = serialMap.get(serialNumber);
      if (!excelRow) {
        return {
          file,
          serialNumber,
          personName: "-",
          status: "no_excel_row",
          error: `No Sl. No. ${serialNumber} in Excel`,
        };
      }

      if (kind === "student") {
        const student = findStudentForIdCardRow(
          students,
          excelRow as StudentIdCardRow,
        );
        if (!student) {
          return {
            file,
            serialNumber,
            personName: (excelRow as StudentIdCardRow).studentName,
            status: "not_found",
          };
        }
        return {
          file,
          serialNumber,
          personName: student.fullName || (excelRow as StudentIdCardRow).studentName,
          personId: student.id,
          status: "ready",
        };
      }

      const staff = findStaffForIdCardRow(staffMembers, excelRow as StaffIdCardRow);
      if (!staff) {
        return {
          file,
          serialNumber,
          personName: (excelRow as StaffIdCardRow).staffName,
          status: "not_found",
        };
      }
      return {
        file,
        serialNumber,
        personName: staff.name || (excelRow as StaffIdCardRow).staffName,
        personId: staff.uid,
        status: "ready",
      };
    });

    setRows(previewRows);
  };

  const handleExcelSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.name.toLowerCase().match(/\.(csv|xlsx|xls)$/)) {
      toast.error("Please select an Excel or CSV file");
      return;
    }

    setExcelFile(selected);
    setRows([]);
    setExcelParseErrors([]);
    toast.success("Excel loaded. Now select photos named 1.jpg, 2.jpg, …");
  };

  const handlePhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (!excelFile) {
      toast.error("Select the ID card Excel file first");
      return;
    }

    const invalidType = Array.from(selectedFiles).some(
      (file) => !file.type.startsWith("image/"),
    );
    if (invalidType) {
      toast.error("Please select image files only");
      return;
    }

    await buildPreviewRows(excelFile, selectedFiles);
  };

  const handleUpload = async () => {
    const readyRows = rows.filter(
      (row) => row.status === "ready" && row.personId,
    );
    if (readyRows.length === 0) {
      toast.error("No matching photos to upload");
      return;
    }

    setIsUploading(true);
    setUploadProgress({ done: 0, total: readyRows.length });

    let successCount = 0;
    let errorCount = 0;

    for (const row of readyRows) {
      try {
        const optimized = await prepareProfilePhotoFile(row.file);
        if (optimized.size > PROFILE_PHOTO_MAX_BYTES) {
          throw new Error(
            `Compressed size ${formatFileSize(optimized.size)} exceeds 150 KB`,
          );
        }

        const uploadName = `photo-${row.serialNumber}-${Date.now()}.webp`;
        const uploadFile = new File([optimized], uploadName, {
          type: "image/webp",
        });

        const result = await startUpload([uploadFile]);
        const uploaded = result?.[0];
        if (!uploaded?.url || !uploaded?.key) {
          throw new Error("Upload failed");
        }

        if (kind === "student") {
          await profilePhotoService.updateStudentProfilePhoto(
            row.personId!,
            uploaded.url,
            uploaded.key,
          );
        } else {
          await profilePhotoService.updateStaffProfilePhoto(
            row.personId!,
            uploaded.url,
            uploaded.key,
          );
        }

        successCount += 1;
      } catch (error) {
        console.error(`Photo upload failed for serial ${row.serialNumber}:`, error);
        errorCount += 1;
      } finally {
        setUploadProgress((prev) => ({
          ...prev,
          done: prev.done + 1,
        }));
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      const parts = [`${successCount} uploaded`];
      if (errorCount > 0) parts.push(`${errorCount} failed`);
      toast.success(`Profile photos: ${parts.join(", ")}`);
      onSuccess?.();
      handleClose();
    } else {
      toast.error("No photos were uploaded. Check Excel and file names.");
    }
  };

  const handleClose = () => {
    setExcelFile(null);
    setExcelParseErrors([]);
    setRows([]);
    setUploadProgress({ done: 0, total: 0 });
    if (excelInputRef.current) excelInputRef.current.value = "";
    if (photoInputRef.current) photoInputRef.current.value = "";
    onOpenChange(false);
  };

  const readyCount = rows.filter((row) => row.status === "ready").length;
  const notFoundCount = rows.filter((row) => row.status === "not_found").length;
  const invalidCount = rows.filter(
    (row) =>
      row.status === "invalid" ||
      row.status === "too_large" ||
      row.status === "no_excel_row",
  ).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Export the ID card Excel (with <strong>Sl. No.</strong>), name photos
            by serial number — <span className="font-mono">1.jpg</span>,{" "}
            <span className="font-mono">2.png</span>, etc. Upload the same Excel
            plus photos here. Photos are compressed to 150 KB max for ID cards
            {kind === "student"
              ? " and linked parent login"
              : " and staff login"}
            . Scan IDs are not used in this workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => excelInputRef.current?.click()}
              disabled={isUploading}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {excelFile ? "Change Excel" : "1. Select Excel"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploading || !excelFile}
            >
              <Upload className="mr-2 h-4 w-4" />
              2. Select Photos
            </Button>
          </div>

          <input
            ref={excelInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleExcelSelect}
            className="hidden"
          />
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {excelFile ? (
            <p className="text-sm text-muted-foreground">
              Excel: <span className="font-medium">{excelFile.name}</span>
            </p>
          ) : null}

          {excelParseErrors.length > 0 ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {excelParseErrors.slice(0, 5).map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                  {excelParseErrors.length > 5 ? (
                    <li>... and {excelParseErrors.length - 5} more</li>
                  ) : null}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {rows.length > 0 ? (
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle className="h-4 w-4" />
                {readyCount} ready
              </span>
              {notFoundCount > 0 ? (
                <span className="flex items-center gap-1 text-amber-700">
                  <AlertCircle className="h-4 w-4" />
                  {notFoundCount} not in database
                </span>
              ) : null}
              {invalidCount > 0 ? (
                <span className="flex items-center gap-1 text-destructive">
                  <XCircle className="h-4 w-4" />
                  {invalidCount} invalid
                </span>
              ) : null}
            </div>
          ) : null}

          {rows.length > 0 ? (
            <div className="border rounded-lg overflow-hidden max-h-[320px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Sl. No.</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.file.name}-${row.serialNumber}`}>
                      <TableCell className="max-w-[140px] truncate text-xs">
                        {row.file.name}
                      </TableCell>
                      <TableCell>{row.serialNumber ?? "-"}</TableCell>
                      <TableCell>{row.personName}</TableCell>
                      <TableCell>
                        {row.status === "ready" ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700"
                          >
                            Ready
                          </Badge>
                        ) : row.status === "not_found" ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800"
                          >
                            Not in database
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            {row.error || "Invalid"}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Use the exported Excel from this page. Photo{" "}
                <span className="font-mono">3.jpg</span> must match{" "}
                <span className="font-mono">Sl. No. 3</span> in that file.
              </AlertDescription>
            </Alert>
          )}

          {isUploading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading {uploadProgress.done} of {uploadProgress.total}…
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              isUploading || readyCount === 0 || excelParseErrors.length > 0
            }
          >
            {isUploading
              ? "Uploading…"
              : `Upload ${readyCount} Photo${readyCount === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
