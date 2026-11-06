/** Local calendar yyyy-MM-dd */
export function toLocalYmd(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addLocalDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return toLocalYmd(date);
}

export function getTomorrowYmd(asOf: Date = new Date()): string {
  return addLocalDays(toLocalYmd(asOf), 1);
}

/**
 * Ordering for `forDate` closes at 10:00 PM local time on the day before.
 * e.g. breakfast on 2026-11-07 is editable until 2026-11-06 22:00.
 */
export function getOrderCutoff(forDate: string): Date {
  const dayBefore = addLocalDays(forDate, -1);
  const [y, m, d] = dayBefore.split("-").map(Number);
  return new Date(y, m - 1, d, 22, 0, 0, 0);
}

export function isOrderingOpenForDate(
  forDate: string,
  asOf: Date = new Date(),
): boolean {
  return asOf.getTime() < getOrderCutoff(forDate).getTime();
}

export function breakfastOrderId(studentId: string, forDate: string): string {
  return `${studentId}_${forDate}`;
}
