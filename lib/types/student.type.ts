import type { BaseEntity } from "./common.type";

export type StudentStatus = "active" | "inactive" | "graduated" | "transferred";
export type Gender = "male" | "female" | "other";
export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";
export type GuardianRelationship = "father" | "mother" | "guardian" | "other";

export interface Guardian {
  id: string; // Unique ID for this guardian
  relationship: GuardianRelationship;
  name: string;
  email?: string;
  phone: string;
  occupation?: string;
  address?: string;
  isPrimary: boolean; // One primary guardian
}

export interface StudentAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface StudentDocument {
  id: string; // Unique ID for this document
  label: string; // Custom label provided by admin (e.g., "Birth Certificate", "Medical Report", etc.)
  url: string; // UploadThing URL
  fileKey: string; // UploadThing file key for deletion
  uploadedAt: string; // ISO date string
  uploadedBy: string; // Admin user ID who uploaded
}

export interface Student extends BaseEntity {
  // Basic Information
  scanId?: string;
  admissionNumber: string; // Manual entry
  admissionDate: string; // ISO date string - Date when student was admitted
  firstName: string;
  lastName: string;
  fullName: string; // Computed: firstName + lastName
  dateOfBirth: string; // ISO date string
  gender: Gender;
  bloodGroup?: BloodGroup;

  // Contact Information
  email?: string;
  phone?: string;
  alternatePhone?: string;

  // Address
  address: StudentAddress;

  // Guardian/Parent Information (Flexible - multiple guardians)
  guardians: Guardian[];

  // Profile Picture (optional)
  profilePicture?: string;
  profilePictureFileKey?: string;

  // Additional Documents (optional, admin-only)
  documents: StudentDocument[];

  // Status
  status: StudentStatus;

  // Academic (for future use)
  currentClass?: string;
  currentSection?: string;
  rollNumber?: string;
  siblingIds?: string[];
  optionalFeeIds?: string[]; // IDs of optional fees assigned to this student
  optionalFeeAmounts?: Record<string, number>; // Fee ID -> Amount
  pen?: string;
  socialCategory?: string;
  socialCategoryCode?: number;
  fatherName?: string;
  motherName?: string;
  /** Set when ID card was bulk-printed (phased print tracking). */
  idCardPrintedAt?: string;
}

// Input types for student creation
export interface StudentInput {
  scanId?: string;
  admissionNumber: string;
  admissionDate?: string; // Date when student was admitted
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address: StudentAddress;
  guardians: Guardian[];
  profilePicture?: string;
  profilePictureFileKey?: string;
  documents?: StudentDocument[];
  status?: StudentStatus;
  currentClass?: string;
  currentSection?: string;
  rollNumber?: string;
  siblingIds?: string[];
  optionalFeeIds?: string[];
  optionalFeeAmounts?: Record<string, number>;
  pen?: string;
  socialCategory?: string;
  socialCategoryCode?: number;
  fatherName?: string;
  motherName?: string;
  /** Set when ID card was bulk-printed (phased print tracking). */
  idCardPrintedAt?: string;
}

export interface StudentUpdateInput {
  scanId?: string;
  admissionNumber?: string;
  admissionDate?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  address?: Partial<StudentAddress>;
  guardians?: Guardian[];
  profilePicture?: string;
  profilePictureFileKey?: string;
  status?: StudentStatus;
  currentClass?: string;
  currentSection?: string;
  rollNumber?: string;
  siblingIds?: string[];
  optionalFeeIds?: string[];
  optionalFeeAmounts?: Record<string, number>;
  pen?: string | null;
  socialCategory?: string;
  socialCategoryCode?: number;
  fatherName?: string;
  motherName?: string;
  documents?: StudentDocument[];
  idCardPrintedAt?: string;
}
