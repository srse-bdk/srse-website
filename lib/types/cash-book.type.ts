import type { BaseEntity } from "./common.type";

/** Payment mode codes from the school cash book. */
export type CashBookMode = "C" | "U" | "B" | "Q";

export type CashBookEntryType = "income" | "expense";

export interface CashBookCategory {
  code: string;
  label: string;
  type: CashBookEntryType;
  group?: string;
}

export interface CashBookEntry extends BaseEntity {
  type: CashBookEntryType;
  /** Calendar day yyyy-MM-dd */
  date: string;
  particulars: string;
  categoryCode: string;
  mode: CashBookMode;
  amount: number;
  /** Receipt no. (income) or voucher no. (expense) */
  refNo?: string;
  notes?: string;
  voided?: boolean;
  /** Optional link to a student (typical for fee income) */
  studentId?: string;
  studentName?: string;
  studentAdmissionNumber?: string;
  createdByUid?: string;
  createdByName?: string;
}

export interface CashBookDay extends BaseEntity {
  /** Same as date — yyyy-MM-dd used as document key */
  date: string;
  openingCash: number;
  /** Physical cash counted at day end (optional check) */
  physicalCashCount?: number | null;
  locked?: boolean;
  lockedAt?: string;
  lockedByUid?: string;
  lockedByName?: string;
  notes?: string;
}

export const CASH_BOOK_MODE_LABELS: Record<CashBookMode, string> = {
  C: "Cash",
  U: "UPI",
  B: "Bank",
  Q: "Cheque",
};

export const CASH_BOOK_INCOME_CATEGORIES: CashBookCategory[] = [
  { code: "I-ADM", label: "Admission Fee (one-time)", type: "income" },
  { code: "I-READ", label: "Re-admission Fee", type: "income" },
  { code: "I-BOOK", label: "Books", type: "income" },
  { code: "I-COPY", label: "Copies", type: "income" },
  { code: "I-UNI", label: "Uniform", type: "income" },
  {
    code: "I-OTH",
    label: "Other one-time (Picnic, ID Card, Annual Function, etc.)",
    type: "income",
  },
  { code: "I-TUI", label: "Monthly Tuition Fee", type: "income" },
  { code: "I-TRN", label: "Transport Fee", type: "income" },
  { code: "I-TIF", label: "Tiffin Fee", type: "income" },
  { code: "I-DAN", label: "Dance Fee", type: "income" },
  { code: "I-ABA", label: "Abacus Fee", type: "income" },
  { code: "I-MSC", label: "Miscellaneous Income", type: "income" },
];

