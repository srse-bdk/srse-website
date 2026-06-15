import type {
  Gender,
  Student,
  StudentInput,
  StudentStatus,
} from "@/lib/types/student.type";
import { normalizePersonName } from "@/lib/utils/class-section-match";
import { parsePenFromImport } from "@/lib/utils/student-login";
import { sanitizeImportValue } from "@/lib/utils/import-values";
import { sortStudentsByClassSectionRoll } from "@/lib/utils/student-roll-number";
import * as XLSX from "xlsx";

/**
 * CSV Headers for student import/export template
 */
export const CSV_HEADERS = [
  "Scan ID",
  "Full Name",
  "Admission Number",
  "Email",
  "Phone",
  "Gender",
  "Date of Birth",
  "Status",
  "Class",
  "Section",
  "Student PEN",
  "Father Name",
  "Mother Name",
  "Social Category",
] as const;

const HEADER_ALIASES = {
  scanId: ["scan id", "scanid", "id card id", "card id", "qr id"],
  fullName: [
    "full name",
    "student name",
    "name",
    "student full name",
    "name as per aadhaar",
  ],
  admissionNumber: ["admission number", "admission no", "adm no", "adm"],
  email: ["email", "mail"],
  phone: ["phone", "mobile", "contact number"],
  gender: ["gender", "sex"],
  dateOfBirth: ["date of birth", "dob", "birth date"],
  status: ["status", "entry status"],
  currentClass: ["class", "class name", "grade", "std", "standard"],
  currentSection: ["section", "sec"],
  pen: ["student pen", "pen", "student pen number"],
  fatherName: ["father name", "father"],
  motherName: ["mother name", "mother"],
  socialCategory: ["social category", "category"],
  aadhaarName: ["name as per aadhaar", "name on aadhaar", "aadhaar name"],
} as const;

type RowObject = Record<string, string>;

/**
 * Convert students array to CSV format
 */
export function exportStudentsToCSV(students: Student[]): string {
  const headers = CSV_HEADERS.join(",");
  const rows = sortStudentsByClassSectionRoll(students).map((student) => {
    const values = [
      escapeCSVValue(student.scanId || ""),
      escapeCSVValue(student.fullName || ""),
      escapeCSVValue(student.admissionNumber || ""),
      escapeCSVValue(student.email || ""),
      escapeCSVValue(student.phone || ""),
      escapeCSVValue(student.gender || ""),
      escapeCSVValue(
        student.dateOfBirth
          ? new Date(student.dateOfBirth).toLocaleDateString()
          : "",
      ),
      escapeCSVValue(student.status || "active"),
      escapeCSVValue(student.currentClass || ""),
      escapeCSVValue(student.currentSection || ""),
      escapeCSVValue(student.pen || ""),
      escapeCSVValue(student.fatherName || ""),
      escapeCSVValue(student.motherName || ""),
      escapeCSVValue(student.socialCategory || ""),
    ];
    return values.join(",");
  });

  return [headers, ...rows].join("\n");
}

/**
 * Parse a students file (CSV or Excel)
 */
export function parseStudentsFile(
  fileName: string,
  content: string | ArrayBuffer,
): { students: Partial<StudentInput>[]; errors: string[] } {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    if (!(content instanceof ArrayBuffer)) {
      return {
        students: [],
        errors: ["Excel file content is invalid"],
      };
    }

    return parseExcelToStudents(content);
  }

  if (typeof content !== "string") {
    return {
      students: [],
      errors: ["CSV file content is invalid"],
    };
  }

  return parseCSVToStudents(content);
}

/**
 * Parse CSV text to student objects
 */
export function parseCSVToStudents(csvText: string): {
  students: Partial<StudentInput>[];
  errors: string[];
} {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim());

  if (lines.length < 2) {
    return {
      students: [],
      errors: ["CSV file must contain at least one data row"],
    };
  }

  const headers = parseCSVLine(lines[0]).map((h) => h.trim());
  const rows: RowObject[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: RowObject = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || "").trim();
    });
    rows.push(row);
  }

  return parseRowsToStudents(rows, 2);
}

