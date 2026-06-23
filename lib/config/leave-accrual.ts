/** Leave days credited per staff on each quarter start (Apr 1, Jul 1, Oct 1, Jan 1). */
export const QUARTERLY_LEAVE_ACCRUAL = {
  CL: 1,
  SL: 1,
  EL: 1,
} as const;

export type AccrualLeaveCode = keyof typeof QUARTERLY_LEAVE_ACCRUAL;

export const ACCRUAL_LEAVE_CODES: AccrualLeaveCode[] = ["CL", "SL", "EL"];

/** Maximum leave days per academic session (Apr–Mar). */
export const ANNUAL_LEAVE_CAPS = {
  CL: QUARTERLY_LEAVE_ACCRUAL.CL * 4,
  SL: QUARTERLY_LEAVE_ACCRUAL.SL * 4,
  EL: QUARTERLY_LEAVE_ACCRUAL.EL * 4,
} as const;

export const QUARTERLY_ACCRUAL_DESCRIPTION =
  "1 CL, 1 SL, and 1 EL per quarter (credited on 1 Apr, 1 Jul, 1 Oct, 1 Jan).";

export const ANNUAL_ACCRUAL_DESCRIPTION =
  "Annual caps: CL 4, SL 4, EL 4.";

export const FULL_LEAVE_POLICY_DESCRIPTION = `${QUARTERLY_ACCRUAL_DESCRIPTION} ${ANNUAL_ACCRUAL_DESCRIPTION}`;

export function getAnnualAccrualLimit(code: AccrualLeaveCode): number {
  return ANNUAL_LEAVE_CAPS[code];
}

export function getQuarterlyAccrualDays(code: AccrualLeaveCode): number {
  return QUARTERLY_LEAVE_ACCRUAL[code];
}

/** Admin-granted only (exam / medical under Principal recommendation). Not self-service. */
export const SPECIAL_LEAVE_CODE = "SPL";
export const SPECIAL_LEAVE_MAX_DAYS_PER_YEAR = 5;
export const SPECIAL_LEAVE_NAME = "Special Leave (Exam / Medical)";
export const SPECIAL_LEAVE_DESCRIPTION =
  "Up to 5 days per year. Granted by admin only after Principal recommendation. Staff cannot apply online.";
