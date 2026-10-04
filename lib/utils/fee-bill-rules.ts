import type { FeeConfiguration, FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import {
  getAcademicYearForDate,
  getAcademicYearRange,
  isTuitionMonthCoveredByAdmission,
} from "@/lib/utils/fee-dues";
import {
  configMatchesSelectableKind,
  isTuitionFeeConfig,
} from "@/lib/utils/student-selectable-fees";
import { isNewAdmissionInAcademicYear } from "@/lib/utils/student-rte";

function normalize(value?: string) {
  return (value || "").trim().toLowerCase();
}

function feeLooksLikeReadmission(fee: FeeRecord, config?: FeeConfiguration) {
  if (config) return configMatchesSelectableKind(config, "readmission");
  const text = `${fee.title || ""} ${fee.category || ""}`;
  const n = normalize(text);
  return (
    n.includes("readmission") ||
    n.includes("re-admission") ||
    n.includes("re admission")
  );
}

function feeLooksLikeAdmission(fee: FeeRecord, config?: FeeConfiguration) {
  if (config) return configMatchesSelectableKind(config, "admission");
  if (feeLooksLikeReadmission(fee, config)) return false;
  const n = normalize(`${fee.title || ""} ${fee.category || ""}`);
  return n.includes("admission");
}

function feeLooksLikeTuition(fee: FeeRecord, config?: FeeConfiguration) {
  if (config) return isTuitionFeeConfig(config);
  const n = normalize(`${fee.title || ""} ${fee.category || ""}`);
  return n.includes("tuition") || n.includes("tution");
}

function isAprilOfAcademicYear(date: Date, academicYear: string) {
  const { start } = getAcademicYearRange(academicYear);
  return (
    date.getFullYear() === start.getFullYear() && date.getMonth() === 3
  );
}

/**
 * Whether an issued bill should count toward school totals / student AY totals.
 * Enforces:
 * - Admission XOR re-admission (new → admission only; continuing → re-admission only)
 * - Continuing / re-admission: no April monthly tuition
 * - New admission: no tuition for months included in the admission fee
 *   (admission month on/before 20th; after 20th that month waived + next included)
 */
export function isFeeBillApplicableForStudent(params: {
  fee: FeeRecord;
  student: Student;
  configs?: FeeConfiguration[];
  academicYear?: string;
}): boolean {
  const { fee, student, configs = [] } = params;
  const config = fee.feeConfigId
    ? configs.find((c) => c.id === fee.feeConfigId)
    : undefined;

  const academicYear =
    params.academicYear ||
    (fee.dueDate
      ? getAcademicYearForDate(new Date(fee.dueDate))
      : getAcademicYearForDate(new Date()));

  const isNew = isNewAdmissionInAcademicYear(student, academicYear);
  const isContinuing = !isNew;

  if (feeLooksLikeAdmission(fee, config) && isContinuing) return false;
  if (feeLooksLikeReadmission(fee, config) && isNew) return false;

  if (feeLooksLikeTuition(fee, config) && fee.dueDate) {
    const due = new Date(fee.dueDate);
    if (!Number.isNaN(due.getTime())) {
      if (isContinuing && isAprilOfAcademicYear(due, academicYear)) {
        return false;
      }
      if (isNew && isTuitionMonthCoveredByAdmission(student, due)) {
        return false;
      }
    }
    if (isContinuing && fee.issuePeriodKey) {
      const { start } = getAcademicYearRange(academicYear);
      const aprilKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
      if (fee.issuePeriodKey === aprilKey) return false;
    }
  }

  return true;
}

export function filterApplicableFeesForStudent(
  fees: FeeRecord[],
  student: Student,
  configs: FeeConfiguration[] = [],
  academicYear?: string,
): FeeRecord[] {
  return fees.filter((fee) =>
    isFeeBillApplicableForStudent({ fee, student, configs, academicYear }),
  );
}

/** Filter bills for a set of students (stats / charts). */
export function filterApplicableFeesForStudents(
  fees: FeeRecord[],
  students: Student[],
  configs: FeeConfiguration[] = [],
  academicYear?: string,
): FeeRecord[] {
  const byId = new Map(students.map((s) => [s.id, s]));
  return fees.filter((fee) => {
    const student = byId.get(fee.studentId);
    if (!student) return false;
    return isFeeBillApplicableForStudent({
      fee,
      student,
      configs,
      academicYear,
    });
  });
}
