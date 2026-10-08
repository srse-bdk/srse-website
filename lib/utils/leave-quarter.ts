import type { AccrualLeaveCode } from "@/lib/config/leave-accrual";

export type LeaveQuarter = 1 | 2 | 3 | 4;

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface AcademicYearQuarter {
  quarter: LeaveQuarter;
  key: string;
  accrualDate: string;
  label: string;
  monthLabel: string;
}

/** Quarter accrual dates align with Apr / Jul / Oct / Jan within the academic session. */
export function getAcademicYearQuarters(academicYear: string): AcademicYearQuarter[] {
  const startYear = Number.parseInt(academicYear.split("-")[0], 10);

  return [
    {
      quarter: 1,
      key: `${academicYear}-Q1`,
      accrualDate: `${startYear}-04-01`,
      label: "Apr–Jun",
      monthLabel: "1 Apr",
    },
    {
      quarter: 2,
      key: `${academicYear}-Q2`,
      accrualDate: `${startYear}-07-01`,
      label: "Jul–Sep",
      monthLabel: "1 Jul",
    },
    {
      quarter: 3,
      key: `${academicYear}-Q3`,
      accrualDate: `${startYear}-10-01`,
      label: "Oct–Dec",
      monthLabel: "1 Oct",
    },
    {
      quarter: 4,
      key: `${academicYear}-Q4`,
      accrualDate: `${startYear + 1}-01-01`,
      label: "Jan–Mar",
      monthLabel: "1 Jan",
    },
  ];
}

export function getDueQuarters(
  academicYear: string,
  asOf: Date = new Date(),
  /** yyyy-MM-dd or ISO — only credit quarters on/after this join date. */
  joinedOn?: string | null,
): AcademicYearQuarter[] {
  const today = toLocalDateString(asOf);
  const joinYmd = joinedOn ? String(joinedOn).trim().slice(0, 10) : "";
  const hasJoin = /^\d{4}-\d{2}-\d{2}$/.test(joinYmd);
  return getAcademicYearQuarters(academicYear).filter((quarter) => {
    if (quarter.accrualDate > today) return false;
    // Mid-year joiners: no credit for quarters that started before they joined.
    if (hasJoin && quarter.accrualDate < joinYmd) return false;
    return true;
  });
}

export function isAccrualLeaveCode(code: string): code is AccrualLeaveCode {
  return code === "CL" || code === "SL" || code === "EL";
}

export function isSpecialLeaveCode(code: string): boolean {
  return code.trim().toUpperCase() === "SPL";
}
