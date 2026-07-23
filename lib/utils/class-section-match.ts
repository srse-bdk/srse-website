function normalizeClassToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/\bclass\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function romanToNumberToken(value: string): string {
  const romanMap: Record<string, string> = {
    i: "1",
    ii: "2",
    iii: "3",
    iv: "4",
    v: "5",
    vi: "6",
    vii: "7",
    viii: "8",
    ix: "9",
    x: "10",
  };
  return romanMap[value.toLowerCase()] || "";
}

function classTokenVariants(value: string): Set<string> {
  const variants = new Set<string>();
  const base = normalizeClassToken(value);
  if (!base) return variants;

  variants.add(base);

  const romanAsNumber = romanToNumberToken(base);
  if (romanAsNumber) {
    variants.add(romanAsNumber);
  }

  const leadingNumberMatch = base.match(/^(\d+)[a-z]?$/);
  if (leadingNumberMatch?.[1]) {
    variants.add(leadingNumberMatch[1]);
  }

  return variants;
}

export function normalizePersonName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function personNamesMatch(importName: string, storedName: string): boolean {
  const left = normalizePersonName(importName);
  const right = normalizePersonName(storedName);

  if (!left || !right) return false;
  if (left === right) return true;

  const leftTokens = left.split(" ");
  const rightTokens = right.split(" ");

  if (leftTokens.length >= 2 && leftTokens.length <= rightTokens.length) {
    return leftTokens.every((token, index) => rightTokens[index] === token);
  }

  return false;
}

export function normalizeSectionToken(value?: string): string {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";
  return raw.split(/\s+/)[0];
}

function isPreNurseryClassName(value: string): boolean {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  return (
    /\bPRE\s*NURSERY\b/.test(upper) ||
    upper.includes("PRENURSERY") ||
    upper.startsWith("PRE NUR")
  );
}

function normalizeImportClassName(raw: string): string {
  const value = raw.trim();
  if (!value) return "";

  const primaryToken = value.includes("/") ? value.split("/")[0].trim() : value;
  const upper = primaryToken.toUpperCase();

  // Pre-Nursery must be checked before Nursery — both contain "NURSERY".
  if (isPreNurseryClassName(primaryToken)) return "Pre Nursery";
  if (upper.includes("NURSERY")) return "Nursery";
  if (upper === "LKG") return "LKG";
  if (upper === "UKG") return "UKG";
  if (/^[IVXLCDM]+$/i.test(primaryToken)) return primaryToken.toUpperCase();
  if (/^\d+$/.test(primaryToken)) return primaryToken;

  return primaryToken;
}

export function parseCombinedClassSection(value: string): {
  currentClass?: string;
  currentSection?: string;
} {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "-") return {};

  if (trimmed.includes("/")) {
    const parts = trimmed.split("/").map((part) => part.trim()).filter(Boolean);
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1];
      if (/^[A-Za-z]$/.test(lastPart)) {
        return {
          currentClass: normalizeImportClassName(parts.slice(0, -1).join("/")),
          currentSection: lastPart.toUpperCase(),
        };
      }
    }
  }

  const dashMatch = trimmed.match(/^(.+?)\s*-\s*([A-Za-z])\s*$/);
  if (dashMatch) {
    return {
      currentClass: normalizeImportClassName(dashMatch[1].trim()),
      currentSection: dashMatch[2].toUpperCase(),
    };
  }

  return { currentClass: normalizeImportClassName(trimmed) };
}

export function classTokensMatch(left: string, right: string): boolean {
  const leftVariants = classTokenVariants(left);
  const rightVariants = classTokenVariants(right);

  if (leftVariants.size === 0 || rightVariants.size === 0) return false;

  for (const variant of leftVariants) {
    if (rightVariants.has(variant)) return true;
  }

  return false;
}

export function sectionTokensMatch(left?: string, right?: string): boolean {
  const leftToken = normalizeSectionToken(left);
  const rightToken = normalizeSectionToken(right);

  if (!leftToken || !rightToken) return true;
  return leftToken === rightToken;
}

export function studentClassSectionMatches(
  studentClass?: string,
  studentSection?: string,
  rowClass?: string,
  rowSection?: string,
): boolean {
  if (!rowClass && !rowSection) return true;

  if (rowClass && studentClass && !classTokensMatch(rowClass, studentClass)) {
    return false;
  }

  if (rowSection && studentSection && !sectionTokensMatch(rowSection, studentSection)) {
    return false;
  }

  return true;
}

export function timeTableMatchesStudentClass(params: {
  timetableClassName: string;
  timetableClassId?: string;
  timetableSection: string;
  studentClass?: string;
  studentSection?: string;
  resolvedClassId?: string;
}): boolean {
  const {
    timetableClassName,
    timetableClassId,
    timetableSection,
    studentClass,
    studentSection,
    resolvedClassId,
  } = params;

  const classMatches =
    Boolean(resolvedClassId && timetableClassId === resolvedClassId) ||
    Boolean(studentClass && classTokensMatch(timetableClassName, studentClass));

  if (!classMatches) return false;
  return sectionTokensMatch(timetableSection, studentSection);
}
