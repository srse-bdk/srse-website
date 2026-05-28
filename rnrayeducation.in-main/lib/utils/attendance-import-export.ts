import type {
  StudentAttendance,
  StudentAttendanceInput,
  StudentAttendanceStatus,
} from "@/lib/types/student-attendance.type";

/**
 * CSV Headers for attendance import/export
 */
export const CSV_HEADERS = [
  "Student ID",
  "Enrollment ID",
  "Class ID",
  "Section",
  "Date",
  "Status",
  "Notes",
] as const;

/**
 * Convert attendance array to CSV format
 */
export function exportAttendanceToCSV(attendance: StudentAttendance[]): string {
  // Create CSV header row
  const headers = CSV_HEADERS.join(",");

  // Create CSV data rows
  const rows = attendance.map((record) => {
    const values = [
      escapeCSVValue(record.studentId || ""),
      escapeCSVValue(record.enrollmentId || ""),
      escapeCSVValue(record.classId || ""),
      escapeCSVValue(record.section || ""),
      escapeCSVValue(record.date || ""),
      escapeCSVValue(record.status || "present"),
      escapeCSVValue(record.notes || ""),
    ];
    return values.join(",");
  });

  // Combine header and rows
  return [headers, ...rows].join("\n");
}

/**
 * Parse CSV text to attendance objects
 */
export function parseCSVToAttendance(csvText: string): {
  attendance: Partial<StudentAttendanceInput>[];
  errors: string[];
} {
  const errors: string[] = [];
  const attendance: Partial<StudentAttendanceInput>[] = [];

  // Split by lines
  const lines = csvText.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    errors.push("CSV file must contain at least a header row and one data row");
    return { attendance, errors };
  }

  // Parse header row
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Validate headers
  const expectedHeaders = CSV_HEADERS.map((h) => h.toLowerCase());
  const actualHeaders = headers.map((h) => h.toLowerCase().trim());

  // Check if all required headers are present (flexible matching)
  const missingHeaders: string[] = [];
  expectedHeaders.forEach((expected) => {
    if (
      !actualHeaders.some((actual) => actual.includes(expected.toLowerCase()))
    ) {
      missingHeaders.push(expected);
    }
  });

  if (missingHeaders.length > 0) {
    errors.push(`Missing required headers: ${missingHeaders.join(", ")}`);
  }

  // Create header index map
  const headerMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    const normalized = header.toLowerCase().trim();
    headerMap[normalized] = index;
  });

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = parseCSVLine(line);

    // Find indices for each field (flexible matching)
    const getValue = (fieldName: string): string => {
      const index = Object.entries(headerMap).find(([key]) =>
        key.includes(fieldName.toLowerCase())
      )?.[1];
      return index !== undefined ? (values[index] || "").trim() : "";
    };

    const studentId = getValue("student id");
    const enrollmentId = getValue("enrollment id");
    const classId = getValue("class id");
    const section = getValue("section");
    const date = getValue("date");
    const status = getValue("status");
    const notes = getValue("notes");

    // Validate required fields
    const rowErrors: string[] = [];
    if (!studentId) {
      rowErrors.push("Student ID is required");
    }
    if (!enrollmentId) {
      rowErrors.push("Enrollment ID is required");
    }
    if (!classId) {
      rowErrors.push("Class ID is required");
    }
    if (!section) {
      rowErrors.push("Section is required");
    }
    if (!date) {
      rowErrors.push("Date is required");
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(", ")}`);
      continue;
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      errors.push(
        `Row ${i + 1}: Invalid date format. Expected YYYY-MM-DD format`
      );
      continue;
    }

    // Validate status
    let parsedStatus: StudentAttendanceStatus = "present";
    if (status) {
      const normalizedStatus = status.toLowerCase().trim();
      if (["present", "absent", "late"].includes(normalizedStatus)) {
        parsedStatus = normalizedStatus as StudentAttendanceStatus;
      } else {
        errors.push(
          `Row ${i + 1}: Invalid status. Must be one of: present, absent, late`
        );
      }
    }

    // Create attendance object
    const attendanceRecord: Partial<StudentAttendanceInput> = {
      studentId,
      enrollmentId,
      classId,
      section,
      date,
      status: parsedStatus,
      notes: notes || undefined,
    };

    attendance.push(attendanceRecord);
  }

  return { attendance, errors };
}

/**
 * Validate attendance data
 */
export function validateAttendanceData(data: Partial<StudentAttendanceInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.studentId || !data.studentId.trim()) {
    errors.push("Student ID is required");
  }

  if (!data.enrollmentId || !data.enrollmentId.trim()) {
    errors.push("Enrollment ID is required");
  }

  if (!data.classId || !data.classId.trim()) {
    errors.push("Class ID is required");
  }

  if (!data.section || !data.section.trim()) {
    errors.push("Section is required");
  }

  if (!data.date || !data.date.trim()) {
    errors.push("Date is required");
  } else {
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.date)) {
      errors.push("Invalid date format. Expected YYYY-MM-DD format");
    }
  }

  if (data.status && !["present", "absent", "late"].includes(data.status)) {
    errors.push("Invalid status. Must be one of: present, absent, late");
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
    "student-id-1",
    "enrollment-id-1",
    "class-id-1",
    "A",
    "2024-01-15",
    "present",
    "On time",
  ].join(",");

  return [headers, exampleRow].join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for UTF-8 to ensure Excel opens it correctly
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

// Helper functions

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  if (!value) return "";

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

/**
 * Parse CSV line (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      // End of value
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  // Add last value
  values.push(current);

  return values;
}
