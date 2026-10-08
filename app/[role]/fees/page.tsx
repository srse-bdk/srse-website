"use client";
import React from "react";

import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { FeeRecord } from "@/lib/types/fee.type";
import type { FeeConfiguration } from "@/lib/types/fee.type";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import type { Student } from "@/lib/types/student.type";
import { FeeCharts } from "./_components/fee-charts";
import { FeeStats } from "./_components/fee-stats";
import { FeesTable } from "./_components/fees-table";
import { StudentOutstandingFeesPage } from "./_components/student-outstanding-fees-page";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/hooks/use-app-store";
import {
    isWithinInterval
} from "date-fns";
import { AcademicYearPicker } from "./_components/academic-year-picker";
import { ClearFeeReceiptsButton } from "./_components/clear-fee-receipts-button";
import { MonthPicker } from "./_components/month-picker";
import {
  getAcademicYearForDate,
  getAcademicYearRange,
  getMonthlyRange,
  parseCalendarDate,
} from "@/lib/utils/fee-dues";
import { isStudentRte } from "@/lib/utils/student-rte";
import { classTokensMatch } from "@/lib/utils/class-section-match";
import { abbreviateClassNameForDisplay } from "@/lib/utils/student-display";
import { filterApplicableFeesForStudents } from "@/lib/utils/fee-bill-rules";

const CLASS_FILTER_ORDER = [
  "Nursery",
  "LKG",
  "UKG",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
] as const;

function sortClassFilterOptions(a: string, b: string) {
  const rank = (value: string) => {
    const index = CLASS_FILTER_ORDER.findIndex((preset) =>
      classTokensMatch(preset, value),
    );
    return index >= 0 ? index : 9000;
  };
  const left = rank(a);
  const right = rank(b);
  if (left !== right) return left - right;
  return a.localeCompare(b, undefined, { sensitivity: "base" });
}

