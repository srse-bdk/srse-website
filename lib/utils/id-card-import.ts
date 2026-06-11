import type { BloodGroup } from "@/lib/types/student.type";
import type { Guardian, Student, StudentUpdateInput } from "@/lib/types/student.type";
import type { User, UserUpdateInput } from "@/lib/types/user.type";
import {
  downloadStaffIdCardTemplateExcel,
  downloadStudentIdCardTemplateExcel,
  STUDENT_ID_CARD_HEADERS,
  STAFF_ID_CARD_HEADERS,
} from "@/lib/utils/id-card-export";
import { sanitizeImportValue } from "@/lib/utils/import-values";
import {
  normalizePersonName,
  normalizeSectionToken,
  parseCombinedClassSection,
  personNamesMatch,
  studentClassSectionMatches,
} from "@/lib/utils/class-section-match";
import { parseSpreadsheetToRowObjects } from "@/lib/utils/spreadsheet";

export { STUDENT_ID_CARD_HEADERS, STAFF_ID_CARD_HEADERS };

export interface StudentIdCardRow {
  rowNumber: number;
  serialNumber: number;
  studentName: string;
  classSection: string;
  contactNum: string;
  altContactNumber: string;
  dateOfBirth?: string;
  bloodGroup?: BloodGroup;
}

export interface StaffIdCardRow {
  rowNumber: number;
  serialNumber: number;
  staffName: string;
  role: string;
  contactNumber: string;
  bloodGroup?: BloodGroup;
}

const BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

const SERIAL_ALIASES = [
  "sl no",
  "sl. no.",
  "sl no.",
  "sl. no",
  "serial",
  "serial no",
  "serial number",
  "s no",
  "s.no",
  "sr no",
  "sr. no",
];

const STUDENT_NAME_ALIASES = ["student name", "name", "full name"];
const CLASS_SECTION_ALIASES = [
  "class section",
  "class-section",
  "class/section",
  "class",
];
const CONTACT_NUM_ALIASES = [
  "contact num",
  "contact number",
  "contact no",
  "phone",
  "mobile",
  "father contact",
  "father phone",
];
const ALT_CONTACT_ALIASES = [
  "alt contact num",
  "alt contact number",
  "alt contact",
  "alternate contact number",
  "alternate contact num",
  "alternate contact",
  "alternate phone",
  "mother contact",
  "mother phone",
];
const DOB_ALIASES = ["dob", "date of birth", "birth date", "birthdate"];
const BLOOD_GROUP_ALIASES = ["blood group", "bloodgroup", "blood"];

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getRowValue(row: Record<string, string>, aliases: string[]): string {
  const sortedAliases = [...aliases]
    .map(normalizeHeader)
    .sort((left, right) => right.length - left.length);

  const entries = Object.entries(row).map(([key, value]) => [
    normalizeHeader(key),
    value?.trim() || "",
  ] as const);

  for (const alias of sortedAliases) {
    for (const [key, value] of entries) {
      if (key === alias) {
        return value;
      }
    }
  }

  return "";
}

export function parseSerialNumber(raw: string, fallback: number): number {
  const sanitized = sanitizeImportValue(raw);
  if (!sanitized) return fallback;
  const parsed = Number.parseInt(sanitized, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
}

function parseBloodGroup(raw: string): BloodGroup | undefined {
  const sanitized = sanitizeImportValue(raw);
  if (!sanitized) return undefined;
  const normalized = sanitized.toUpperCase().replace(/\s+/g, "");
  return BLOOD_GROUPS.includes(normalized as BloodGroup)
    ? (normalized as BloodGroup)
    : undefined;
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/[\s\-()]/g, "").replace(/^\+91/, "");
}

function isValidPhone(value: string): boolean {
  const digits = normalizePhoneDigits(value);
  return /^\d{10,15}$/.test(digits);
}

