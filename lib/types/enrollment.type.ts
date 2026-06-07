import type { BaseEntity } from "./common.type";

export type EnrollmentStatus = "active" | "transferred" | "promoted" | "withdrawn";

export interface Enrollment extends BaseEntity {
  studentId: string; // Reference to student
  classId: string; // Reference to class
  section: string; // e.g., "A", "B", "C"
  rollNumber: string; // Assigned roll number
  academicYear: string; // e.g., "2024-25"
  enrollmentDate: string; // ISO date string
  status: EnrollmentStatus;
  previousEnrollmentId?: string; // For history tracking (if transferred/promoted)
  notes?: string; // Additional notes
}

// Input types for enrollment creation
export interface EnrollmentInput {
  studentId: string;
  classId: string;
  section: string;
  rollNumber: string;
  academicYear: string;
  enrollmentDate?: string; // Optional, defaults to current date
  status?: EnrollmentStatus;
  previousEnrollmentId?: string;
  notes?: string;
}

export interface EnrollmentUpdateInput {
  studentId?: string;
  classId?: string;
  section?: string;
  rollNumber?: string;
  academicYear?: string;
  enrollmentDate?: string;
  status?: EnrollmentStatus;
  previousEnrollmentId?: string;
  notes?: string;
}

// For displaying enrollment history
export interface EnrollmentHistory {
  enrollment: Enrollment;
  class: {
    id: string;
    name: string;
  };
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
  };
}

