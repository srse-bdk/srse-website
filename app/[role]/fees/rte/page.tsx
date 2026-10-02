"use client";

import { AcademicYearPicker } from "@/app/[role]/fees/_components/academic-year-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import type { FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { formatCurrency } from "@/lib/utils";
import { getAcademicYearRange } from "@/lib/utils/fee-dues";
import { formatClassSectionDisplay } from "@/lib/utils/student-display";
import {
  filterRteStudents,
  getCurrentAcademicYear,
  isNewAdmissionInAcademicYear,
} from "@/lib/utils/student-rte";
import { Building2, Loader2, Plus, Search, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export default function RteFeesPage() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;

  const [academicYear, setAcademicYear] = useState(getCurrentAcademicYear);
  const [searchTerm, setSearchTerm] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: studentsData, loading: studentsLoading } =
    useFirebaseRealtime<Student>("students", { asArray: true });
  const { data: feesData, loading: feesLoading } =
    useFirebaseRealtime<FeeRecord>("feeIssued", { asArray: true });

  const students = (studentsData as Student[]) || [];
  const fees = (feesData as FeeRecord[]) || [];
  const ayRange = useMemo(
    () => getAcademicYearRange(academicYear),
    [academicYear],
  );

  const rteStudents = useMemo(() => filterRteStudents(students), [students]);

  const addCandidates = useMemo(() => {
    const q = addQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return students
      .filter((s) => !s.isRte)
      .filter((s) => {
        return (
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.pen || "").toLowerCase().includes(q) ||
          (s.admissionNumber || "").toLowerCase().includes(q) ||
          (s.rollNumber || "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [students, addQuery]);

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rteStudents
      .map((student) => {
        const studentFees = fees.filter((f) => {
          if (f.studentId !== student.id || !f.dueDate) return false;
          const due = new Date(f.dueDate);
          return due >= ayRange.start && due <= ayRange.end;
        });
        const billed = studentFees.reduce(
          (sum, f) => sum + (Number(f.amount) || 0),
          0,
        );
        const paid = studentFees.reduce(
          (sum, f) => sum + (Number(f.paidAmount) || 0),
          0,
        );
        const outstanding = Math.max(0, billed - paid);
        const isNew = isNewAdmissionInAcademicYear(student, academicYear);
        return {
          student,
          billed,
          paid,
          outstanding,
          isNew,
        };
      })
      .filter((row) => {
        if (!q) return true;
        const s = row.student;
        return (
          (s.fullName || "").toLowerCase().includes(q) ||
          (s.pen || "").toLowerCase().includes(q) ||
          (s.admissionNumber || "").toLowerCase().includes(q) ||
          (s.currentClass || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.outstanding - a.outstanding);
  }, [rteStudents, fees, ayRange, searchTerm, academicYear]);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.billed += row.billed;
        acc.paid += row.paid;
        acc.outstanding += row.outstanding;
        if (row.isNew) acc.newCount += 1;
        else acc.continuingCount += 1;
        return acc;
      },
      { billed: 0, paid: 0, outstanding: 0, newCount: 0, continuingCount: 0 },
    );
  }, [rows]);

  const setRte = async (student: Student, isRte: boolean) => {
    setSavingId(student.id);
    try {
      await studentService.update(student.id, { isRte });
      toast.success(
        isRte
          ? `${student.fullName} marked as RTE`
          : `${student.fullName} removed from RTE`,
      );
      if (isRte) setAddQuery("");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update RTE",
      );
    } finally {
      setSavingId(null);
    }
  };

  if (studentsLoading || feesLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            RTE — Government claim
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            RTE applies to{" "}
            <strong>new admissions and continuing / re-admission</strong>{" "}
            students. Outstanding bills are claimable from government — not
            from families.
          </p>
        </div>
        <AcademicYearPicker
          selectedYear={academicYear}
          onYearChange={setAcademicYear}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>RTE students</CardDescription>
            <CardTitle className="text-2xl">{rteStudents.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>New this AY</CardDescription>
            <CardTitle className="text-2xl">{totals.newCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Continuing / re-adm</CardDescription>
            <CardTitle className="text-2xl">{totals.continuingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Billed (AY)</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(totals.billed)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Outstanding on govt</CardDescription>
            <CardTitle className="text-xl text-amber-700 dark:text-amber-400">
              {formatCurrency(totals.outstanding)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Mark any student as RTE
          </CardTitle>
          <CardDescription>
            Search by name, admission no, or roll — works for new admissions and
            re-admission / continuing students.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Type at least 2 characters…"
              value={addQuery}
              onChange={(e) => setAddQuery(e.target.value)}
            />
          </div>
          {addCandidates.length > 0 ? (
            <ul className="rounded-md border divide-y max-w-xl">
              {addCandidates.map((student) => {
                const isNew = isNewAdmissionInAcademicYear(
                  student,
                  academicYear,
                );
                const busy = savingId === student.id;
                return (
                  <li
                    key={student.id}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {student.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatClassSectionDisplay(student)}
                        {student.pen ? ` · PEN ${student.pen}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">
                        {isNew ? "New" : "Re-adm / continuing"}
                      </Badge>
                      <Button
                        size="sm"
                        disabled={busy}
                        onClick={() => setRte(student, true)}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          "Set RTE"
                        )}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : addQuery.trim().length >= 2 ? (
            <p className="text-xs text-muted-foreground">
              No matching non-RTE students.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div>
              <CardTitle>RTE students</CardTitle>
              <CardDescription>
                School fee pending excludes these students. Outstanding here is
                the government receivable.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search RTE students…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              No RTE students yet. Use the search above, student edit form, or{" "}
              <button
                type="button"
                className="underline font-medium"
                onClick={() =>
                  router.push(`/${role}/students/new-admissions`)
                }
              >
                New Admissions
              </button>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>PEN</TableHead>
                    <TableHead className="text-right">Billed</TableHead>
                    <TableHead className="text-right">
                      Outstanding (govt)
                    </TableHead>
                    <TableHead className="text-center">RTE</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ student, billed, outstanding, isNew }) => {
                    const busy = savingId === student.id;
                    return (
                      <TableRow key={student.id}>
                        <TableCell>
                          <div className="font-medium">{student.fullName}</div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isNew ? "default" : "secondary"}
                            className="text-[10px]"
                          >
                            {isNew ? "New admission" : "Re-adm / continuing"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatClassSectionDisplay(student)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {student.pen || "—"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrency(billed)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-amber-700 dark:text-amber-400">
                          {formatCurrency(outstanding)}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-center">
                            <Switch
                              checked
                              disabled={busy}
                              onCheckedChange={(checked) => {
                                if (!checked) setRte(student, false);
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                router.push(`/${role}/students/${student.id}`)
                              }
                            >
                              Profile
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              disabled={busy}
                              title="Remove RTE"
                              onClick={() => setRte(student, false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
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