function parseImportDate(raw: string): Date | null {
  const sanitized = sanitizeImportValue(raw);
  if (!sanitized) return null;

  const isoDate = new Date(sanitized);
  if (!Number.isNaN(isoDate.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(sanitized)) {
    return isoDate;
  }

  const parts = sanitized.split(/[\/\-.]/);
  if (parts.length === 3) {
    const [first, second, third] = parts.map((part) => Number.parseInt(part, 10));
    if (
      Number.isNaN(first) ||
      Number.isNaN(second) ||
      Number.isNaN(third)
    ) {
      return null;
    }

    let day = first;
    let month = second;
    let year = third;

    if (year < 100) {
      year += year >= 50 ? 1900 : 2000;
    }

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else if (first <= 12 && second <= 12) {
      day = first;
      month = second;
    }

    const date = new Date(year, month - 1, day);
    if (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }
  }

  const fallback = new Date(sanitized);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function hasRecognizedHeader(
  row: Record<string, string>,
  aliases: string[],
): boolean {
  const normalizedAliases = new Set(aliases.map(normalizeHeader));
  return Object.keys(row).some((key) => normalizedAliases.has(normalizeHeader(key)));
}

function validateStudentIdCardHeaders(
  rows: Record<string, string>[],
): string[] {
  if (rows.length === 0) {
    return ["File has no data rows"];
  }

  const firstRow = rows[0];
  const errors: string[] = [];

  if (!hasRecognizedHeader(firstRow, STUDENT_NAME_ALIASES)) {
    errors.push('Missing required column: "Student Name"');
  }

  if (!hasRecognizedHeader(firstRow, CLASS_SECTION_ALIASES)) {
    errors.push('Missing required column: "Class-Section"');
  }

  return errors;
}

function validateStaffIdCardHeaders(rows: Record<string, string>[]): string[] {
  if (rows.length === 0) {
    return ["File has no data rows"];
  }

  const firstRow = rows[0];
  const errors: string[] = [];

  if (!hasRecognizedHeader(firstRow, ["staff name", "name"])) {
    errors.push('Missing required column: "Staff Name"');
  }

  return errors;
}

export function parseStudentIdCardFile(
  fileName: string,
  content: string | ArrayBuffer,
): {
  rows: StudentIdCardRow[];
  errors: string[];
} {
  const { rows: rawRows, errors } = parseSpreadsheetToRowObjects(fileName, content);
  const parsed: StudentIdCardRow[] = [];
  const rowErrors = [...errors, ...validateStudentIdCardHeaders(rawRows)];

  if (rowErrors.length > 0) {
    return { rows: [], errors: rowErrors };
  }

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const defaultSerial = index + 1;
    const serialNumber = parseSerialNumber(
      getRowValue(row, SERIAL_ALIASES),
      defaultSerial,
    );
    const studentName = sanitizeImportValue(
      getRowValue(row, STUDENT_NAME_ALIASES),
    );
    const classSection = sanitizeImportValue(
      getRowValue(row, CLASS_SECTION_ALIASES),
    );
    const contactNumRaw = getRowValue(row, CONTACT_NUM_ALIASES);
    const altContactRaw = getRowValue(row, ALT_CONTACT_ALIASES);
    const contactNum = sanitizeImportValue(contactNumRaw);
    const altContactNumber = sanitizeImportValue(altContactRaw);
    const dobRaw = getRowValue(row, DOB_ALIASES);
    const bloodGroupRaw = getRowValue(row, BLOOD_GROUP_ALIASES);

    if (!studentName) {
      rowErrors.push(`Row ${rowNumber}: Student Name is required`);
      return;
    }

    if (!classSection) {
      rowErrors.push(`Row ${rowNumber}: Class-Section is required`);
      return;
    }

    if (contactNumRaw.trim() && !contactNum) {
      rowErrors.push(`Row ${rowNumber}: Contact Num is not a valid value`);
      return;
    }

    if (contactNum && !isValidPhone(contactNum)) {
      rowErrors.push(
        `Row ${rowNumber}: Contact Num must be 10–15 digits (got "${contactNum}")`,
      );
      return;
    }

    if (altContactRaw.trim() && !altContactNumber) {
      rowErrors.push(
        `Row ${rowNumber}: Alt. Contact Num is not a valid value`,
      );
      return;
    }

    if (altContactNumber && !isValidPhone(altContactNumber)) {
      rowErrors.push(
        `Row ${rowNumber}: Alt. Contact Num must be 10–15 digits (got "${altContactNumber}")`,
      );
      return;
    }

    const parsedDob = parseImportDate(dobRaw);
    if (dobRaw.trim() && !parsedDob) {
      rowErrors.push(
        `Row ${rowNumber}: Invalid DoB "${dobRaw}" (use DD/MM/YYYY)`,
      );
      return;
    }

    const bloodGroup = parseBloodGroup(bloodGroupRaw);
    if (bloodGroupRaw.trim() && !bloodGroup) {
      rowErrors.push(`Row ${rowNumber}: Invalid blood group "${bloodGroupRaw}"`);
      return;
    }

    const { currentClass } = parseCombinedClassSection(classSection);
    if (!currentClass) {
      rowErrors.push(
        `Row ${rowNumber}: Invalid Class-Section "${classSection}"`,
      );
      return;
    }

    parsed.push({
      rowNumber,
      serialNumber,
      studentName,
      classSection,
      contactNum,
      altContactNumber,
      dateOfBirth: parsedDob?.toISOString(),
      bloodGroup,
    });
  });

  if (rowErrors.length > 0) {
    return { rows: [], errors: rowErrors };
  }

  return { rows: parsed, errors: [] };
}

