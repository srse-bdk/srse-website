import { BaseEntity } from "./common.type";

export type FeeType = "recurring" | "one-time";
export type FeeFrequency = "monthly" | "quarterly" | "annually" | "one-time";
export type FeeTargetType = "school" | "class" | "student";
export type FeeCategory =
  | "tuition"
  | "transport"
  | "library"
  | "punishment"
  | "donation"
  | "readmission"
  | "exam"
  | "other";

export type FeeStatus =
  | "pending"
  | "pending_verification"
  | "paid"
  | "overdue"
  | "partial";

// Fee Template/Structure (The rules)
export interface FeeStructure extends BaseEntity {
  name: string;
  description?: string;
  amount: number;
  type: FeeType;
  frequency: FeeFrequency;
  category: FeeCategory;

  // Who does this apply to?
  targetType: FeeTargetType;
  targetClassId?: string; // Specific class
  targetSection?: string; // Specific section (optional refinement)

  isActive: boolean;
  academicYear: string;
}

// New Fee Configuration for Admin Panel
export interface FeeConfiguration extends BaseEntity {
  name: string;
  cycle: FeeFrequency;
  isOptional: boolean;
  academicYear: string;
  classFees: Record<string, number>; // className -> amount (e.g., "Class 1" -> 5000)
}

// Individual Fee Record (The Bill)
export interface FeeRecord extends BaseEntity {
  studentId: string;
  studentName: string; // Denormalized for easier display
  classId: string;
  feeConfigId?: string;
  issuePeriodKey?: string;

  feeStructureId?: string; // Link to parent structure if applicable

  title: string; // e.g. "October Tuition", "Late Fine"
  description?: string;
  category: FeeCategory;

  amount: number;
  paidAmount: number;
  discountAmount: number;
  fineAmount: number; // Late payment fine

  dueDate: string; // ISO date
  paidDate?: string; // ISO date

  status: FeeStatus;
  paymentMethod?: "cash" | "online" | "check" | "transfer";
  transactionId?: string;
  paymentScreenshot?: string;
  paymentScreenshotFileKey?: string;
  pendingVerificationAt?: string;
  pendingVerificationBy?: "parent" | "student";
  pendingVerificationPaymentId?: string;

  remarks?: string;
}
