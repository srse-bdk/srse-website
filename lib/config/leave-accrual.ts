/** Leave days credited per staff on each quarter start (Apr 1, Jul 1, Oct 1, Jan 1). */
export const QUARTERLY_LEAVE_ACCRUAL = {
  CL: 2,
  SL: 2,
  EL: 1,
} as const;

export type AccrualLeaveCode = keyof typeof QUARTERLY_LEAVE_ACCRUAL;

export const ACCRUAL_LEAVE_CODES: AccrualLeaveCode[] = ["CL", "SL", "EL"];

export const QUARTERLY_ACCRUAL_DESCRIPTION =
  "2 CLs, 2 SLs, and 1 EL per quarter (credited on 1 Apr, 1 Jul, 1 Oct, 1 Jan).";

export function getAnnualAccrualLimit(code: AccrualLeaveCode): number {
  return QUARTERLY_LEAVE_ACCRUAL[code] * 4;
}