function parseExcelToStudents(fileContent: ArrayBuffer): {
  students: Partial<StudentInput>[];
  errors: string[];
} {
  try {
    const workbook = XLSX.read(fileContent, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return { students: [], errors: ["Excel file has no sheets"] };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const sheetRows = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: false,
      },
    );

    const rows = sheetRows.map((row) =>
      row.map((cell) => String(cell ?? "").trim()),
    );

    const headerRowIndex = findHeaderRowIndex(rows);

    // Preferred path: detected a real header row.
    if (headerRowIndex !== -1) {
      const headers = rows[headerRowIndex] || [];
      const dataRows = rows.slice(headerRowIndex + 1);

      const mappedRows: RowObject[] = dataRows
        .filter((row) => row.some((cell) => cell.trim()))
        .map((row) => {
          const mapped: RowObject = {};
          const width = Math.max(headers.length, row.length);
          for (let i = 0; i < width; i++) {
            const header = headers[i] || `__EMPTY_${i}`;
            mapped[header] = (row[i] || "").trim();
          }
          return mapped;
        });

      return parseRowsToStudents(mappedRows, headerRowIndex + 2);
    }

    // Fallback path: SDMS exports with title rows and no readable header row.
    const positionalRows: RowObject[] = rows
      .filter((row) => row.some((cell) => cell.trim()))
      .map((row) => ({
        class: row[0] || "",
        section: row[1] || "",
        "full name": row[2] || "",
        gender: row[3] || "",
        "student pen": row[5] || row[6] || "",
        "father name": row[7] || "",
        "mother name": row[8] || "",
        "social category": row[9] || "",
        "entry status": row[15] || "",
      }))
      .filter((row) => {
        const name = (row["full name"] || "").trim().toLowerCase();
        const cls = (row.class || "").trim().toLowerCase();
        return (
          name &&
          name !== "student name" &&
          !name.includes("list of all students") &&
          cls !== "class"
        );
      });

    return parseRowsToStudents(positionalRows, 1);
  } catch (error) {
    return {
      students: [],
      errors: [
        `Failed to parse Excel file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      ],
    };
  }
}

function findHeaderRowIndex(rows: string[][]): number {
  const aliasPool = new Set(
    Object.values(HEADER_ALIASES)
      .flat()
      .map((alias) => normalizeHeader(alias)),
  );

  let bestIndex = -1;
  let bestScore = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const normalizedCells = row
      .map((cell) => normalizeHeader(cell))
      .filter((cell) => cell.length > 0);

    if (normalizedCells.length === 0) continue;

    let score = 0;
    for (const cell of normalizedCells) {
      const matched = Array.from(aliasPool).some(
        (alias) => cell === alias || cell.includes(alias) || alias.includes(cell),
      );
      if (matched) score++;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  // Require at least 3 matching header-like cells to trust it as header row.
  return bestScore >= 3 ? bestIndex : -1;
}

function parseRowsToStudents(
  rows: RowObject[],
  rowNumberOffset: number,
): {
  students: Partial<StudentInput>[];
  errors: string[];
} {
  const students: Partial<StudentInput>[] = [];
  const errors: string[] = [];

  if (rows.length === 0) {
    return { students, errors: ["No student rows found in file"] };
  }

  rows.forEach((row, index) => {
    const rowNumber = rowNumberOffset + index;
    const fullName =
      sanitizeImportValue(getRowValue(row, HEADER_ALIASES.fullName)) ||
      sanitizeImportValue(getRowValue(row, HEADER_ALIASES.aadhaarName));
    const scanId = sanitizeImportValue(getRowValue(row, HEADER_ALIASES.scanId));
    const pen = parsePenFromImport(getRowValue(row, HEADER_ALIASES.pen));
    const admissionFromSheet = sanitizeImportValue(
      getRowValue(row, HEADER_ALIASES.admissionNumber),
    );
    const admissionNumber =
      admissionFromSheet ||
      pen ||
      scanId ||
      `ADM-${String(rowNumber).padStart(4, "0")}`;
    const gender = normalizeGender(getRowValue(row, HEADER_ALIASES.gender));
    const currentClass = normalizeClassName(
      getRowValue(row, HEADER_ALIASES.currentClass),
    );
    const currentSection = normalizeSection(
      getRowValue(row, HEADER_ALIASES.currentSection),
    );
    const fatherName = sanitizeImportValue(
      getRowValue(row, HEADER_ALIASES.fatherName),
    );
    const motherName = sanitizeImportValue(
      getRowValue(row, HEADER_ALIASES.motherName),
    );
    const socialCategoryRaw = getRowValue(row, HEADER_ALIASES.socialCategory);
    const socialCategoryInfo = parseSocialCategory(socialCategoryRaw);

    if (!fullName) {
      errors.push(`Row ${rowNumber}: Student name is required`);
      return;
    }

    const { firstName, lastName } = splitName(fullName);
    const dateOfBirthRaw = getRowValue(row, HEADER_ALIASES.dateOfBirth);
    const parsedDob = parseDate(dateOfBirthRaw);
    const statusRaw = getRowValue(row, HEADER_ALIASES.status);
    const status = normalizeStatus(statusRaw);
    const email = getRowValue(row, HEADER_ALIASES.email) || undefined;
    const phone = getRowValue(row, HEADER_ALIASES.phone) || undefined;

    if (dateOfBirthRaw && !parsedDob) {
      errors.push(`Row ${rowNumber}: Invalid date format for Date of Birth`);
    }

    const guardians: StudentInput["guardians"] = [];
    if (fatherName) {
      guardians.push({
        id: `guardian-father-${rowNumber}`,
        relationship: "father",
        name: fatherName,
        phone: "",
        isPrimary: true,
      });
    }
    if (motherName) {
      guardians.push({
        id: `guardian-mother-${rowNumber}`,
        relationship: "mother",
        name: motherName,
        phone: "",
        isPrimary: guardians.length === 0,
      });
    }

    const student: Partial<StudentInput> = {
      scanId: scanId || undefined,
      firstName,
      lastName,
      admissionNumber,
      email,
      phone,
      gender,
      dateOfBirth: parsedDob ? parsedDob.toISOString() : undefined,
      status,
      currentClass,
      currentSection,
      pen: pen || undefined,
      fatherName: fatherName || undefined,
      motherName: motherName || undefined,
      socialCategory: socialCategoryInfo.socialCategory,
      socialCategoryCode: socialCategoryInfo.socialCategoryCode,
      address: {
        street: "",
        city: "",
        state: "",
        pincode: "",
      },
      guardians,
    };

    students.push(student);
  });

  return { students, errors };
}

/**
 * Validate student data
 */
export function validateStudentData(data: Partial<StudentInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.firstName || !data.firstName.trim()) {
    errors.push("First name is required");
  }

  if (!data.lastName || !data.lastName.trim()) {
    errors.push("Last name is required");
  }

  if (!data.admissionNumber || !data.admissionNumber.trim()) {
    errors.push("Admission number is required");
  }

  if (data.email && !isValidEmail(data.email)) {
    errors.push("Invalid email format");
  }

  if (data.dateOfBirth) {
    const date = new Date(data.dateOfBirth);
    if (Number.isNaN(date.getTime())) {
      errors.push("Invalid date of birth format");
    }
  }

  if (data.gender && !["male", "female", "other"].includes(data.gender)) {
    errors.push("Invalid gender. Must be one of: male, female, other");
  }

  if (
    data.status &&
    !["active", "inactive", "graduated", "transferred"].includes(data.status)
  ) {
    errors.push(
      "Invalid status. Must be one of: active, inactive, graduated, transferred",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate CSV template for download
 */
export function generateCSVTemplate(): string {
  const headers = CSV_HEADERS.join(",");
  const exampleRow = [
    "STU-7F2K9Q8M",
    "John Doe",
    "ADM-2025-001",
    "",
    "9876543210",
    "male",
    "01/15/2010",
    "active",
    "I",
    "A",
    "2109009952",
    "Rajesh Kumar",
    "Anita Devi",
    "1-GENERAL",
  ].join(",");

  return [headers, exampleRow].join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function getRowValue(row: RowObject, aliases: readonly string[]): string {
  const normalizedAliases = aliases.map(normalizeHeader);
  const entries = Object.entries(row).map(([key, value]) => [
    key.toLowerCase().trim(),
    value,
  ] as const);

  // Exact normalized key match first
  for (const [key, value] of entries) {
    if (normalizedAliases.includes(normalizeHeader(key))) {
      return value?.trim() || "";
    }
  }

  // Then fallback to fuzzy contains
  for (const [key, value] of entries) {
    const normalizedKey = normalizeHeader(key);
    const matched = normalizedAliases.some(
      (alias) => normalizedKey.includes(alias) || alias.includes(normalizedKey),
    );
    if (matched) return value?.trim() || "";
  }

  return "";
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const cleanName = fullName.trim().replace(/\s+/g, " ");
  const nameParts = cleanName.split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || ".";
  return { firstName, lastName };
}

function normalizeGender(rawGender: string): Gender | undefined {
  if (!rawGender) return undefined;
  const normalized = rawGender.toLowerCase().trim();
  if (["male", "m", "boy"].includes(normalized)) return "male";
  if (["female", "f", "girl"].includes(normalized)) return "female";
  if (["other", "o"].includes(normalized)) return "other";
  return undefined;
}

function normalizeStatus(rawStatus: string): StudentStatus {
  const normalizedStatus = rawStatus.toLowerCase().trim();
  if (
    ["active", "inactive", "graduated", "transferred"].includes(
      normalizedStatus,
    )
  ) {
    return normalizedStatus as StudentStatus;
  }

  return "active";
}

function normalizeClassName(rawClass: string): string | undefined {
  if (!rawClass) return undefined;
  const value = rawClass.trim();
  if (!value) return undefined;

  // SDMS format e.g. Nursery/KG/PP3 => Nursery
  const primaryToken = value.includes("/") ? value.split("/")[0].trim() : value;
  const upper = primaryToken.toUpperCase();

  if (upper === "NURSERY") return "Nursery";
  if (upper === "LKG") return "LKG";
  if (upper === "UKG") return "UKG";
  if (/^[IVXLCDM]+$/i.test(primaryToken)) return upper;

  return primaryToken;
}

function normalizeSection(rawSection: string): string | undefined {
  if (!rawSection) return undefined;
  const value = rawSection.trim().toUpperCase();
  if (!value) return undefined;
  return value.split(/\s+/)[0];
}

function parseSocialCategory(raw: string): {
  socialCategory?: string;
  socialCategoryCode?: number;
} {
  if (!raw) return {};

  const value = raw.trim();
  const match = value.match(/^(\d+)\s*[-:)\]]\s*(.+)$/);

  if (match) {
    const code = Number.parseInt(match[1], 10);
    const label = match[2]?.trim().toLowerCase();
    return {
      socialCategory: label || undefined,
      socialCategoryCode: Number.isNaN(code) ? undefined : code,
    };
  }

  const onlyNumber = Number.parseInt(value, 10);
  if (!Number.isNaN(onlyNumber) && String(onlyNumber) === value) {
    return { socialCategoryCode: onlyNumber };
  }

  return { socialCategory: value.toLowerCase() };
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (!value) return "";

  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Parse CSV line (handles quoted values)
 */
export function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);

  return values;
}

/**
 * Parse date string to Date object (handles multiple formats)
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null;

  let date = new Date(dateString);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  const parts = dateString.split(/[\/\-]/);
  if (parts.length === 3) {
    const month = Number.parseInt(parts[0], 10) - 1;
    const day = Number.parseInt(parts[1], 10);
    const year = Number.parseInt(parts[2], 10);

    if (!Number.isNaN(month) && !Number.isNaN(day) && !Number.isNaN(year)) {
      date = new Date(year, month, day);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export interface StudentImportMatchIndexes {
  byPen: Map<string, string>;
  byAdmission: Map<string, string>;
  byScanId: Map<string, string>;
  byNameClassSection: Map<string, string>;
}

function getStudentFullName(student: Partial<StudentInput> | Student): string {
  if ("fullName" in student && student.fullName?.trim()) {
    return student.fullName.trim();
  }
  return `${student.firstName || ""} ${student.lastName || ""}`.trim();
}

function getNameClassSectionKey(student: Partial<StudentInput> | Student): string | null {
  const fullName = getStudentFullName(student);
  const nameKey = normalizePersonName(fullName);
  const classKey = normalizeClassName(student.currentClass || "");
  const sectionKey = normalizeSection(student.currentSection || "");
  if (!nameKey || !classKey || !sectionKey) return null;
  return `${nameKey}|${classKey.toLowerCase()}|${sectionKey}`;
}

export function buildStudentImportMatchIndexes(
  students: Student[],
): StudentImportMatchIndexes {
  const indexes: StudentImportMatchIndexes = {
    byPen: new Map(),
    byAdmission: new Map(),
    byScanId: new Map(),
    byNameClassSection: new Map(),
  };

  for (const student of students) {
    registerStudentInImportIndexes(student.id, student, indexes);
  }

  return indexes;
}

export function registerStudentInImportIndexes(
  studentId: string,
  student: Partial<StudentInput> | Student,
  indexes: StudentImportMatchIndexes,
): void {
  const penKey = parsePenFromImport(student.pen || "");
  if (penKey) indexes.byPen.set(penKey, studentId);

  const admissionKey = (student.admissionNumber || "").trim().toLowerCase();
  if (admissionKey) indexes.byAdmission.set(admissionKey, studentId);

  const scanKey = (student.scanId || "").trim().toUpperCase();
  if (scanKey) indexes.byScanId.set(scanKey, studentId);

  const nameClassSectionKey = getNameClassSectionKey(student);
  if (nameClassSectionKey) {
    indexes.byNameClassSection.set(nameClassSectionKey, studentId);
  }
}

export type StudentDuplicateMatchReason =
  | "pen"
  | "admission"
  | "scanId"
  | "nameClassSection";

export function findDuplicateStudentMatch(
  student: Partial<StudentInput>,
  indexes: StudentImportMatchIndexes,
): { studentId: string; reason: StudentDuplicateMatchReason } | null {
  const penKey = parsePenFromImport(student.pen || "");
  if (penKey) {
    const byPen = indexes.byPen.get(penKey);
    if (byPen) return { studentId: byPen, reason: "pen" };
  }

  const admissionKey = (student.admissionNumber || "").trim().toLowerCase();
  if (admissionKey) {
    const byAdmission = indexes.byAdmission.get(admissionKey);
    if (byAdmission) return { studentId: byAdmission, reason: "admission" };
  }

  const scanKey = (student.scanId || "").trim().toUpperCase();
  if (scanKey) {
    const byScanId = indexes.byScanId.get(scanKey);
    if (byScanId) return { studentId: byScanId, reason: "scanId" };
  }

  const nameClassSectionKey = getNameClassSectionKey(student);
  if (nameClassSectionKey) {
    const byNameClassSection = indexes.byNameClassSection.get(nameClassSectionKey);
    if (byNameClassSection) {
      return { studentId: byNameClassSection, reason: "nameClassSection" };
    }
  }

  return null;
}

export function findExistingStudentIdForImport(
  student: Partial<StudentInput>,
  indexes: StudentImportMatchIndexes,
): string | undefined {
  return findDuplicateStudentMatch(student, indexes)?.studentId;
}
