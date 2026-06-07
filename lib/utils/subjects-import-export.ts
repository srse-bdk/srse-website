import type {
  Subject,
  SubjectInput,
  SubjectStatus,
} from "@/lib/types/subject.type";

/**
 * CSV Headers for subject import/export
 */
export const CSV_HEADERS = ["Name", "Code", "Description", "Status"] as const;

/**
 * Convert subjects array to CSV format
 */
export function exportSubjectsToCSV(subjects: Subject[]): string {
  // Create CSV header row
  const headers = CSV_HEADERS.join(",");

  // Create CSV data rows
  const rows = subjects.map((subject) => {
    const values = [
      escapeCSVValue(subject.name || ""),
      escapeCSVValue(subject.code || ""),
      escapeCSVValue(subject.description || ""),
      escapeCSVValue(subject.status || "active"),
    ];
    return values.join(",");
  });

  // Combine header and rows
  return [headers, ...rows].join("\n");
}

/**
 * Parse CSV text to subject objects
 */
export function parseCSVToSubjects(csvText: string): {
  subjects: Partial<SubjectInput>[];
  errors: string[];
} {
  const errors: string[] = [];
  const subjects: Partial<SubjectInput>[] = [];

  // Split by lines
  const lines = csvText.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    errors.push("CSV file must contain at least a header row and one data row");
    return { subjects, errors };
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
        key.includes(fieldName.toLowerCase()),
      )?.[1];
      return index !== undefined ? (values[index] || "").trim() : "";
    };

    const name = getValue("name");
    const code = getValue("code");
    const description = getValue("description");
    const status = getValue("status");

    // Validate required fields
    const rowErrors: string[] = [];
    if (!name) {
      rowErrors.push("Name is required");
    }
    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(", ")}`);
      continue;
    }

    // Validate status
    let parsedStatus: SubjectStatus = "active";
    if (status) {
      const normalizedStatus = status.toLowerCase().trim();
      if (["active", "inactive"].includes(normalizedStatus)) {
        parsedStatus = normalizedStatus as SubjectStatus;
      } else {
        errors.push(
          `Row ${i + 1}: Invalid status. Must be one of: active, inactive`,
        );
      }
    }

    // Create subject object
    const subject: Partial<SubjectInput> = {
      name,
      code: code || undefined,
      description: description || undefined,
      status: parsedStatus,
    };

    subjects.push(subject);
  }

  return { subjects, errors };
}

/**
 * Validate subject data
 */
export function validateSubjectData(data: Partial<SubjectInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || !data.name.trim()) {
    errors.push("Name is required");
  }

  if (data.status && !["active", "inactive"].includes(data.status)) {
    errors.push("Invalid status. Must be one of: active, inactive");
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
    "Mathematics",
    "MATH",
    "Basic mathematics course",
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
