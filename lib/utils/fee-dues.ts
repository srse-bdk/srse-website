import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import type { FeeConfiguration, FeeFrequency, FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import {
  hasClassFeeForStudent,
  resolveClassFeeAmount,
} from "@/lib/utils/class-section-match";
import {
  isTuitionFeeConfig,
  studentHasReadmissionIncluded,
} from "@/lib/utils/student-selectable-fees";

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

/** Calendar date (yyyy-MM-dd) for 1 April of the academic year — no timezone shift. */
export function getAcademicYearStartDateInputValue(
  academicYear?: string,
  asOf = new Date(),
): string {
  const ay = academicYear || getAcademicYearForDate(asOf);
  const startYear = Number.parseInt(ay.split("-")[0] || "", 10);
  if (!Number.isFinite(startYear)) {
    const y = asOf.getMonth() < 3 ? asOf.getFullYear() - 1 : asOf.getFullYear();
    return `${y}-04-01`;
  }
  return `${startYear}-04-01`;
}

/**
 * Stable ISO for storage: 1 April noon UTC of the AY start year
 * (same calendar day in India and most timezones).
 */
export function getAcademicYearStartDateISO(
  academicYear?: string,
  asOf = new Date(),
): string {
  return `${getAcademicYearStartDateInputValue(academicYear, asOf)}T12:00:00.000Z`;
}

/** Parse yyyy-MM-dd or ISO into a local Date at local noon (avoids UTC day shift). */
export function parseCalendarDate(value?: string | Date | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value;
  }
  const raw = String(value).trim();
  const ymd = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [y, m, d] = ymd.split("-").map((part) => Number.parseInt(part, 10));
    const local = new Date(y, m - 1, d, 12, 0, 0, 0);
    return Number.isNaN(local.getTime()) ? undefined : local;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Format a Date / ISO as yyyy-MM-dd in local calendar. */
export function toCalendarDateInputValue(value?: string | Date | null): string {
  const date = parseCalendarDate(value);
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getCycleStep(cycle: FeeFrequency) {
  if (cycle === "monthly") return 1;
  if (cycle === "quarterly") return 3;
  if (cycle === "annually") return 12;
  return 0;
}

/**
 * Date from which fees start for a student.
 * Prefer admissionDate so late DB imports (createdAt) do not skip earlier months.
 */
export function getStudentFeeAnchorDate(student: Student) {
  if (student.admissionDate) {
    const admission = new Date(student.admissionDate);
    if (!Number.isNaN(admission.getTime())) return admission;
  }
  if (student.createdAt) {
    const created = new Date(student.createdAt);
    if (!Number.isNaN(created.getTime())) return created;
  }
  return new Date();
}

/**
 * First month tuition is billed in an AY when re-admission covers April.
 */
export function getTuitionStartAfterReadmission(academicYear: string) {
  const { start } = getAcademicYearRange(academicYear);
  return addMonths(startOfMonth(start), 1); // May
}

/**
 * Months with no separate tuition bill for a new admission.
 * - On/before the 20th: admission month tuition is included in the admission fee.
 * - After the 20th: admission month tuition is not charged; the following month
 *   is included in the admission fee.
 * Returns calendar months (1st of month).
 */
export function getTuitionMonthsCoveredByAdmission(
  admissionDate: Date,
): Date[] {
  const monthStart = startOfMonth(admissionDate);
  const day = admissionDate.getDate();
  if (day > 20) {
    return [monthStart, addMonths(monthStart, 1)];
  }
  return [monthStart];
}

/** True when admitted after the 20th (admission-month tuition waived). */
export function isAdmittedAfterTwentieth(admissionDate: Date): boolean {
  return admissionDate.getDate() > 20;
}

/**
 * Human-readable admission ↔ tuition note for titles/remarks.
 * After 20th: next month included; admission month not charged.
 */
export function describeAdmissionTuitionCoverage(admissionDate: Date): {
  titleSuffix: string;
  remarks: string;
} {
  const monthStart = startOfMonth(admissionDate);
  const admissionMonth = format(monthStart, "MMMM");
  const nextMonth = format(addMonths(monthStart, 1), "MMMM");
  if (isAdmittedAfterTwentieth(admissionDate)) {
    return {
      // Keep title short for table columns; detail goes in remarks.
      titleSuffix: `includes ${nextMonth} tuition`,
      remarks: `Includes ${nextMonth} tuition only (admitted after the 20th). ${admissionMonth} tuition is not charged. Monthly tuition starts afterward.`,
    };
  }
  return {
    titleSuffix: `includes ${admissionMonth} tuition`,
    remarks: `Includes tuition for ${format(monthStart, "MMMM yyyy")}. Monthly tuition starts the following month.`,
  };
}

/**
 * First month a new-admission student should receive a separate monthly tuition bill.
 * Null when admission date is missing/invalid.
 */
export function getTuitionStartAfterAdmission(student: Student): Date | null {
  const admission = parseCalendarDate(student.admissionDate);
  if (!admission) return null;
  const covered = getTuitionMonthsCoveredByAdmission(admission);
  const lastCovered = covered[covered.length - 1];
  return addMonths(lastCovered, 1);
}

/** True when issueDate's month is covered by the student's admission fee. */
export function isTuitionMonthCoveredByAdmission(
  student: Student,
  issueDate: Date,
): boolean {
  const admission = parseCalendarDate(student.admissionDate);
  if (!admission) return false;
  const issueMonth = startOfMonth(issueDate).getTime();
  return getTuitionMonthsCoveredByAdmission(admission).some(
    (m) => m.getTime() === issueMonth,
  );
}

function getOccurrencesInRange(
  cycle: FeeFrequency,
  anchorDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
  options?: { skipApril?: boolean },
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
    if (cursor >= rangeStart) {
      if (!(options?.skipApril && cursor.getMonth() === 3)) {
        count += 1;
      }
    }
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
      hasClassFeeForStudent(cfg.classFees, classKey) &&
      !(student.excludedFeeConfigIds || []).includes(cfg.id),
  );

  const hasReadmission = studentHasReadmissionIncluded(student, feeConfigs);
  // Continuing (not new this AY): April tuition covered by re-admission.
  const isContinuing =
    !student.admissionDate ||
    (() => {
      const admission = parseCalendarDate(
        toCalendarDateInputValue(student.admissionDate),
      );
      if (!admission) return true;
      const { start, end } = getAcademicYearRange(academicYear);
      return !(admission >= start && admission <= end);
    })();

  const expectedMandatoryDue = mandatoryConfigs.reduce((sum, cfg) => {
    const amount = resolveClassFeeAmount(cfg.classFees, classKey);
    const isMonthlyTuition =
      cfg.cycle === "monthly" && isTuitionFeeConfig(cfg);
    const skipApril =
      (hasReadmission || isContinuing) && isMonthlyTuition;

    let effectiveAnchor = anchorDate;
    if (isMonthlyTuition && !isContinuing) {
      const afterAdmission = getTuitionStartAfterAdmission(student);
      if (afterAdmission) effectiveAnchor = afterAdmission;
    } else if (isMonthlyTuition && (hasReadmission || isContinuing)) {
      effectiveAnchor = getTuitionStartAfterReadmission(academicYear);
    }

    const occurrences = getOccurrencesInRange(
      cfg.cycle,
      effectiveAnchor,
      rangeStart,
      rangeEnd,
      { skipApril },
    );
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
