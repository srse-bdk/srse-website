import type { FeeConfiguration } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { getAcademicYearForDate } from "@/lib/utils/fee-dues";

export type SelectableFeeKind = "admission" | "uniform" | "transport";

export const SELECTABLE_FEE_KINDS: SelectableFeeKind[] = [
  "admission",
  "uniform",
  "transport",
];

export const SELECTABLE_FEE_LABELS: Record<SelectableFeeKind, string> = {
  admission: "Admission Fee",
  uniform: "Uniform Fee",
  transport: "Transport Fee",
};

const KIND_KEYWORDS: Record<SelectableFeeKind, string[]> = {
  admission: ["admission"],
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

export function configMatchesSelectableKind(
  config: FeeConfiguration,
  kind: SelectableFeeKind,
): boolean {
  const name = normalize(config.name);
  if (kind === "admission") {
    if (
      name.includes("readmission") ||
      name.includes("re-admission") ||
      name.includes("re admission")
    ) {
      return false;
    }
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
