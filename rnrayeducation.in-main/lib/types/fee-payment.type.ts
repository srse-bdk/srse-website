import type { BaseEntity } from "./common.type";
import type { FeeCategory, FeeStatus } from "./fee.type";

export interface FeePayment extends BaseEntity {
  feeId: string;
  studentId: string;
  studentName: string;

  feeTitle?: string;
  feeCategory?: FeeCategory | string;
  totalFeeAmount?: number;

  amountPaid?: number;
  pendingAfterPayment?: number;
  paymentDate?: string; // ISO
  paymentMethod?: "cash" | "online" | "check" | "transfer";

  transactionId?: string;
  remarks?: string;
  paymentScreenshot?: string;
  paymentScreenshotFileKey?: string;

  receiptNumber?: string;
  paidBy?: "admin" | "staff" | "parent" | "student";
  approvalStatus?: "pending_verification" | "approved";
  approvalUpdatedAt?: string;
  approvedAt?: string;
  approvedBy?: "admin" | "staff";

  // Backward compatibility fields used in some UI screens
  status?: FeeStatus;
  title?: string;
  category?: FeeCategory | string;
  amount?: number;
  paidAmount?: number;
  dueDate?: string;
  paidDate?: string;
}
