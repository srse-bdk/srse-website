"use client";

import Link from "next/link";
import {
  CreditCard,
  Download,
  GraduationCap,
  Printer,
  QrCode,
  Upload,
  Image as ImageIcon,
  Users2Icon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ImportIdCardDialog } from "@/app/[role]/id-cards/_components/import-id-card-dialog";
import { UploadProfilePhotosDialog } from "@/app/[role]/id-cards/_components/upload-profile-photos-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import {
  downloadStaffIdCardsExcel,
  downloadStudentIdCardsExcel,
} from "@/lib/utils/id-card-export";
import { backfillMissingScanIds } from "@/lib/utils/scan-id";

export default function IdCardDataPage() {
  const [isExportingStudents, setIsExportingStudents] = useState(false);
  const [isExportingStaff, setIsExportingStaff] = useState(false);
  const [studentImportOpen, setStudentImportOpen] = useState(false);
  const [staffImportOpen, setStaffImportOpen] = useState(false);
  const [studentPhotoUploadOpen, setStudentPhotoUploadOpen] = useState(false);
  const [staffPhotoUploadOpen, setStaffPhotoUploadOpen] = useState(false);
  const [isBackfillingScanIds, setIsBackfillingScanIds] = useState(false);

  const {
    data: studentsData,
    loading: studentsLoading,
    error: studentsError,
  } = useFirebaseRealtime<Student>("students", { asArray: true });

  const {
    data: staffData,
    loading: staffLoading,
    error: staffError,
  } = useFirebaseRealtime<User>("users", {
    asArray: true,
    filter: (user) => user.role === "staff",
  });

  const activeStudents = useMemo(() => {
    const students = (studentsData as Student[]) || [];
    return students.filter((student) => student.status === "active");
  }, [studentsData]);

  const activeStaff = useMemo(() => {
    const staffs = (staffData as User[]) || [];
    return staffs.filter((staff) => staff.status === "active");
  }, [staffData]);

  const handleExportStudents = async () => {
    if (activeStudents.length === 0) {
      toast.error("No active students to export");
      return;
    }

    setIsExportingStudents(true);
    try {
      downloadStudentIdCardsExcel(activeStudents);
      toast.success(`Exported ${activeStudents.length} student ID card row(s)`);
    } catch (error) {
      console.error("Error exporting student ID cards:", error);
      toast.error("Failed to export student ID cards");
    } finally {
      setIsExportingStudents(false);
    }
  };

  const handleExportStaff = async () => {
    if (activeStaff.length === 0) {
      toast.error("No active staff to export");
      return;
    }

    setIsExportingStaff(true);
    try {
      downloadStaffIdCardsExcel(activeStaff);
      toast.success(`Exported ${activeStaff.length} staff ID card row(s)`);
    } catch (error) {
      console.error("Error exporting staff ID cards:", error);
      toast.error("Failed to export staff ID cards");
    } finally {
      setIsExportingStaff(false);
    }
  };

  const handleBackfillScanIds = async () => {
    setIsBackfillingScanIds(true);
    try {
      const result = await backfillMissingScanIds();
      toast.success(
        `Scan IDs assigned. Staff/users: ${result.usersUpdated}, students: ${result.studentsUpdated}`,
      );
    } catch (error) {
      console.error("Scan ID backfill failed:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to backfill scan IDs",
      );
    } finally {
      setIsBackfillingScanIds(false);
    }
  };

  const studentsWithoutScanId = useMemo(
    () => activeStudents.filter((s) => !String(s.scanId || "").trim()).length,
    [activeStudents],
  );

  const staffWithoutScanId = useMemo(
    () => activeStaff.filter((s) => !String(s.scanId || "").trim()).length,
    [activeStaff],
  );

  const isLoading = studentsLoading || staffLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  if (studentsError || staffError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <p className="text-destructive">
          Failed to load data for ID cards. Please refresh and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ID Card Data
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
            Export or import Excel files with only the fields needed for printing
            student and staff ID cards.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Student ID Cards
            </CardTitle>
            <CardDescription>
              {activeStudents.length} active student(s). Export is sorted by
              class, section, roll number. Columns include Sl. No., name,
              class-section, contacts, DoB, and blood group. Name photos{" "}
              <span className="font-mono">1.jpg</span>,{" "}
              <span className="font-mono">2.jpg</span>… to match Sl. No., then
              upload Excel + photos (max 150 KB each). Bulk print supports
              photo-only, phased printing, and per-run exclusions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={handleExportStudents}
              disabled={isExportingStudents || activeStudents.length === 0}
            >
              <Download
                className={`mr-2 h-4 w-4 ${isExportingStudents ? "animate-spin" : ""}`}
              />
              Export Excel
            </Button>
            <Button variant="outline" onClick={() => setStudentImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => setStudentPhotoUploadOpen(true)}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Upload Photos
            </Button>
            <Button variant="secondary" asChild>
              <Link href="print">
                <Printer className="mr-2 h-4 w-4" />
                Print ID Cards
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users2Icon className="h-5 w-5" />
              Staff ID Cards
            </CardTitle>
            <CardDescription>
              {activeStaff.length} active staff member(s). Export is sorted by
              name. Columns include Sl. No., name, role, contact, and blood
              group. Name photos by Sl. No., then upload Excel + photos (max 150
              KB each) for ID cards and staff login.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button
              onClick={handleExportStaff}
              disabled={isExportingStaff || activeStaff.length === 0}
            >
              <Download
                className={`mr-2 h-4 w-4 ${isExportingStaff ? "animate-spin" : ""}`}
              />
              Export Excel
            </Button>
            <Button variant="outline" onClick={() => setStaffImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => setStaffPhotoUploadOpen(true)}
            >
              <ImageIcon className="mr-2 h-4 w-4" />
              Upload Photos
            </Button>
            <Button variant="secondary" asChild>
              <Link href="print">
                <Printer className="mr-2 h-4 w-4" />
                Print ID Cards
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Scan IDs
          </CardTitle>
          <CardDescription>
            Gate scanners read each card&apos;s unique scan ID (
            <span className="font-mono">STU-…</span> /{" "}
            <span className="font-mono">STF-…</span>). Generate missing IDs before
            printing — {studentsWithoutScanId} student(s) and {staffWithoutScanId}{" "}
            staff without a scan ID.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            onClick={handleBackfillScanIds}
            disabled={isBackfillingScanIds}
          >
            <QrCode
              className={`mr-2 h-4 w-4 ${isBackfillingScanIds ? "animate-pulse" : ""}`}
            />
            {isBackfillingScanIds ? "Generating…" : "Backfill missing scan IDs"}
          </Button>
        </CardContent>
      </Card>

      <ImportIdCardDialog
        kind="student"
        open={studentImportOpen}
        onOpenChange={setStudentImportOpen}
      />
      <ImportIdCardDialog
        kind="staff"
        open={staffImportOpen}
        onOpenChange={setStaffImportOpen}
      />
      <UploadProfilePhotosDialog
        kind="student"
        open={studentPhotoUploadOpen}
        onOpenChange={setStudentPhotoUploadOpen}
      />
      <UploadProfilePhotosDialog
        kind="staff"
        open={staffPhotoUploadOpen}
        onOpenChange={setStaffPhotoUploadOpen}
      />
    </div>
  );
}
