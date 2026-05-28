export function normalizePen(pen: string): string {
  return pen.replace(/\s+/g, "").trim();
}

export function getStudentLoginEmailFromPen(pen: string): string {
  const normalized = normalizePen(pen).toLowerCase().replace(/[^a-z0-9]/g, "");
  return `${normalized}@students.rnr.local`;
}
