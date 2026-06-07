import type { BaseEntity } from "./common.type";

export type FinancialTransactionType = "income" | "expense";

export interface FinancialTransaction extends BaseEntity {
  type: FinancialTransactionType;
  category: string;
  amount: number;
  date: string; // yyyy-MM-dd
  notes?: string;
  receiptUrl?: string;
  receiptFileKey?: string;
}

export const PREDEFINED_INCOME_CATEGORIES = [
  "Tuition Fee",
  "Admission Fee",
  "Registration Fee",
  "Examination Fees",
  "Transport Fees",
  "Hostel Fees",
  "Library Fees",
  "Laboratory Fees",
  "Activity / Extracurricular Fees",
  "Sports Fees",
  "Fine / Penalty Charges",
  "Late Fee Charges",
  "Donations",
  "Grants / Government Funding",
  "Sponsorships",
  "Event Income (fairs, functions, etc.)",
  "Sale of Books / Uniforms / Materials",
  "Interest Income",
  "Miscellaneous Income",
] as const;

export const PREDEFINED_EXPENSE_CATEGORIES = [
  "Staff Salaries",
  "Teacher Salaries",
  "Administrative Expenses",
  "Electricity Bills",
  "Water Bills",
  "Internet / Telephone Charges",
  "Maintenance & Repairs",
  "Building Rent / Lease",
  "Infrastructure Development",
  "Furniture & Equipment",
  "Classroom Supplies",
  "Laboratory Equipment",
  "Library Books",
  "Transport Expenses (fuel, maintenance)",
  "Hostel Expenses",
  "Food / Catering",
  "Event Expenses",
  "Sports Expenses",
  "Marketing / Promotions",
  "Printing & Stationery",
  "Software / IT Services",
  "Security Services",
  "Cleaning & Housekeeping",
  "Medical / First Aid",
  "Insurance",
  "Taxes & Compliance Fees",
  "Miscellaneous Expenses",
] as const;
