export type BreakfastOrderStatus = "ordered" | "cancelled" | "paid";

export interface BreakfastOrder {
  id: string;
  studentId: string;
  studentName: string;
  classLabel: string;
  /** yyyy-MM-dd — day the breakfast is for */
  forDate: string;
  status: BreakfastOrderStatus;
  orderedAt: string;
  orderedBy: string;
  paidAt?: string;
  paidBy?: string;
  cancelledAt?: string;
  updatedAt: string;
}
