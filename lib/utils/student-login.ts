/** Indian student PEN (Permanent Education Number) is 10–11 digits. */
export const STUDENT_PEN_MIN_DIGITS = 10;
export const STUDENT_PEN_MAX_DIGITS = 11;

export function normalizePen(pen: string): string {
  const trimmed = pen.replace(/\s+/g, "").trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  if (upper === "NA" || upper === "N/A" || upper === "N-A") {
    return "";
  }

  return trimmed;
}

/** Extract digits only; handles Excel scientific notation (e.g. 2.10901E+09). */
export function extractPenDigits(value: string): string {
  const normalized = normalizePen(value);
  if (!normalized) return "";

  if (/^\d+(\.\d+)?[eE][+\-]?\d+$/.test(normalized)) {
    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) {
      return String(Math.round(numeric));
    }
  }

  if (/^\d+\.0+$/.test(normalized)) {
    return normalized.split(".")[0];
  }

  return normalized.replace(/\D/g, "");
}

export function isValidStudentPen(value: string): boolean {
  const digits = extractPenDigits(value);
  return (
    digits.length >= STUDENT_PEN_MIN_DIGITS &&
    digits.length <= STUDENT_PEN_MAX_DIGITS
  );
}

/**
 * Parse PEN from import cells. Rejects short values like state codes (e.g. "21").
 */
export function parsePenFromImport(value?: string | null): string {
  if (!value) return "";
  const digits = extractPenDigits(value);
  if (
    digits.length < STUDENT_PEN_MIN_DIGITS ||
    digits.length > STUDENT_PEN_MAX_DIGITS
  ) {
    return "";
  }
  return digits;
}

export function getStudentLoginEmailFromPen(pen: string): string {
  const digits = extractPenDigits(pen);
  return `${digits.toLowerCase()}@students.rnr.local`;
}
