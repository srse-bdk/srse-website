import type {
  SchoolCalendarEntry,
  SchoolCalendarSettings,
} from "@/lib/types/leave.type";

const DEFAULT_SETTINGS: SchoolCalendarSettings = {
  sundaysHoliday: true,
  secondSaturdayHoliday: true,
};

export function getDefaultSchoolCalendarSettings(): SchoolCalendarSettings {
  return { ...DEFAULT_SETTINGS };
}

export function isSunday(dateStr: string): boolean {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.getDay() === 0;
}

export function isSecondSaturday(dateStr: string): boolean {
  const date = new Date(`${dateStr}T12:00:00`);
  if (date.getDay() !== 6) return false;
  const dayOfMonth = date.getDate();
  return dayOfMonth >= 8 && dayOfMonth <= 14;
}

export function isDateInRange(
  dateStr: string,
  startDate: string,
  endDate: string,
): boolean {
  return dateStr >= startDate && dateStr <= endDate;
}

export function countDaysInclusive(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  if (end < start) return 0;
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export function eachDateInRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().split("T")[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function getHolidayReasonForDate(
  dateStr: string,
  settings: SchoolCalendarSettings,
  entries: SchoolCalendarEntry[],
): string | null {
  const activeEntries = entries.filter((entry) => entry.isActive !== false);

  if (settings.sundaysHoliday && isSunday(dateStr)) {
    return "Sunday";
  }

  if (settings.secondSaturdayHoliday && isSecondSaturday(dateStr)) {
    return "Second Saturday";
  }

  const matched = activeEntries.find((entry) =>
    isDateInRange(dateStr, entry.startDate, entry.endDate),
  );
  if (!matched) return null;

  switch (matched.type) {
    case "national_holiday":
      return matched.title || "National holiday";
    case "state_holiday":
      return matched.title || "State holiday";
    case "summer_vacation":
      return matched.title || "Summer vacation";
    case "winter_vacation":
      return matched.title || "Winter vacation";
    default:
      return matched.title || "Holiday";
  }
}

export function isSchoolHoliday(
  dateStr: string,
  settings: SchoolCalendarSettings,
  entries: SchoolCalendarEntry[],
): boolean {
  return getHolidayReasonForDate(dateStr, settings, entries) !== null;
}
