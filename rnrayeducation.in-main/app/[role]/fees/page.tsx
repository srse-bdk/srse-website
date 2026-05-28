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
import { useAppStore } from "@/hooks/use-app-store";
import {
    isWithinInterval
} from "date-fns";
import { AcademicYearPicker } from "./_components/academic-year-picker";
import { MonthPicker } from "./_components/month-picker";
import {
  getAcademicYearRange,
  getMonthlyRange,
} from "@/lib/utils/fee-dues";

export default function FeesPage() {
  const user = useAppStore((state) => state.user);
  const [viewMode, setViewMode] = React.useState<"monthly" | "yearly">(
    "monthly",
  );
  const [selectedMonth, setSelectedMonth] = React.useState<Date>(new Date());

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

  const { totalCollections, totalPending, collectionRate, studentsWithDues } =
    React.useMemo(() => {
      const monthRange = getMonthlyRange(selectedMonth);
      const ayRange = getAcademicYearRange(selectedAcademicYear);
      const range = viewMode === "monthly" ? monthRange : ayRange;
      const studentIds = new Set(students.map((s) => s.id));
      const feesInRange = fees.filter((fee) => {
        if (!studentIds.has(fee.studentId)) return false;
        const dueDate = new Date(fee.dueDate);
        return isWithinInterval(dueDate, { start: range.start, end: range.end });
      });

      const collectionsInRange = feesInRange
        .filter((f) => {
          const fee = f as FeeRecord & Partial<FeePayment>;
          const paidOn = fee.paidDate || fee.paymentDate || fee.updatedAt;
          if (!paidOn || (Number(f.paidAmount) || 0) <= 0) return false;
          const paidDate = new Date(paidOn);
          return isWithinInterval(paidDate, { start: range.start, end: range.end });
        })
        .reduce((acc, curr) => acc + (Number(curr.paidAmount) || 0), 0);

      const totalPendingInRange = feesInRange.reduce(
        (sum, fee) =>
          sum + Math.max(0, (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0)),
        0,
      );
      const studentsWithPendingInRange = new Set(
        feesInRange
          .filter((fee) => (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0) > 0)
          .map((fee) => fee.studentId),
      ).size;

      const rate =
        collectionsInRange + totalPendingInRange > 0
          ? (collectionsInRange / (collectionsInRange + totalPendingInRange)) * 100
          : 0;

      return {
        totalCollections: collectionsInRange,
        totalPending: totalPendingInRange,
        collectionRate: rate,
        studentsWithDues: studentsWithPendingInRange,
      };
    }, [fees, students, selectedMonth, viewMode, selectedAcademicYear]);

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
      />

      <FeeCharts fees={fees} />

      <FeesTable 
        students={students} 
        fees={fees} 
        selectedMonth={selectedMonth}
        selectedAcademicYear={selectedAcademicYear}
        viewMode={viewMode}
      />
    </div>
  );
}
