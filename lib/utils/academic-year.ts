/** Academic session runs April → March (e.g. 2025-26). */
export function getAcademicYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

export function getAcademicYearStartEnd(academicYear: string): {
  startDate: string;
  endDate: string;
} {
  const startYear = Number.parseInt(academicYear.split("-")[0], 10);
  return {
    startDate: `${startYear}-04-01`,
    endDate: `${startYear + 1}-03-31`,
  };
}
