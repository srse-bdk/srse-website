import type { Student } from "@/lib/types/student.type";
import {
  classTokensMatch,
  normalizeSectionToken,
} from "@/lib/utils/class-section-match";

const CLASS_SORT_ORDER = [
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

export function parseRollNumberSortValue(rollNumber?: string): number {
  const digits = String(rollNumber || "").replace(/\D/g, "");
  const parsed = Number.parseInt(digits, 10);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

function getClassSortRank(className?: string): [number, string] {
  const value = className?.trim();
  if (!value) return [9999, ""];

  const presetIndex = CLASS_SORT_ORDER.findIndex((preset) =>
    classTokensMatch(preset, value),
  );
  if (presetIndex >= 0) return [presetIndex, ""];

  return [9000, value.toLowerCase()];
}

export function getClassSectionGroupKey(
  currentClass?: string,
  currentSection?: string,
): string {
  const cls = String(currentClass || "").trim().toLowerCase();
  const section = normalizeSectionToken(currentSection);
  if (!cls) return "";
  return section ? `${cls}::${section}` : cls;
}

export function studentMatchesClassSection(
  student: Student,
  currentClass: string,
  currentSection: string,
): boolean {
  return (
    classTokensMatch(student.currentClass || "", currentClass) &&
    normalizeSectionToken(student.currentSection) ===
      normalizeSectionToken(currentSection)
  );
}

export type StudentListSortMode = "roll" | "name";

function compareClassThenSection(left: Student, right: Student): number {
  const [leftClassRank, leftClassKey] = getClassSortRank(left.currentClass);
  const [rightClassRank, rightClassKey] = getClassSortRank(right.currentClass);

  if (leftClassRank !== rightClassRank) {
    return leftClassRank - rightClassRank;
  }

  if (leftClassKey !== rightClassKey) {
    return leftClassKey.localeCompare(rightClassKey);
  }

  return normalizeSectionToken(left.currentSection).localeCompare(
    normalizeSectionToken(right.currentSection),
  );
}

export function compareStudentsByClassSectionRoll(
  left: Student,
  right: Student,
): number {
  const classSectionDiff = compareClassThenSection(left, right);
  if (classSectionDiff !== 0) return classSectionDiff;

  const rollDiff =
    parseRollNumberSortValue(left.rollNumber) -
    parseRollNumberSortValue(right.rollNumber);
  if (rollDiff !== 0) return rollDiff;

  return (left.fullName || "").localeCompare(right.fullName || "", undefined, {
    sensitivity: "base",
  });
}

/** Within each class-section, sort A–Z by name (then roll as tiebreaker). */
export function compareStudentsByClassSectionName(
  left: Student,
  right: Student,
): number {
  const classSectionDiff = compareClassThenSection(left, right);
  if (classSectionDiff !== 0) return classSectionDiff;

  const nameDiff = (left.fullName || "").localeCompare(
    right.fullName || "",
    undefined,
    { sensitivity: "base" },
  );
  if (nameDiff !== 0) return nameDiff;

  return (
    parseRollNumberSortValue(left.rollNumber) -
    parseRollNumberSortValue(right.rollNumber)
  );
}

export function sortStudentsByClassSectionRoll(students: Student[]): Student[] {
  return [...students].sort(compareStudentsByClassSectionRoll);
}

export function sortStudentsByClassSection(
  students: Student[],
  mode: StudentListSortMode = "roll",
): Student[] {
  return [...students].sort(
    mode === "name"
      ? compareStudentsByClassSectionName
      : compareStudentsByClassSectionRoll,
  );
}

export function groupActiveStudentsByClassSection(
  students: Student[],
): Map<string, Student[]> {
  const groups = new Map<string, Student[]>();

  for (const student of students) {
    if (student.status !== "active") continue;

    const className = student.currentClass?.trim();
    const section = student.currentSection?.trim();
    if (!className || !section) continue;

    const key = getClassSectionGroupKey(className, section);
    const list = groups.get(key) || [];
    list.push(student);
    groups.set(key, list);
  }

  return groups;
}

export function getNextRollNumberForClassSection(
  students: Student[],
  currentClass: string,
  currentSection: string,
): string {
  const rollNumbers = students
    .filter(
      (student) =>
        student.status === "active" &&
        studentMatchesClassSection(student, currentClass, currentSection),
    )
    .map((student) => parseRollNumberSortValue(student.rollNumber))
    .filter((value) => value !== Number.MAX_SAFE_INTEGER);

  if (rollNumbers.length === 0) {
    return "1";
  }

  return String(Math.max(...rollNumbers) + 1);
}

export type EnrollmentRollIndex = Map<string, Set<string>>;

export function buildEnrollmentRollIndex(
  enrollments: Array<{ classId: string; section: string; rollNumber: string; status?: string; studentId: string }>,
  validStudentIds?: Set<string>,
): EnrollmentRollIndex {
  const index: EnrollmentRollIndex = new Map();

  for (const enrollment of enrollments) {
    if (enrollment.status && enrollment.status !== "active") continue;
    if (validStudentIds && !validStudentIds.has(enrollment.studentId)) continue;

    const key = `${enrollment.classId}::${enrollment.section}`;
    const used = index.get(key) || new Set<string>();
    if (enrollment.rollNumber) {
      used.add(enrollment.rollNumber);
    }
    index.set(key, used);
  }

  return index;
}

export function reserveRollNumberInIndex(
  index: EnrollmentRollIndex,
  classId: string,
  section: string,
  preferredRoll?: string,
): string {
  const key = `${classId}::${section}`;
  const used = index.get(key) || new Set<string>();
  const preferred = preferredRoll?.trim();

  if (preferred && !used.has(preferred)) {
    used.add(preferred);
    index.set(key, used);
    return preferred;
  }

  let next = 1;
  while (used.has(String(next))) {
    next += 1;
  }
  const rollNumber = String(next);
  used.add(rollNumber);
  index.set(key, used);
  return rollNumber;
}
