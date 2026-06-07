const PLACEHOLDER_VALUES = new Set([
  "NA",
  "N/A",
  "N-A",
  "NULL",
  "NONE",
  "NIL",
  "UNKNOWN",
  "-",
  "--",
  "NOT AVAILABLE",
  "NOT APPLICABLE",
  "AADHAAR NOT AVAILABLE",
]);

export function sanitizeImportValue(value?: string | null): string {
  if (value == null) return "";

  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const normalized = trimmed.toUpperCase().replace(/\s+/g, " ");
  if (PLACEHOLDER_VALUES.has(normalized)) return "";
  if (normalized.startsWith("NOT ")) return "";

  return trimmed;
}
