import type { BaseEntity } from "./common.type";

export type AttendanceStatus = "present" | "absent";

export interface AttendanceLocation {
  lat: number;
  lng: number;
  address: string;
  locationId?: string;
}

export type AttendanceSource = "entry-scanner" | "exit-scanner" | "self-punch";

export interface Attendance extends BaseEntity {
  staffId: string;
  staffName: string;
  date: string; // YYYY-MM-DD format
  punchInTime: number; // Unix timestamp (milliseconds)
  punchOutTime?: number; // Optional, Unix timestamp
  punchInLocation?: AttendanceLocation;
  punchOutLocation?: AttendanceLocation;
  punchInSource?: AttendanceSource;
  punchOutSource?: AttendanceSource;
  status: AttendanceStatus;
  notes?: string;
  totalHours?: number; // Calculated work hours
}

export interface AttendanceInput {
  staffId: string;
  staffName: string;
  location?: AttendanceLocation;
  source?: AttendanceSource;
}

export interface AttendanceAnalytics {
  totalHours: number;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  averageHoursPerDay: number;
}

export interface AdminAnalytics {
  totalStaff: number;
  presentStaff: number;
  absentStaff: number;
  averageHoursPerStaff: number;
  totalHours: number;
}
