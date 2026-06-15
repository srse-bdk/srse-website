import type { BaseEntity } from "./common.type";
import type { BloodGroup } from "./student.type";

// Status types
export type Status = "active" | "inactive";
export type UserStatus = "active" | "inactive" | "pending";
export type UserRole = "admin" | "staff" | "parent" | "student" | "scanner";

export interface StaffSubjectAssignment {
  subjectId: string;
  classId: string;
  section: string;
  academicYear: string;
}

export interface User extends BaseEntity {
  /** When false, staff exists for ID cards only (no portal login). */
  hasLogin?: boolean;
  uid: string;
  scanId?: string;
  name: string;
  email: string;
  status: UserStatus;
  password: string;
  role: UserRole;
  profilePicture?: string;
  profilePictureFileKey?: string;
  gender?: "male" | "female" | "other";
  bloodGroup?: BloodGroup;
  position?: string;
  staffType?: "teaching" | "non-teaching";
  phoneNumber?: string;
  subjectAssignments?: StaffSubjectAssignment[];
  validChildrenIds?: string[]; // IDs of students this parent is authorized to view
  studentId?: string;
  pen?: string;
  fatherName?: string;
  motherName?: string;
  socialCategory?: string;
  socialCategoryCode?: number;
  currentClass?: string;
  currentSection?: string;
  /** Set when ID card was bulk-printed (phased print tracking). */
  idCardPrintedAt?: string;
}

export interface ProfileOnlyStaffInput {
  name: string;
  phoneNumber?: string;
  bloodGroup?: BloodGroup;
  position: string;
  scanId?: string;
}

// Input types for user creation
export interface UserInput {
  scanId?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  gender: "male" | "female" | "other";
  bloodGroup?: BloodGroup;
  position: string;
  staffType: "teaching" | "non-teaching";
  phoneNumber?: string;
  subjectAssignments?: StaffSubjectAssignment[];
}

export interface UserUpdateInput {
  scanId?: string;
  name?: string;
  email?: string;
  status?: UserStatus;
  profilePicture?: string;
  profilePictureFileKey?: string;
  gender?: "male" | "female" | "other";
  bloodGroup?: BloodGroup;
  position?: string;
  staffType?: "teaching" | "non-teaching";
  phoneNumber?: string;
  subjectAssignments?: StaffSubjectAssignment[];
  idCardPrintedAt?: string;
}
