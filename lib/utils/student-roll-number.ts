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

export function compareStudentsByClassSectionRoll(
  left: Student,
  right: Student,
): number {
  const [leftClassRank, leftClassKey] = getClassSortRank(left.currentClass);
  const [rightClassRank, rightClassKey] = getClassSortRank(right.currentClass);

  if (leftClassRank !== rightClassRank) {
    return leftClassRank - rightClassRank;
  }

  if (leftClassKey !== rightClassKey) {
    return leftClassKey.localeCompare(rightClassKey);
  }

  const sectionDiff = normalizeSectionToken(left.currentSection).localeCompare(
    normalizeSectionToken(right.currentSection),
  );
  if (sectionDiff !== 0) return sectionDiff;

  const rollDiff =
    parseRollNumberSortValue(left.rollNumber) -
    parseRollNumberSortValue(right.rollNumber);
  if (rollDiff !== 0) return rollDiff;

  return (left.fullName || "").localeCompare(right.fullName || "", undefined, {
    sensitivity: "base",
  });
}

export function sortStudentsByClassSectionRoll(students: Student[]): Student[] {
  return [...students].sort(compareStudentsByClassSectionRoll);
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
