import { addMonths, endOfMonth, startOfMonth } from "date-fns";
import type { FeeConfiguration, FeeFrequency, FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";

function normalize(str: string) {
  return (str || "").trim().toLowerCase();
}

export function getAcademicYearForDate(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month < 3 ? year - 1 : year;
  return `${startYear}-${startYear + 1}`;
}

export function getAcademicYearRange(academicYear: string) {
  const [startYearStr, endYearStr] = academicYear.split("-");
  const startYear = Number.parseInt(startYearStr, 10);
  const endYear = Number.parseInt(endYearStr, 10);
  return {
    start: new Date(startYear, 3, 1, 0, 0, 0),
    end: new Date(endYear, 2, 31, 23, 59, 59),
  };
}

function getCycleStep(cycle: FeeFrequency) {
  if (cycle === "monthly") return 1;
  if (cycle === "quarterly") return 3;
  if (cycle === "annually") return 12;
  return 0;
}

export function getStudentFeeAnchorDate(student: Student) {
  const created = student.createdAt ? new Date(student.createdAt) : new Date();
  const admission = student.admissionDate ? new Date(student.admissionDate) : created;
  return admission > created ? admission : created;
}

function getOccurrencesInRange(
  cycle: FeeFrequency,
  anchorDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
) {
  if (cycle === "one-time") {
    const anchor = startOfMonth(anchorDate);
    return anchor >= rangeStart && anchor <= rangeEnd ? 1 : 0;
  }

  const step = getCycleStep(cycle);
  if (!step) return 0;

  let count = 0;
  let cursor = startOfMonth(anchorDate);
  while (cursor <= rangeEnd) {
    if (cursor >= rangeStart) count += 1;
    cursor = addMonths(cursor, step);
  }
  return count;
}

export interface StudentDueSummary {
  studentId: string;
  expectedDue: number;
  paidAmount: number;
  pendingAmount: number;
}

export function calculateStudentDueFromStructure(params: {
  student: Student;
  feeConfigs: FeeConfiguration[];
  feeRecords: FeeRecord[];
  rangeStart: Date;
  rangeEnd: Date;
  academicYear: string;
}) {
  const { student, feeConfigs, feeRecords, rangeStart, rangeEnd, academicYear } = params;
  const classKey = student.currentClass || "unassigned";
  const anchorDate = getStudentFeeAnchorDate(student);

  const mandatoryConfigs = feeConfigs.filter(
    (cfg) =>
      !cfg.isOptional &&
      cfg.academicYear === academicYear &&
      cfg.classFees?.[classKey] !== undefined,
  );

  const expectedMandatoryDue = mandatoryConfigs.reduce((sum, cfg) => {
    const amount = Number(cfg.classFees[classKey]) || 0;
    const occurrences = getOccurrencesInRange(cfg.cycle, anchorDate, rangeStart, rangeEnd);
    return sum + amount * occurrences;
  }, 0);

  const mandatoryConfigNames = new Set(
    mandatoryConfigs.map((cfg) => normalize(cfg.name)),
  );

  const inRangeStudentFees = feeRecords.filter((fee) => {
    if (fee.studentId !== student.id) return false;
    if (!fee.dueDate) return false;
    const due = new Date(fee.dueDate);
    return due >= rangeStart && due <= rangeEnd;
  });

  const paidAgainstMandatory = inRangeStudentFees.reduce((sum, fee) => {
    const feeCategory = normalize(String(fee.category || ""));
    const title = normalize(fee.title || "");
    const isMandatory = [...mandatoryConfigNames].some(
      (name) => feeCategory === name || title.includes(name),
    );
    if (!isMandatory) return sum;
    return sum + (Number(fee.paidAmount) || 0);
  }, 0);

  const extraFromNonMandatoryRecords = inRangeStudentFees.reduce(
    (acc, fee) => {
      const feeCategory = normalize(String(fee.category || ""));
      const title = normalize(fee.title || "");
      const isMandatory = [...mandatoryConfigNames].some(
        (name) => feeCategory === name || title.includes(name),
      );
      if (isMandatory) return acc;

      const due = Number(fee.amount) || 0;
      const paid = Number(fee.paidAmount) || 0;
      acc.expected += due;
      acc.paid += Math.min(due, paid);
      acc.pending += Math.max(0, due - paid);
      return acc;
    },
    { expected: 0, paid: 0, pending: 0 },
  );

  const pendingMandatory = Math.max(0, expectedMandatoryDue - paidAgainstMandatory);
  const totalExpectedDue = expectedMandatoryDue + extraFromNonMandatoryRecords.expected;
  const totalPaid = Math.min(expectedMandatoryDue, paidAgainstMandatory) + extraFromNonMandatoryRecords.paid;
  const totalPending = pendingMandatory + extraFromNonMandatoryRecords.pending;

  return {
    studentId: student.id,
    expectedDue: totalExpectedDue,
    paidAmount: totalPaid,
    pendingAmount: totalPending,
  } as StudentDueSummary;
}

export function aggregateStudentDueSummaries(summaries: StudentDueSummary[]) {
  return summaries.reduce(
    (acc, item) => {
      acc.totalExpected += item.expectedDue;
      acc.totalPaid += item.paidAmount;
      acc.totalPending += item.pendingAmount;
      if (item.pendingAmount > 0) acc.studentsWithDue += 1;
      return acc;
    },
    { totalExpected: 0, totalPaid: 0, totalPending: 0, studentsWithDue: 0 },
  );
}

export function getMonthlyRange(date: Date) {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
}
