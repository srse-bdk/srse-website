import type { AccrualLeaveCode } from "@/lib/config/leave-accrual";

export type LeaveQuarter = 1 | 2 | 3 | 4;

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
): AcademicYearQuarter[] {
  const today = asOf.toISOString().split("T")[0];
  return getAcademicYearQuarters(academicYear).filter(
    (quarter) => quarter.accrualDate <= today,
  );
}

export function isAccrualLeaveCode(code: string): code is AccrualLeaveCode {
  return code === "CL" || code === "SL" || code === "EL";
}
