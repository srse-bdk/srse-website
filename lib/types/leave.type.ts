import type { BaseEntity } from "./common.type";

export type LeaveApplicationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled";

export type LeaveApplicationSource =
  | "application"
  | "absent_conversion"
  | "admin_grant";

export interface LeaveType extends BaseEntity {
  code: string;
  name: string;
  maxDaysPerYear: number;
  requiresApproval: boolean;
  isPaid: boolean;
  isActive: boolean;
}

export interface LeaveTypeInput {
  code: string;
  name: string;
  maxDaysPerYear: number;
  requiresApproval?: boolean;
  isPaid?: boolean;
  isActive?: boolean;
}

export type SchoolCalendarEntryType =
  | "national_holiday"
  | "state_holiday"
  | "summer_vacation"
  | "winter_vacation"
  | "custom";

export interface SchoolCalendarEntry extends BaseEntity {
  type: SchoolCalendarEntryType;
  title: string;
  startDate: string;
  endDate: string;
  state?: string;
  academicYear?: string;
  isActive: boolean;
}

export interface SchoolCalendarEntryInput {
  type: SchoolCalendarEntryType;
  title: string;
  startDate: string;
  endDate: string;
  state?: string;
  academicYear?: string;
  isActive?: boolean;
}

export interface SchoolCalendarSettings {
  sundaysHoliday: boolean;
  secondSaturdayHoliday: boolean;
  updatedAt?: string;
}

export interface StaffLeaveApplication extends BaseEntity {
  staffId: string;
  staffName: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: LeaveApplicationStatus;
  appliedAt: number;
  reviewedBy?: string;
  reviewedAt?: number;
  reviewNotes?: string;
  source: LeaveApplicationSource;
}

export interface StaffLeaveApplicationInput {
  staffId: string;
  staffName: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface StaffLeaveAccrual extends BaseEntity {
  staffId: string;
  leaveTypeId: string;
  leaveTypeCode: string;
  academicYear: string;
  quarterKey: string;
  quarter: 1 | 2 | 3 | 4;
  accrualDate: string;
  days: number;
}

export interface StaffLeaveBalanceSummary {
  leaveTypeId: string;
  code: string;
  name: string;
  maxDaysPerYear: number;
  /** Total days credited so far this session (quarterly accruals). */
  accruedDays: number;
  perQuarterDays: number;
  quartersCredited: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
  usesQuarterlyAccrual: boolean;
}