export default function FeesPage() {
  const user = useAppStore((state) => state.user);
  const [viewMode, setViewMode] = React.useState<"monthly" | "yearly">(
    "monthly",
  );
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(new Date());
  const [classFilter, setClassFilter] = React.useState("all");

  // Default to current academic year (e.g., if today is Jan 2026, AY is 2025-2026)
  const [selectedAcademicYear, setSelectedAcademicYear] = React.useState(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-11
    // If before April, we are in the previous calendar year's academic session start
    // e.g., Jan 2026 is in 2025-2026
    const startYear = currentMonth < 3 ? currentYear - 1 : currentYear;
    return `${startYear}-${startYear + 1}`;
  });

  const { data: studentsData, loading: studentsLoading } =
    useFirebaseRealtime<Student>("students", {
      asArray: true,
    });
  const { data: feesData, loading: feesLoading } =
    useFirebaseRealtime<FeeRecord>("feeIssued", {
      asArray: true,
    });
  const { data: feePaymentsData, loading: feePaymentsLoading } =
    useFirebaseRealtime<FeePayment>("feePayments", {
      asArray: true,
    });
  const { data: feeConfigsData, loading: feeConfigsLoading } =
    useFirebaseRealtime<FeeConfiguration>("feeConfigurations", {
      asArray: true,
    });

  const isParent = user?.role === "parent";
  const isStudent = user?.role === "student";
  const validChildrenIds = user?.validChildrenIds || [];
  const linkedStudentId = user?.studentId;

  const students = React.useMemo(() => {
    const allStudents = (studentsData as Student[]) || [];
    if (isParent) {
      return allStudents.filter((s) => validChildrenIds.includes(s.id));
    }
    if (isStudent && linkedStudentId) {
      return allStudents.filter((s) => s.id === linkedStudentId);
    }
    return allStudents;
  }, [studentsData, isParent, isStudent, validChildrenIds, linkedStudentId]);

  const classOptions = React.useMemo(() => {
    const names = new Set<string>();
    for (const student of students) {
      const cls = student.currentClass?.trim();
      if (cls) names.add(cls);
    }
    return [...names].sort(sortClassFilterOptions);
  }, [students]);

  const filteredStudents = React.useMemo(() => {
    if (classFilter === "all") return students;
    return students.filter((student) =>
      classTokensMatch(student.currentClass || "", classFilter),
    );
  }, [students, classFilter]);

  React.useEffect(() => {
    if (classFilter === "all") return;
    const stillValid = classOptions.some((cls) =>
      classTokensMatch(cls, classFilter),
    );
    if (!stillValid) setClassFilter("all");
  }, [classFilter, classOptions]);

  const fees = React.useMemo(() => {
    const allFees = (feesData as FeeRecord[]) || [];
    if (isParent) {
      return allFees.filter((f) => validChildrenIds.includes(f.studentId));
    }
    if (isStudent && linkedStudentId) {
      return allFees.filter((f) => f.studentId === linkedStudentId);
    }
    return allFees;
  }, [feesData, isParent, isStudent, validChildrenIds, linkedStudentId]);

  const feeConfigs = (feeConfigsData as FeeConfiguration[]) || [];
  const feePayments = (feePaymentsData as FeePayment[]) || [];

  const filteredFees = React.useMemo(() => {
    if (classFilter === "all") return fees;
    const ids = new Set(filteredStudents.map((s) => s.id));
    return fees.filter((fee) => ids.has(fee.studentId));
  }, [fees, filteredStudents, classFilter]);

  const filteredFeePayments = React.useMemo(() => {
    if (classFilter === "all") return feePayments;
    const ids = new Set(filteredStudents.map((s) => s.id));
    return feePayments.filter((payment) => ids.has(payment.studentId));
  }, [feePayments, filteredStudents, classFilter]);

  const periodAcademicYear =
    viewMode === "yearly"
      ? selectedAcademicYear
      : getAcademicYearForDate(selectedMonth);

  // Stats / table totals: apply admission XOR readmission + May tuition rules.
  const applicableFees = React.useMemo(() => {
    return filterApplicableFeesForStudents(
      filteredFees,
      filteredStudents,
      feeConfigs,
      periodAcademicYear,
    );
  }, [filteredFees, filteredStudents, feeConfigs, periodAcademicYear]);

  const { totalCollections, totalPending, collectionRate, studentsWithDues } =
    React.useMemo(() => {
      const monthRange = getMonthlyRange(selectedMonth);
      const ayRange = getAcademicYearRange(periodAcademicYear);
      // Collections window: selected month, or full academic year.
      const collectionRange =
        viewMode === "monthly" ? monthRange : ayRange;
      // Pending window: AY start through end of selected period (cumulative
      // arrears + current). Monthly view must not drop Apr–Sep when viewing Oct.
      const pendingThrough = {
        start: ayRange.start,
        end: viewMode === "monthly" ? monthRange.end : ayRange.end,
      };
      const studentIds = new Set(filteredStudents.map((s) => s.id));
      const rteStudentIds = new Set(
        filteredStudents.filter(isStudentRte).map((s) => s.id),
      );

      const feesDueThroughPeriod = applicableFees.filter((fee) => {
        if (!studentIds.has(fee.studentId)) return false;
        // School pending excludes RTE — those bills are tracked under RTE / govt claim.
        if (rteStudentIds.has(fee.studentId)) return false;
        if (!fee.dueDate) return false;
        const dueDate = parseCalendarDate(fee.dueDate);
        if (!dueDate) return false;
        return (
          dueDate.getTime() >= pendingThrough.start.getTime() &&
          dueDate.getTime() <= pendingThrough.end.getTime()
        );
      });

      // Collections = approved payments received in this period (by payment date),
      // not "bills due and paid in the same window". Skip RTE (govt, not family).
      const collectionsInRange = filteredFeePayments.reduce((sum, payment) => {
        if (!studentIds.has(payment.studentId)) return sum;
        if (rteStudentIds.has(payment.studentId)) return sum;
        if (
          payment.approvalStatus &&
          payment.approvalStatus !== "approved"
        ) {
          return sum;
        }
        const amount =
          Number(payment.amountPaid ?? payment.paidAmount ?? 0) || 0;
        if (amount <= 0) return sum;
        const paidOn =
          payment.paymentDate ||
          payment.paidDate ||
          payment.approvedAt ||
          payment.updatedAt;
        if (!paidOn) return sum;
        const paidDate = parseCalendarDate(paidOn) || new Date(paidOn);
        if (Number.isNaN(paidDate.getTime())) return sum;
        if (
          !isWithinInterval(paidDate, {
            start: collectionRange.start,
            end: collectionRange.end,
          })
        ) {
          return sum;
        }
        return sum + amount;
      }, 0);

      const totalPendingThrough = feesDueThroughPeriod.reduce(
        (sum, fee) =>
          sum +
          Math.max(
            0,
            (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0),
          ),
        0,
      );

      const billedThrough = feesDueThroughPeriod.reduce(
        (sum, fee) => sum + (Number(fee.amount) || 0),
        0,
      );
      const paidAgainstBillsThrough = feesDueThroughPeriod.reduce(
        (sum, fee) =>
          sum +
          Math.min(Number(fee.amount) || 0, Number(fee.paidAmount) || 0),
        0,
      );

      const studentsWithPending = new Set(
        feesDueThroughPeriod
          .filter(
            (fee) =>
              (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0) > 0,
          )
          .map((fee) => fee.studentId),
      ).size;

      const rate =
        billedThrough > 0
          ? (paidAgainstBillsThrough / billedThrough) * 100
          : 0;

      return {
        totalCollections: collectionsInRange,
        totalPending: totalPendingThrough,
        collectionRate: rate,
        studentsWithDues: studentsWithPending,
      };
    }, [
      applicableFees,
      filteredFeePayments,
      filteredStudents,
      selectedMonth,
      viewMode,
      periodAcademicYear,
    ]);

  if (studentsLoading || feesLoading || feeConfigsLoading || feePaymentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isStudent) {
    return (
      <StudentOutstandingFeesPage
        student={students[0] || null}
        fees={fees}
        payments={feePayments}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground">
            Monitor fee collections, outstanding dues, and payment records.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          {(user?.role === "admin" || user?.role === "accounts") && (
            <ClearFeeReceiptsButton />
          )}
          {!isParent && classOptions.length > 0 && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classOptions.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {abbreviateClassNameForDisplay(cls) || cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as any)}
            className="w-[200px]"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="yearly">Yearly</TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "monthly" ? (
            <MonthPicker date={selectedMonth} setDate={setSelectedMonth} />
          ) : (
            <AcademicYearPicker
              selectedYear={selectedAcademicYear}
              onYearChange={setSelectedAcademicYear}
            />
          )}
        </div>
      </div>

      <FeeStats
        totalStudents={studentsWithDues}
        totalCollections={totalCollections}
        totalPending={totalPending}
        collectionRate={collectionRate}
        periodLabel={viewMode === "monthly" ? "this month" : "this year"}
        pendingLabel={
          viewMode === "monthly"
            ? "through this month (incl. arrears)"
            : "this academic year"
        }
      />

      <FeeCharts fees={applicableFees} />

      <FeesTable 
        students={filteredStudents} 
        fees={applicableFees}
        feeConfigs={feeConfigs}
        selectedMonth={selectedMonth}
        selectedAcademicYear={selectedAcademicYear}
        viewMode={viewMode}
      />
    </div>
  );
}
