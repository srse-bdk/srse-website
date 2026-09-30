import type { FeeConfiguration } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { getAcademicYearForDate } from "@/lib/utils/fee-dues";

export type SelectableFeeKind =
  | "admission"
  | "readmission"
  | "uniform"
  | "transport";

export const SELECTABLE_FEE_KINDS: SelectableFeeKind[] = [
  "admission",
  "readmission",
  "uniform",
  "transport",
];

export const SELECTABLE_FEE_LABELS: Record<SelectableFeeKind, string> = {
  admission: "Admission Fee",
  readmission: "Re-admission Fee",
  uniform: "Uniform Fee",
  transport: "Transport Fee",
};

/** Admission and re-admission cannot both apply to the same student. */
export const MUTUALLY_EXCLUSIVE_FEE_KINDS: SelectableFeeKind[][] = [
  ["admission", "readmission"],
];

const KIND_KEYWORDS: Record<SelectableFeeKind, string[]> = {
  admission: ["admission"],
  readmission: ["readmission", "re-admission", "re admission"],
  uniform: ["uniform"],
  transport: ["transport"],
};

function normalize(value?: string) {
  return (value || "").trim().toLowerCase();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesKeywords(text: string, keywords: string[]) {
  const n = normalize(text);
  if (!n) return false;
  return keywords.some((k) => {
    const phrase = normalize(k);
    if (!phrase) return false;
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegExp(phrase)}([^a-z0-9]|$)`,
      "i",
    );
    return pattern.test(n);
  });
}

function isReadmissionName(name: string) {
  const n = normalize(name);
  return (
    n.includes("readmission") ||
    n.includes("re-admission") ||
    n.includes("re admission")
  );
}

export function configMatchesSelectableKind(
  config: FeeConfiguration,
  kind: SelectableFeeKind,
): boolean {
  if (kind === "admission") {
    if (isReadmissionName(config.name)) return false;
    return matchesKeywords(config.name, KIND_KEYWORDS.admission);
  }
  if (kind === "readmission") {
    return isReadmissionName(config.name);
  }
  return matchesKeywords(config.name, KIND_KEYWORDS[kind]);
}

/** Prefer current academic year configs; fall back to any matching name. */
export function findSelectableFeeConfig(
  configs: FeeConfiguration[],
  kind: SelectableFeeKind,
  asOf = new Date(),
): FeeConfiguration | null {
  const academicYear = getAcademicYearForDate(asOf);
  const matches = configs.filter((cfg) =>
    configMatchesSelectableKind(cfg, kind),
  );
  if (matches.length === 0) return null;
  const forYear = matches.filter(
    (cfg) => !cfg.academicYear || cfg.academicYear === academicYear,
  );
  return forYear[0] || matches[0] || null;
}

export function isSelectableFeeIncluded(
  student: Student,
  config: FeeConfiguration,
): boolean {
  const excluded = student.excludedFeeConfigIds || [];
  if (excluded.includes(config.id)) return false;

  if (config.isOptional) {
    const ids = student.optionalFeeIds || [];
    const amounts = student.optionalFeeAmounts || {};
    return ids.includes(config.id) || amounts[config.id] != null;
  }

  // Mandatory: included unless explicitly excluded
  return true;
}

export function resolveSelectableFeeAmount(
  student: Student,
  config: FeeConfiguration,
): number {
  if (
    config.isOptional &&
    student.optionalFeeAmounts?.[config.id] != null
  ) {
    return Number(student.optionalFeeAmounts[config.id]) || 0;
  }
  const classKey = student.currentClass || "unassigned";
  return Number(config.classFees?.[classKey] || 0);
}

/**
 * If both admission and re-admission would be included, keep `preferred`
 * (default admission) and force the other off.
 */
export function enforceAdmissionReadmissionExclusivity<
  T extends { kind: SelectableFeeKind; included: boolean },
>(rows: T[], preferred: "admission" | "readmission" = "admission"): T[] {
  const admissionOn = rows.some((r) => r.kind === "admission" && r.included);
  const readmissionOn = rows.some(
    (r) => r.kind === "readmission" && r.included,
  );
  if (!(admissionOn && readmissionOn)) return rows;

  const keepOff: SelectableFeeKind =
    preferred === "admission" ? "readmission" : "admission";

  return rows.map((row) =>
    row.kind === keepOff ? { ...row, included: false } : row,
  );
}

/** Kinds that must turn off when `kind` is turned on. */
export function getExclusiveOppositeKinds(
  kind: SelectableFeeKind,
): SelectableFeeKind[] {
  for (const group of MUTUALLY_EXCLUSIVE_FEE_KINDS) {
    if (group.includes(kind)) {
      return group.filter((k) => k !== kind);
    }
  }
  return [];
}
