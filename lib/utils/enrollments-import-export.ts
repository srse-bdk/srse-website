import type {
  Enrollment,
  EnrollmentInput,
  EnrollmentStatus,
} from "@/lib/types/enrollment.type";

/**
 * CSV Headers for enrollment import/export
 */
export const CSV_HEADERS = [
  "Student ID",
  "Class ID",
  "Section",
  "Roll Number",
  "Academic Year",
  "Enrollment Date",
  "Status",
] as const;

/**
 * Convert enrollments array to CSV format
 */
export function exportEnrollmentsToCSV(enrollments: Enrollment[]): string {
  // Create CSV header row
  const headers = CSV_HEADERS.join(",");

  // Create CSV data rows
  const rows = enrollments.map((enrollment) => {
    const values = [
      escapeCSVValue(enrollment.studentId || ""),
      escapeCSVValue(enrollment.classId || ""),
      escapeCSVValue(enrollment.section || ""),
      escapeCSVValue(enrollment.rollNumber || ""),
      escapeCSVValue(enrollment.academicYear || ""),
      escapeCSVValue(
        enrollment.enrollmentDate
          ? new Date(enrollment.enrollmentDate).toLocaleDateString()
          : ""
      ),
      escapeCSVValue(enrollment.status || "active"),
    ];
    return values.join(",");
  });

  // Combine header and rows
  return [headers, ...rows].join("\n");
}

/**
 * Parse CSV text to enrollment objects
 */
export function parseCSVToEnrollments(csvText: string): {
  enrollments: Partial<EnrollmentInput>[];
  errors: string[];
} {
  const errors: string[] = [];
  const enrollments: Partial<EnrollmentInput>[] = [];

  // Split by lines
  const lines = csvText.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    errors.push("CSV file must contain at least a header row and one data row");
    return { enrollments, errors };
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
    const classId = getValue("class id");
    const section = getValue("section");
    const rollNumber = getValue("roll number");
    const academicYear = getValue("academic year");
    const enrollmentDate = getValue("enrollment date");
    const status = getValue("status");

    // Validate required fields
    const rowErrors: string[] = [];
    if (!studentId) {
      rowErrors.push("Student ID is required");
    }
    if (!classId) {
      rowErrors.push("Class ID is required");
    }
    if (!section) {
      rowErrors.push("Section is required");
    }
    if (!rollNumber) {
      rowErrors.push("Roll Number is required");
    }
    if (!academicYear) {
      rowErrors.push("Academic Year is required");
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(", ")}`);
      continue;
    }

    // Parse enrollment date
    let parsedEnrollmentDate: string | undefined;
    if (enrollmentDate) {
      const date = parseDate(enrollmentDate);
      if (date) {
        parsedEnrollmentDate = date.toISOString();
      } else {
        errors.push(`Row ${i + 1}: Invalid date format for Enrollment Date`);
      }
    }

    // Validate status
    let parsedStatus: EnrollmentStatus = "active";
    if (status) {
      const normalizedStatus = status.toLowerCase().trim();
      if (
        ["active", "transferred", "promoted", "withdrawn"].includes(
          normalizedStatus
        )
      ) {
        parsedStatus = normalizedStatus as EnrollmentStatus;
      } else {
        errors.push(
          `Row ${i + 1
          }: Invalid status. Must be one of: active, transferred, promoted, withdrawn`
        );
      }
    }

    // Create enrollment object
    const enrollment: Partial<EnrollmentInput> = {
      studentId,
      classId,
      section,
      rollNumber,
      academicYear,
      enrollmentDate: parsedEnrollmentDate,
      status: parsedStatus,
    };

    enrollments.push(enrollment);
  }

  return { enrollments, errors };
}

/**
 * Validate enrollment data
 */
export function validateEnrollmentData(data: Partial<EnrollmentInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.studentId || !data.studentId.trim()) {
    errors.push("Student ID is required");
  }

  if (!data.classId || !data.classId.trim()) {
    errors.push("Class ID is required");
  }

  if (!data.section || !data.section.trim()) {
    errors.push("Section is required");
  }

  if (!data.rollNumber || !data.rollNumber.trim()) {
    errors.push("Roll Number is required");
  }

  if (!data.academicYear || !data.academicYear.trim()) {
    errors.push("Academic Year is required");
  }

  if (data.enrollmentDate) {
    const date = new Date(data.enrollmentDate);
    if (Number.isNaN(date.getTime())) {
      errors.push("Invalid enrollment date format");
    }
  }

  if (
    data.status &&
    !["active", "transferred", "promoted", "withdrawn"].includes(data.status)
  ) {
    errors.push(
      "Invalid status. Must be one of: active, transferred, promoted, withdrawn"
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
    "student-id-1",
    "class-id-1",
    "A",
    "1",
    "2024-25",
    "01/15/2024",
    "active",
  ].join(",");

  return [headers, exampleRow].join("\n");
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Add BOM for UTF-8 to ensure Excel opens it correctly
  const BOM = "\uFEFF";
  // Use application/octet-stream to force browser to download the file instead of opening it
  const blob = new Blob([BOM + csvContent], {
    type: "application/octet-stream",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
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

/**
 * Parse date string to Date object (handles multiple formats)
 */
function parseDate(dateString: string): Date | null {
  if (!dateString) return null;

  // Try ISO format first
  let date = new Date(dateString);
  if (!Number.isNaN(date.getTime())) {
    return date;
  }

  // Try MM/DD/YYYY format
  const parts = dateString.split(/[\/\-]/);
  if (parts.length === 3) {
    const month = parseInt(parts[0], 10) - 1;
    const day = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    if (!Number.isNaN(month) && !Number.isNaN(day) && !Number.isNaN(year)) {
      date = new Date(year, month, day);
      if (!Number.isNaN(date.getTime())) {
        return date;
      }
    }
  }

  return null;
}