export function parseStaffIdCardFile(
  fileName: string,
  content: string | ArrayBuffer,
): {
  rows: StaffIdCardRow[];
  errors: string[];
} {
  const { rows: rawRows, errors } = parseSpreadsheetToRowObjects(fileName, content);
  const parsed: StaffIdCardRow[] = [];
  const rowErrors = [...errors, ...validateStaffIdCardHeaders(rawRows)];

  if (rowErrors.length > 0) {
    return { rows: [], errors: rowErrors };
  }

  rawRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const defaultSerial = index + 1;
    const serialNumber = parseSerialNumber(
      getRowValue(row, SERIAL_ALIASES),
      defaultSerial,
    );
    const staffName = sanitizeImportValue(
      getRowValue(row, ["staff name", "name"]),
    );
    const role = sanitizeImportValue(
      getRowValue(row, ["role", "position", "designation"]),
    );
    const contactNumberRaw = getRowValue(row, ["contact number", "phone", "mobile"]);
    const contactNumber = sanitizeImportValue(contactNumberRaw);
    const bloodGroupRaw = getRowValue(row, ["blood group", "bloodgroup"]);

    if (!staffName) {
      rowErrors.push(`Row ${rowNumber}: Staff Name is required`);
      return;
    }

    if (contactNumberRaw.trim() && contactNumber && !isValidPhone(contactNumber)) {
      rowErrors.push(
        `Row ${rowNumber}: Contact Number must be 10–15 digits (got "${contactNumber}")`,
      );
      return;
    }

    const bloodGroup = parseBloodGroup(bloodGroupRaw);
    if (bloodGroupRaw.trim() && !bloodGroup) {
      rowErrors.push(`Row ${rowNumber}: Invalid blood group "${bloodGroupRaw}"`);
      return;
    }

    parsed.push({
      rowNumber,
      serialNumber,
      staffName,
      role,
      contactNumber,
      bloodGroup,
    });
  });

  if (rowErrors.length > 0) {
    return { rows: [], errors: rowErrors };
  }

  return { rows: parsed, errors: [] };
}

export function downloadStudentIdCardTemplate(): void {
  downloadStudentIdCardTemplateExcel();
}

export function downloadStaffIdCardTemplate(): void {
  downloadStaffIdCardTemplateExcel();
}

export function parseClassSection(value: string): {
  currentClass?: string;
  currentSection?: string;
} {
  return parseCombinedClassSection(value);
}

export function findStudentForIdCardRow(
  students: Student[],
  row: StudentIdCardRow,
): Student | undefined {
  const targetName = normalizePersonName(row.studentName);
  if (!targetName) return undefined;

  const { currentClass, currentSection } = parseCombinedClassSection(
    row.classSection,
  );

  const nameMatches = students.filter((student) =>
    personNamesMatch(row.studentName, student.fullName || ""),
  );

  if (nameMatches.length === 0) return undefined;

  const classFiltered = nameMatches.filter((student) =>
    studentClassSectionMatches(
      student.currentClass,
      student.currentSection,
      currentClass,
      currentSection,
    ),
  );

  if (classFiltered.length === 1) return classFiltered[0];
  if (classFiltered.length > 1) {
    const sectionExact = classFiltered.filter(
      (student) =>
        normalizeSectionToken(student.currentSection) ===
        normalizeSectionToken(currentSection),
    );
    if (sectionExact.length === 1) return sectionExact[0];
  }

  if (nameMatches.length === 1) return nameMatches[0];

  return undefined;
}

