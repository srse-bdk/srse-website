import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import { sortStudentsByClassSectionRoll } from "@/lib/utils/student-roll-number";
import { downloadExcelSheet } from "@/lib/utils/spreadsheet";

export const STUDENT_ID_CARD_HEADERS = [
  "Sl. No.",
  "Student Name",
  "Class-Section",
  "Contact Num",
  "Alt. Contact Num",
  "DoB",
  "Blood Group",
] as const;

export const STAFF_ID_CARD_HEADERS = [
  "Sl. No.",
  "Staff Name",
  "Role",
  "Contact Number",
  "Blood Group",
] as const;

function formatClassSection(student: Student): string {
  const cls = student.currentClass?.trim();
  const sec = student.currentSection?.trim();
  if (cls && sec) return `${cls}-${sec}`;
  if (cls) return cls;
  return "";
}

function formatDoB(isoDate?: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function getGuardianPhone(
  student: Student,
  relationship: "father" | "mother",
): string {
  const guardian = student.guardians?.find((g) => g.relationship === relationship);
  return guardian?.phone?.trim() || "";
}

function getContactNum(student: Student): string {
  return getGuardianPhone(student, "father") || student.phone?.trim() || "";
}

function getAltContactNumber(student: Student): string {
  return (
    getGuardianPhone(student, "mother") ||
    student.alternatePhone?.trim() ||
    ""
  );
}

function formatStaffRole(staff: User): string {
  if (staff.position?.trim()) return staff.position.trim();
  if (staff.staffType === "teaching") return "Teacher";
  if (staff.staffType === "non-teaching") return "Non-teaching Staff";
  return "Staff";
}

export function sortStudentsForIdCardExport(students: Student[]): Student[] {
  return sortStudentsByClassSectionRoll(students);
}

export function sortStaffForIdCardExport(staffs: User[]): User[] {
  return [...staffs].sort((left, right) =>
    (left.name || "").localeCompare(right.name || "", undefined, {
      sensitivity: "base",
    }),
  );
}

export function exportStudentIdCardsToRows(students: Student[]): string[][] {
  return sortStudentsForIdCardExport(students).map((student, index) => [
    String(index + 1),
    student.fullName || "",
    formatClassSection(student),
    getContactNum(student),
    getAltContactNumber(student),
    formatDoB(student.dateOfBirth),
    student.bloodGroup || "",
  ]);
}

export function exportStaffIdCardsToRows(staffs: User[]): string[][] {
  return sortStaffForIdCardExport(staffs).map((staff, index) => [
    String(index + 1),
    staff.name || "",
    formatStaffRole(staff),
    staff.phoneNumber || "",
    staff.bloodGroup || "",
  ]);
}

export function downloadStudentIdCardsExcel(students: Student[]): void {
  const dateStr = new Date().toISOString().split("T")[0];
  downloadExcelSheet(
    [...STUDENT_ID_CARD_HEADERS],
    exportStudentIdCardsToRows(students),
    `student_id_cards_${dateStr}.xlsx`,
    "Student ID Cards",
  );
}

export function downloadStaffIdCardsExcel(staffs: User[]): void {
  const dateStr = new Date().toISOString().split("T")[0];
  downloadExcelSheet(
    [...STAFF_ID_CARD_HEADERS],
    exportStaffIdCardsToRows(staffs),
    `staff_id_cards_${dateStr}.xlsx`,
    "Staff ID Cards",
  );
}

export function downloadStudentIdCardTemplateExcel(): void {
  downloadExcelSheet(
    [...STUDENT_ID_CARD_HEADERS],
    [
      [
        "1",
        "John Doe",
        "I-A",
        "9876543210",
        "9876543211",
        "15/08/2015",
        "B+",
      ],
    ],
    "student_id_cards_template.xlsx",
    "Student ID Cards",
  );
}

export function downloadStaffIdCardTemplateExcel(): void {
  downloadExcelSheet(
    [...STAFF_ID_CARD_HEADERS],
    [["1", "Jane Smith", "Teacher", "9876501234", "B+"]],
    "staff_id_cards_template.xlsx",
    "Staff ID Cards",
  );
}
