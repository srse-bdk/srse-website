"use client";

import { AcademicYearPicker } from "@/app/[role]/fees/_components/academic-year-picker";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { studentService } from "@/lib/services/student.service";
import type { Student } from "@/lib/types/student.type";
import {
  getAcademicYearStartDateInputValue,
  getAcademicYearStartDateISO,
  toCalendarDateInputValue,
} from "@/lib/utils/fee-dues";
import { formatClassSectionDisplay } from "@/lib/utils/student-display";
import {
  filterNewAdmissionsForYear,
  getCurrentAcademicYear,
} from "@/lib/utils/student-rte";
import { CalendarCheck, Loader2, Search, UserPlus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * Only students with a saved admissionDate inside the selected academic year.
 */
export default function NewAdmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;

  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear);
  const [searchTerm, setSearchTerm] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});

  const { data, loading } = useFirebaseRealtime<Student>("students", {
    asArray: true,
  });
  const students = (data as Student[]) || [];

  const aprilYmd = getAcademicYearStartDateInputValue(academicYear);

  const newAdmissions = useMemo(
    () => filterNewAdmissionsForYear(students, academicYear),
    [students, academicYear],
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return newAdmissions;
    return newAdmissions.filter(
      (s) =>
        (s.fullName || "").toLowerCase().includes(q) ||
        (s.pen || "").toLowerCase().includes(q) ||
        (s.admissionNumber || "").toLowerCase().includes(q) ||
        (s.currentClass || "").toLowerCase().includes(q) ||
        (s.rollNumber || "").toLowerCase().includes(q),
    );
  }, [newAdmissions, searchTerm]);

  const notOnAprilCount = useMemo(
    () =>
      filtered.filter(
        (s) => toCalendarDateInputValue(s.admissionDate) !== aprilYmd,
      ).length,
    [filtered, aprilYmd],
  );

  const saveAdmissionDate = async (student: Student) => {
    const next =
      draftDates[student.id] ?? toCalendarDateInputValue(student.admissionDate);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next)) {
      toast.error("Enter a valid admission date");
      return;
    }
    setSavingId(student.id);
    try {
      await studentService.update(student.id, {
        admissionDate: `${next}T12:00:00.000Z`,
      });
      toast.success(`Admission date updated for ${student.fullName}`);
      setDraftDates((prev) => {
        const copy = { ...prev };
        delete copy[student.id];
        return copy;
      });
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update date",
      );
    } finally {
      setSavingId(null);
    }
  };

  const setAllFilteredToApril = async () => {
    const targets = filtered.filter(
      (s) => toCalendarDateInputValue(s.admissionDate) !== aprilYmd,
    );
    if (targets.length === 0) {
      toast.info(`All listed students already have ${aprilYmd}`);
      return;
    }
    setBulkSaving(true);
    const aprilIso = getAcademicYearStartDateISO(academicYear);
    let updated = 0;
    try {
      for (const student of targets) {
        await studentService.update(student.id, { admissionDate: aprilIso });
        updated += 1;
      }
      setDraftDates({});
      toast.success(
        `Set admission date to ${aprilYmd.split("-").reverse().join("/")} for ${updated} student(s)`,
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed after updating ${updated} student(s)`,
      );
    } finally {
      setBulkSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const aprilLabel = aprilYmd.split("-").reverse().join("/");

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserPlus className="h-6 w-6" />
            New Admissions
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Students admitted in {academicYear} (admission date between 1 April
            and 31 March). Profile dates are shown as stored — many imports used
            the create date (e.g. 09/06/2026). Use the button below to set them
            to {aprilLabel}. RTE is on Students List.
          </p>
        </div>
        <AcademicYearPicker
          selectedYear={academicYear}
          onYearChange={setAcademicYear}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 max-w-md">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New admissions</CardDescription>
            <CardTitle className="text-2xl">{newAdmissions.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Session start date</CardDescription>
            <CardTitle className="text-lg font-mono">{aprilLabel}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <CardTitle>New students</CardTitle>
              <CardDescription>
                {filtered.length} of {newAdmissions.length} for {academicYear}
                {notOnAprilCount > 0
                  ? ` · ${notOnAprilCount} not on ${aprilLabel}`
                  : ""}
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search name, PEN…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button
                variant="outline"
                disabled={bulkSaving || notOnAprilCount === 0}
                onClick={setAllFilteredToApril}
                className="shrink-0 gap-2"
              >
                {bulkSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarCheck className="h-4 w-4" />
                )}
                Set listed to {aprilLabel}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center max-w-md mx-auto">
              No new admissions for {academicYear}. Only students with a saved
              admission date in this session appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>PEN</TableHead>
                    <TableHead>Admission Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((student) => {
                    const storedDate = toCalendarDateInputValue(
                      student.admissionDate,
                    );
                    const dateValue = draftDates[student.id] ?? storedDate;
                    const dateDirty =
                      draftDates[student.id] != null &&
                      draftDates[student.id] !== storedDate;
                    const busy = savingId === student.id || bulkSaving;

                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <button
                            type="button"
                            className="font-medium text-left hover:underline"
                            onClick={() =>
                              router.push(`/${role}/students/${student.id}`)
                            }
                          >
                            {student.fullName}
                          </button>
                          {student.rollNumber ? (
                            <div className="text-xs text-muted-foreground">
                              Roll {student.rollNumber}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatClassSectionDisplay(student)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {student.pen || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="date"
                              className="h-8 w-[150px]"
                              value={dateValue}
                              disabled={busy}
                              onChange={(e) =>
                                setDraftDates((prev) => ({
                                  ...prev,
                                  [student.id]: e.target.value,
                                }))
                              }
                            />
                            {dateDirty ? (
                              <Button
                                size="sm"
                                className="h-8"
                                disabled={busy}
                                onClick={() => saveAdmissionDate(student)}
                              >
                                {busy && savingId === student.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
