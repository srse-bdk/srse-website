import type { BaseEntity } from "./common.type";

export type StudentAttendanceStatus = "present" | "absent" | "late";

export interface StudentAttendance extends BaseEntity {
  studentId: string; // Reference to student
  enrollmentId: string; // Reference to enrollment
  classId: string; // Reference to class
  section: string; // e.g., "A", "B", "C"
  date: string; // YYYY-MM-DD format
  status: StudentAttendanceStatus;
  markedBy: string; // Staff/Admin user ID who marked it
  markedAt: number; // Unix timestamp (milliseconds)
  notes?: string; // Optional notes
}

export interface StudentAttendanceInput {
  studentId: string;
  enrollmentId: string;
  classId: string;
  section: string;
  date: string; // YYYY-MM-DD format
  status: StudentAttendanceStatus;
  notes?: string;
}

export interface BulkAttendanceInput {
  date: string; // YYYY-MM-DD format
  classId: string;
  section: string;
  attendance: Array<{
    studentId: string;
    enrollmentId: string;
    status: StudentAttendanceStatus;
    notes?: string;
  }>;
}

export interface StudentAttendanceUpdateInput {
  status?: StudentAttendanceStatus;
  notes?: string;
}

export interface StudentAttendanceAnalytics {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
  presentPercentage: number;
  absentPercentage: number;
  latePercentage: number;
}

export interface StudentAttendanceStats {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercentage: number;
}

export interface ClassAttendanceStats extends StudentAttendanceStats {
  classId: string;
  className: string;
  section: string;
  date: string;
}

export interface MonthlyAttendanceReport {
  month: string; // YYYY-MM format
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  attendancePercentage: number;
  dailyStats: Array<{
    date: string;
    present: number;
    absent: number;
    late: number;
    total: number;
  }>;
}