export const CASH_BOOK_EXPENSE_CATEGORIES: CashBookCategory[] = [
  {
    code: "E-STU-BOOK",
    label: "Student — Books",
    type: "expense",
    group: "Student",
  },
  {
    code: "E-STU-UNI",
    label: "Student — Uniform",
    type: "expense",
    group: "Student",
  },
  {
    code: "E-STU-COPY",
    label: "Student — Copies",
    type: "expense",
    group: "Student",
  },
  {
    code: "E-STU-ID",
    label: "Student — ID Card",
    type: "expense",
    group: "Student",
  },
  {
    code: "E-STU-EXAM",
    label: "Exam Exp. (Paper, Printing)",
    type: "expense",
    group: "Student",
  },
  {
    code: "E-STU-WELF",
    label: "Student Welfare",
    type: "expense",
    group: "Student",
  },
  {
    code: "E-STU-AWRD",
    label: "Monthly Awards",
    type: "expense",
    group: "Student",
  },
  {
    code: "E-STF-SAL",
    label: "Salary & Wages",
    type: "expense",
    group: "Staff",
  },
  {
    code: "E-STF-WELF",
    label: "Staff Welfare",
    type: "expense",
    group: "Staff",
  },
  {
    code: "E-STF-UNI",
    label: "Staff Uniform & ID Card",
    type: "expense",
    group: "Staff",
  },
  {
    code: "E-ADM-RENT",
    label: "House Rent",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-ELEC",
    label: "Electricity & Appliance Maintenance",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-NET",
    label: "Internet Charges",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-STAT",
    label: "Office Stationery & Contingencies",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-GM",
    label: "Guardian Meeting Exp.",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-FEST",
    label: "Festivals Celebration",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-CONS",
    label: "Consumables (Sanitary, Medicines, Snacks)",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-SCI",
    label: "Science Exhibition / Activity Events",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-PIC",
    label: "Annual Picnic",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-SPT",
    label: "Annual Sports & Prizes",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-FUNC",
    label: "Annual Function",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-MAIN",
    label: "Maintenance (AC, TV, Filter, Inverter, Battery)",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-COMP",
    label: "Computer / Printer Maintenance",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-WATER",
    label: "Water Testing Certification",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-ADM-FIRE",
    label: "Fire Extinguisher",
    type: "expense",
    group: "Administrative",
  },
  {
    code: "E-TRN-VAN",
    label: "School Van Fuel",
    type: "expense",
    group: "Transport",
  },
  {
    code: "E-TRN-BIKE",
    label: "School Bike Fuel",
    type: "expense",
    group: "Transport",
  },
  {
    code: "E-TRN-RTO",
    label: "RTO, Pollution & Insurance",
    type: "expense",
    group: "Transport",
  },
  {
    code: "E-TRN-DRV",
    label: "Driver Charges",
    type: "expense",
    group: "Transport",
  },
  {
    code: "E-TRN-REP",
    label: "Vehicle Repair & Maintenance",
    type: "expense",
    group: "Transport",
  },
  {
    code: "E-PUR-SPT",
    label: "New — Sports Equipment",
    type: "expense",
    group: "Purchase",
  },
  {
    code: "E-PUR-FAN",
    label: "New — Fan & Lights + Installation",
    type: "expense",
    group: "Purchase",
  },
  {
    code: "E-PUR-CCTV",
    label: "New — CCTV Installation",
    type: "expense",
    group: "Purchase",
  },
  {
    code: "E-PUR-SOLAR",
    label: "New — Solar Inverter / Battery",
    type: "expense",
    group: "Purchase",
  },
  {
    code: "E-CON",
    label: "New Construction Expenses",
    type: "expense",
    group: "Construction",
  },
];

export const ALL_CASH_BOOK_CATEGORIES: CashBookCategory[] = [
  ...CASH_BOOK_INCOME_CATEGORIES,
  ...CASH_BOOK_EXPENSE_CATEGORIES,
];

export function getCashBookCategoryLabel(code: string): string {
  return (
    ALL_CASH_BOOK_CATEGORIES.find((c) => c.code === code)?.label || code
  );
}

export function categoriesForType(type: CashBookEntryType): CashBookCategory[] {
  return type === "income"
    ? CASH_BOOK_INCOME_CATEGORIES
    : CASH_BOOK_EXPENSE_CATEGORIES;
}

/** Closing cash uses cash-mode entries only. */
export function computeDayTotals(entries: CashBookEntry[], openingCash: number) {
  const active = entries.filter((e) => !e.voided);
  const income = active.filter((e) => e.type === "income");
  const expense = active.filter((e) => e.type === "expense");

  const sumByMode = (list: CashBookEntry[]) => {
    const byMode: Record<CashBookMode, number> = { C: 0, U: 0, B: 0, Q: 0 };
    for (const e of list) {
      const mode = (e.mode in byMode ? e.mode : "C") as CashBookMode;
      byMode[mode] += Number(e.amount) || 0;
    }
    return byMode;
  };

  const totalIncome = income.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const totalExpense = expense.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  const incomeByMode = sumByMode(income);
  const expenseByMode = sumByMode(expense);
  const allByMode = sumByMode(active);

  const cashIncome = incomeByMode.C;
  const cashExpense = expenseByMode.C;

  const closingCash = openingCash + cashIncome - cashExpense;
  const net = totalIncome - totalExpense;

  return {
    totalIncome,
    totalExpense,
    cashIncome,
    cashExpense,
    closingCash,
    net,
    incomeCount: income.length,
    expenseCount: expense.length,
    incomeByMode,
    expenseByMode,
    allByMode,
  };
}

export function startOfWeekMonday(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekDatesFrom(anyDateInWeek: string): string[] {
  const monday = startOfWeekMonday(anyDateInWeek);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
