import type { Student } from "@/lib/types/student.type";
import {
  getAcademicYearForDate,
  getAcademicYearRange,
  parseCalendarDate,
  toCalendarDateInputValue,
} from "@/lib/utils/fee-dues";

export function isStudentRte(student?: Student | null): boolean {
  return Boolean(student?.isRte);
}

/**
 * True only when the student has a saved admissionDate that falls inside the
 * academic year window (1 April – 31 March). Missing dates are not treated as new.
 */
export function isNewAdmissionInAcademicYear(
  student: Student,
  academicYear: string,
): boolean {
  if (!student.admissionDate) return false;
  const admissionYmd = toCalendarDateInputValue(student.admissionDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(admissionYmd)) return false;

  const admission = parseCalendarDate(admissionYmd);
  if (!admission) return false;

  const { start, end } = getAcademicYearRange(academicYear);
  // Compare calendar days in local time
  const startDay = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate(),
    0,
    0,
    0,
    0,
  );
  const endDay = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate(),
    23,
    59,
    59,
    999,
  );
  return admission >= startDay && admission <= endDay;
}

export function getCurrentAcademicYear(asOf = new Date()): string {
  return getAcademicYearForDate(asOf);
}

export function filterNewAdmissionsForYear(
  students: Student[],
  academicYear: string,
): Student[] {
  return students
    .filter((s) => isNewAdmissionInAcademicYear(s, academicYear))
    .sort((a, b) => {
      const da = parseCalendarDate(a.admissionDate)?.getTime() || 0;
      const db = parseCalendarDate(b.admissionDate)?.getTime() || 0;
      return db - da;
    });
}

export function filterRteStudents(students: Student[]): Student[] {
  return students.filter(isStudentRte);
}
