import type { Class, ClassInput, ClassStatus } from "@/lib/types/class.type";

/**
 * CSV Headers for class import/export
 */
export const CSV_HEADERS = [
  "Name",
  "Description",
  "Sections",
  "Capacity Per Section",
  "Academic Year",
  "Status",
  "Order",
] as const;

/**
 * Convert classes array to CSV format
 */
export function exportClassesToCSV(classes: Class[]): string {
  // Create CSV header row
  const headers = CSV_HEADERS.join(",");

  // Create CSV data rows
  const rows = classes.map((classItem) => {
    const values = [
      escapeCSVValue(classItem.name || ""),
      escapeCSVValue(classItem.description || ""),
      escapeCSVValue(classItem.sections.join(";") || ""),
      escapeCSVValue(String(classItem.capacityPerSection || 0)),
      escapeCSVValue(classItem.academicYear || ""),
      escapeCSVValue(classItem.status || "active"),
      escapeCSVValue(classItem.order ? String(classItem.order) : ""),
    ];
    return values.join(",");
  });

  // Combine header and rows
  return [headers, ...rows].join("\n");
}

/**
 * Parse CSV text to class objects
 */
export function parseCSVToClasses(csvText: string): {
  classes: Partial<ClassInput>[];
  errors: string[];
} {
  const errors: string[] = [];
  const classes: Partial<ClassInput>[] = [];

  // Split by lines
  const lines = csvText.split("\n").filter((line) => line.trim());

  if (lines.length < 2) {
    errors.push("CSV file must contain at least a header row and one data row");
    return { classes, errors };
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

    const name = getValue("name");
    const description = getValue("description");
    const sectionsStr = getValue("sections");
    const capacityStr = getValue("capacity per section");
    const academicYear = getValue("academic year");
    const status = getValue("status");
    const orderStr = getValue("order");

    // Validate required fields
    const rowErrors: string[] = [];
    if (!name) {
      rowErrors.push("Name is required");
    }
    if (!sectionsStr) {
      rowErrors.push("Sections is required");
    }
    if (!capacityStr) {
      rowErrors.push("Capacity Per Section is required");
    }
    if (!academicYear) {
      rowErrors.push("Academic Year is required");
    }

    if (rowErrors.length > 0) {
      errors.push(`Row ${i + 1}: ${rowErrors.join(", ")}`);
      continue;
    }

    // Parse sections (semicolon-separated)
    const sections = sectionsStr
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (sections.length === 0) {
      errors.push(`Row ${i + 1}: At least one section is required`);
      continue;
    }

    // Parse capacity
    const capacity = parseInt(capacityStr, 10);
    if (Number.isNaN(capacity) || capacity <= 0) {
      errors.push(
        `Row ${i + 1}: Capacity Per Section must be a positive number`
      );
      continue;
    }

    // Validate status
    let parsedStatus: ClassStatus = "active";
    if (status) {
      const normalizedStatus = status.toLowerCase().trim();
      if (["active", "inactive"].includes(normalizedStatus)) {
        parsedStatus = normalizedStatus as ClassStatus;
      } else {
        errors.push(
          `Row ${i + 1}: Invalid status. Must be one of: active, inactive`
        );
      }
    }

    // Parse order (optional)
    let order: number | undefined;
    if (orderStr) {
      const parsedOrder = parseInt(orderStr, 10);
      if (!Number.isNaN(parsedOrder)) {
        order = parsedOrder;
      }
    }

    // Create class object
    const classItem: Partial<ClassInput> = {
      name,
      description: description || undefined,
      sections,
      capacityPerSection: capacity,
      academicYear,
      status: parsedStatus,
      order,
    };

    classes.push(classItem);
  }

  return { classes, errors };
}

/**
 * Validate class data
 */
export function validateClassData(data: Partial<ClassInput>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || !data.name.trim()) {
    errors.push("Name is required");
  }

  if (!data.sections || data.sections.length === 0) {
    errors.push("At least one section is required");
  }

  if (!data.capacityPerSection || data.capacityPerSection <= 0) {
    errors.push("Capacity Per Section must be greater than 0");
  }

  if (!data.academicYear || !data.academicYear.trim()) {
    errors.push("Academic Year is required");
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
    "Class 1",
    "First Grade",
    "A;B;C",
    "30",
    "2024-25",
    "active",
    "1",
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
