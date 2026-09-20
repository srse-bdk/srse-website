import type { CashBookEntry } from "@/lib/types/cash-book.type";
import type { FeeConfiguration, FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { getAcademicYearForDate } from "@/lib/utils/fee-dues";

export type FeeReferenceKind = "pending" | "structure" | "issued";

export interface FeeAmountReference {
  amount: number;
  kind: FeeReferenceKind;
  label: string;
  feeConfigId?: string;
  feeRecordIds?: string[];
  /** Human-readable fee name from structure */
  feeName?: string;
}

function normalize(value?: string) {
  return (value || "").trim().toLowerCase();
}

/** Map cash-book income codes to fee-structure / fee-record name keywords. */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "I-TUI": ["tuition", "tution"],
  "I-TRN": ["transport"],
  "I-TIF": ["tiffin"],
  "I-DAN": ["dance"],
  "I-ABA": ["abacus"],
  "I-ADM": ["admission"],
  "I-READ": ["readmission", "re-admission", "re admission"],
  "I-BOOK": ["book"],
  "I-COPY": ["cop"],
  "I-UNI": ["uniform"],
  "I-OTH": ["other", "picnic", "id card", "annual function"],
  "I-MSC": ["misc", "miscellaneous"],
};

/** Recurring fees show pending; one-time fees show structure/issued amount. */
const PENDING_STYLE_CODES = new Set([
  "I-TUI",
  "I-TRN",
  "I-TIF",
  "I-DAN",
  "I-ABA",
]);

function matchesKeywords(text: string, keywords: string[]) {
  const n = normalize(text);
  return keywords.some((k) => n.includes(k));
}

function configMatchesCategory(config: FeeConfiguration, categoryCode: string) {
  const keywords = CATEGORY_KEYWORDS[categoryCode];
  if (!keywords?.length) return false;
  return matchesKeywords(config.name, keywords);
}

function recordMatchesCategory(fee: FeeRecord, categoryCode: string) {
  const keywords = CATEGORY_KEYWORDS[categoryCode];
  if (!keywords?.length) return false;
  return (
    matchesKeywords(String(fee.category || ""), keywords) ||
    matchesKeywords(fee.title || "", keywords)
  );
}

function structureAmountForStudent(
  config: FeeConfiguration,
  student: Student,
): number {
  const classKey = student.currentClass || "";
  if (classKey && config.classFees?.[classKey] != null) {
    return Number(config.classFees[classKey]) || 0;
  }
  // Optional fees stored on student
  if (config.isOptional && student.optionalFeeAmounts?.[config.id] != null) {
    return Number(student.optionalFeeAmounts[config.id]) || 0;
  }
  return 0;
}

function alreadyPaidInCashBook(params: {
  entries: CashBookEntry[];
  studentId: string;
  categoryCode: string;
  excludeEntryId?: string;
}): number {
  const { entries, studentId, categoryCode, excludeEntryId } = params;
  return entries
    .filter(
      (e) =>
        !e.voided &&
        e.type === "income" &&
        e.studentId === studentId &&
        e.categoryCode === categoryCode &&
        e.id !== excludeEntryId,
    )
    .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
}

/**
 * Resolve a readonly reference amount for cash-book income when student +
 * category are selected. Prefers issued fee pending for recurring fees;
 * structure/issued amount for one-time fees (admission, etc.).
 */
export function resolveFeeAmountReference(params: {
  student: Student | null | undefined;
  categoryCode: string;
  feeConfigs: FeeConfiguration[];
  feeRecords: FeeRecord[];
  cashBookEntries?: CashBookEntry[];
  excludeEntryId?: string;
  asOfDate?: string; // yyyy-MM-dd
}): FeeAmountReference | null {
  const {
    student,
    categoryCode,
    feeConfigs,
    feeRecords,
    cashBookEntries = [],
    excludeEntryId,
    asOfDate,
  } = params;

  if (!student?.id || !categoryCode.startsWith("I-")) return null;

  const keywords = CATEGORY_KEYWORDS[categoryCode];
  if (!keywords?.length) return null;

  const asOf = asOfDate ? new Date(`${asOfDate}T12:00:00`) : new Date();
  const academicYear = getAcademicYearForDate(asOf);

  const matchingConfigs = feeConfigs.filter(
    (cfg) =>
      configMatchesCategory(cfg, categoryCode) &&
      (!cfg.academicYear || cfg.academicYear === academicYear),
  );

  const matchingRecords = feeRecords.filter(
    (fee) =>
      fee.studentId === student.id &&
      recordMatchesCategory(fee, categoryCode) &&
      ["pending", "partial", "overdue", "pending_verification"].includes(
        fee.status,
      ),
  );

  const issuedPending = matchingRecords.reduce((sum, fee) => {
    const due = Number(fee.amount) || 0;
    const paid = Number(fee.paidAmount) || 0;
    return sum + Math.max(0, due - paid);
  }, 0);

  const cashAlready = alreadyPaidInCashBook({
    entries: cashBookEntries,
    studentId: student.id,
    categoryCode,
    excludeEntryId,
  });

  const preferPending = PENDING_STYLE_CODES.has(categoryCode);

  // Issued bills with outstanding balance
  if (matchingRecords.length > 0 && issuedPending > 0) {
    const remaining = Math.max(0, issuedPending - cashAlready);
    if (remaining > 0) {
      const names = [
        ...new Set(matchingRecords.map((r) => r.title || r.category)),
      ];
      return {
        amount: remaining,
        kind: "pending",
        label: `Pending ${names[0] || "fee"}`,
        feeConfigId: matchingRecords[0]?.feeConfigId,
        feeRecordIds: matchingRecords.map((r) => r.id).filter(Boolean),
        feeName: names[0],
      };
    }
  }

  // Structure amount for student's class / optional assignment
  const primaryConfig =
    matchingConfigs.find((c) => structureAmountForStudent(c, student) > 0) ||
    matchingConfigs[0];

  if (primaryConfig) {
    const structured = structureAmountForStudent(primaryConfig, student);
    if (structured > 0) {
      if (preferPending) {
        const remaining = Math.max(0, structured - cashAlready);
        if (remaining <= 0) return null;
        return {
          amount: remaining,
          kind: "pending",
          label: `Pending ${primaryConfig.name} (from fee structure)`,
          feeConfigId: primaryConfig.id,
          feeName: primaryConfig.name,
        };
      }

      // One-time / actual (admission, etc.)
      if (cashAlready >= structured) {
        return null;
      }
      return {
        amount: structured,
        kind: "structure",
        label: `${primaryConfig.name} (fee structure)`,
        feeConfigId: primaryConfig.id,
        feeName: primaryConfig.name,
      };
    }
  }

  // Optional amount on student without matching config name exactly
  if (student.optionalFeeAmounts) {
    for (const [feeId, amt] of Object.entries(student.optionalFeeAmounts)) {
      const cfg = feeConfigs.find((c) => c.id === feeId);
      if (!cfg || !configMatchesCategory(cfg, categoryCode)) continue;
      const amount = Number(amt) || 0;
      if (amount <= 0) continue;
      const remaining = preferPending
        ? Math.max(0, amount - cashAlready)
        : amount;
      if (remaining <= 0) return null;
      return {
        amount: remaining,
        kind: preferPending ? "pending" : "structure",
        label: preferPending
          ? `Pending ${cfg.name}`
          : `${cfg.name} (assigned)`,
        feeConfigId: cfg.id,
        feeName: cfg.name,
      };
    }
  }

  return null;
}
