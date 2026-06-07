export function normalizePen(pen: string): string {
  const trimmed = pen.replace(/\s+/g, "").trim();
  if (!trimmed) return "";

  const upper = trimmed.toUpperCase();
  if (upper === "NA" || upper === "N/A" || upper === "N-A") {
    return "";
  }

  return trimmed;
}

export function getStudentLoginEmailFromPen(pen: string): string {
  const normalized = normalizePen(pen)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `${normalized}@students.rnr.local`;
}
