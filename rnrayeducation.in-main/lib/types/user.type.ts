import type { BaseEntity } from "./common.type";

// Status types
export type Status = "active" | "inactive";
export type UserStatus = "active" | "inactive" | "pending";
export type UserRole = "admin" | "staff" | "parent" | "student";

export interface StaffSubjectAssignment {
  subjectId: string;
  classId: string;
  section: string;
  academicYear: string;
}

export interface User extends BaseEntity {
  uid: string;
  name: string;
  email: string;
  status: UserStatus;
  password: string;
  role: UserRole;
  profilePicture?: string;
  profilePictureFileKey?: string;
  gender?: "male" | "female" | "other";
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
}

// Input types for user creation
export interface UserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  gender: "male" | "female" | "other";
  position: string;
  staffType: "teaching" | "non-teaching";
  phoneNumber?: string;
  subjectAssignments?: StaffSubjectAssignment[];
}

export interface UserUpdateInput {
  name?: string;
  email?: string;
  status?: UserStatus;
  profilePicture?: string;
  profilePictureFileKey?: string;
  gender?: "male" | "female" | "other";
  position?: string;
  staffType?: "teaching" | "non-teaching";
  phoneNumber?: string;
  subjectAssignments?: StaffSubjectAssignment[];
}
