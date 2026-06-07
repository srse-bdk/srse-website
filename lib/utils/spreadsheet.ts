import * as XLSX from "xlsx";
import { parseCSVLine } from "@/lib/utils/students-import-export";

export function downloadExcelSheet(
  headers: string[],
  rows: string[][],
  filename: string,
  sheetName = "Sheet1",
): void {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

export function parseSpreadsheetToRowObjects(
  fileName: string,
  content: string | ArrayBuffer,
): { rows: Record<string, string>[]; errors: string[] } {
  const lowerName = fileName.toLowerCase();

  if (lowerName.endsWith(".csv")) {
    return parseCsvToRowObjects(content);
  }

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls")) {
    return parseExcelToRowObjects(content);
  }

  return {
    rows: [],
    errors: ["Unsupported file type. Please use .xlsx, .xls, or .csv"],
  };
}

function parseCsvToRowObjects(content: string | ArrayBuffer): {
  rows: Record<string, string>[];
  errors: string[];
} {
  if (typeof content !== "string") {
    return { rows: [], errors: ["Invalid CSV content"] };
  }

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim());

  if (lines.length < 2) {
    return {
      rows: [],
      errors: ["File must contain a header row and one data row"],
    };
  }

  const headers = parseCSVLine(lines[0]).map((header) => header.trim());
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });
    if (Object.values(row).some((value) => value.trim())) {
      rows.push(row);
    }
  }

  return { rows, errors: [] };
}

function parseExcelToRowObjects(content: string | ArrayBuffer): {
  rows: Record<string, string>[];
  errors: string[];
} {
  if (!(content instanceof ArrayBuffer)) {
    return { rows: [], errors: ["Invalid Excel content"] };
  }

  try {
    const workbook = XLSX.read(content, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { rows: [], errors: ["Excel file has no sheets"] };
    }

    const worksheet = workbook.Sheets[sheetName];
    const sheetRows = XLSX.utils.sheet_to_json<(string | number | boolean)[]>(
      worksheet,
      {
        header: 1,
        defval: "",
        raw: false,
      },
    );

    const matrix = sheetRows.map((row) =>
      row.map((cell) => String(cell ?? "").trim()),
    );

    const headerRowIndex = matrix.findIndex((row) =>
      row.some((cell) => cell.trim().length > 0),
    );

    if (headerRowIndex === -1) {
      return { rows: [], errors: ["Excel file has no header row"] };
    }

    const headers = matrix[headerRowIndex] || [];
    const dataRows = matrix.slice(headerRowIndex + 1);
    const rows: Record<string, string>[] = dataRows
      .filter((row) => row.some((cell) => cell.trim()))
      .map((row) => {
        const mapped: Record<string, string> = {};
        const width = Math.max(headers.length, row.length);
        for (let i = 0; i < width; i++) {
          const header = headers[i] || `Column ${i + 1}`;
          mapped[header] = (row[i] || "").trim();
        }
        return mapped;
      });

    return { rows, errors: [] };
  } catch (error) {
    return {
      rows: [],
      errors: [
        `Failed to parse Excel file: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      ],
    };
  }
}