export function findStaffForIdCardRow(
  staffs: User[],
  row: StaffIdCardRow,
): User | undefined {
  const targetName = normalizePersonName(row.staffName);
  if (!targetName) return undefined;

  const matches = staffs.filter((staff) =>
    personNamesMatch(row.staffName, staff.name || ""),
  );

  if (matches.length === 1) return matches[0];

  if (matches.length > 1 && row.role.trim()) {
    const roleMatches = matches.filter(
      (staff) =>
        (staff.position || "").trim().toLowerCase() ===
          row.role.trim().toLowerCase() ||
        (staff.staffType === "teaching" && row.role.toLowerCase() === "teacher"),
    );
    if (roleMatches.length === 1) return roleMatches[0];
  }

  return undefined;
}

function mergeGuardianPhones(
  student: Student,
  contactNum?: string,
  altContactNumber?: string,
): Guardian[] | undefined {
  if (!contactNum && !altContactNumber) return undefined;

  const guardians = [...(student.guardians || [])];

  const upsertGuardian = (
    relationship: "father" | "mother",
    phone: string,
    fallbackName: string,
  ) => {
    const index = guardians.findIndex((g) => g.relationship === relationship);
    if (index >= 0) {
      guardians[index] = { ...guardians[index], phone };
      return;
    }

    guardians.push({
      id: `guardian-${relationship}-${student.id}`,
      relationship,
      name: fallbackName,
      phone,
      isPrimary:
        relationship === "father" &&
        !guardians.some((guardian) => guardian.isPrimary),
    });
  };

  if (contactNum) {
    upsertGuardian("father", contactNum, student.fatherName || "Father");
  }
  if (altContactNumber) {
    upsertGuardian("mother", altContactNumber, student.motherName || "Mother");
  }

  if (guardians.length > 0 && !guardians.some((guardian) => guardian.isPrimary)) {
    guardians[0] = { ...guardians[0], isPrimary: true };
  }

  return guardians;
}

export async function buildStudentIdCardUpdate(
  student: Student,
  row: StudentIdCardRow,
): Promise<StudentUpdateInput> {
  const update: StudentUpdateInput = {};
  const { currentClass, currentSection } = parseClassSection(row.classSection);

  if (currentClass) update.currentClass = currentClass;
  if (currentSection) update.currentSection = currentSection;
  if (row.bloodGroup) update.bloodGroup = row.bloodGroup;
  if (row.dateOfBirth) update.dateOfBirth = row.dateOfBirth;

  if (row.contactNum) {
    update.phone = row.contactNum;
  }
  if (row.altContactNumber) {
    update.alternatePhone = row.altContactNumber;
  }

  const guardians = mergeGuardianPhones(
    student,
    row.contactNum || undefined,
    row.altContactNumber || undefined,
  );
  if (guardians) update.guardians = guardians;

  return update;
}

export async function buildStaffIdCardUpdate(
  staff: User,
  row: StaffIdCardRow,
): Promise<UserUpdateInput> {
  const update: UserUpdateInput = {};

  if (row.role.trim()) update.position = row.role.trim();
  if (row.contactNumber.trim()) update.phoneNumber = row.contactNumber.trim();
  if (row.bloodGroup) update.bloodGroup = row.bloodGroup;

  return update;
}

export function buildStudentSerialMap(
  rows: StudentIdCardRow[],
): Map<number, StudentIdCardRow> {
  const map = new Map<number, StudentIdCardRow>();
  for (const row of rows) {
    map.set(row.serialNumber, row);
  }
  return map;
}

export function buildStaffSerialMap(
  rows: StaffIdCardRow[],
): Map<number, StaffIdCardRow> {
  const map = new Map<number, StaffIdCardRow>();
  for (const row of rows) {
    map.set(row.serialNumber, row);
  }
  return map;
}
