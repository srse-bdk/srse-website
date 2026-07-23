import type { Student } from "@/lib/types/student.type";

const NUMBER_TO_ROMAN: Record<string, string> = {
  "1": "I",
  "2": "II",
  "3": "III",
  "4": "IV",
  "5": "V",
  "6": "VI",
  "7": "VII",
  "8": "VIII",
  "9": "IX",
  "10": "X",
  "11": "XI",
  "12": "XII",
};

function stripClassPrefix(className: string): string {
  return className
    .replace(/^class\s+/i, "")
    .replace(/^grade\s+/i, "")
    .replace(/^std\.?\s+/i, "")
    .trim();
}

/** Detect Pre-Nursery before plain Nursery (both contain "NURSERY"). */
function isPreNurseryClass(value: string): boolean {
  const upper = value.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  return (
    /\bPRE\s*NURSERY\b/.test(upper) ||
    upper.includes("PRENURSERY") ||
    upper === "PRE NUR" ||
    upper.startsWith("PRE NUR")
  );
}

/**
 * Strip a trailing single-letter section accidentally stored in the class
 * field (e.g. "PRE NURSERY-A" → "PRE NURSERY").
 */
function stripEmbeddedSectionFromClass(className: string): string {
  const trimmed = className.trim();
  const withoutTrailingLetter = trimmed.replace(/\s*-\s*[A-Za-z]\s*$/, "").trim();
  return withoutTrailingLetter || trimmed;
}

export function abbreviateClassNameForDisplay(className?: string): string {
  const value = String(className || "").trim();
  if (!value) return "";

  const cleaned = stripEmbeddedSectionFromClass(value);
  const upper = cleaned.toUpperCase();

  // Pre-Nursery must be checked before Nursery — both contain "NURSERY".
  if (isPreNurseryClass(cleaned)) return "PRE NURSERY";
  if (upper.includes("NURSERY")) return "NURSERY";
  if (upper === "LKG") return "LKG";
  if (upper === "UKG") return "UKG";

  const stripped = stripClassPrefix(cleaned);
  if (!stripped) return upper;

  const strippedUpper = stripped.toUpperCase();
  if (/^[IVXLCDM]+$/i.test(stripped)) {
    return strippedUpper;
  }

  if (/^\d+$/.test(stripped)) {
    return NUMBER_TO_ROMAN[stripped] || stripped;
  }

  return strippedUpper;
}

export function formatClassSectionDisplay(student: Student): string {
  const cls = abbreviateClassNameForDisplay(student.currentClass);
  const sec = String(student.currentSection || "").trim().toUpperCase();

  // Section "PRE" is a class fragment for Pre-Nursery, not a section label.
  if (
    cls === "PRE NURSERY" &&
    (sec === "PRE" || sec === "PRENURSERY" || sec.startsWith("PRE"))
  ) {
    return "PRE NURSERY";
  }

  if (cls && sec) return `${cls}-${sec}`;
  if (cls) return cls;
  return "-";
}

export function formatGenderLabel(gender?: string): string {
  if (!gender) return "";
  const normalized = gender.toLowerCase();
  if (normalized === "male") return "Male";
  if (normalized === "female") return "Female";
  if (normalized === "other") return "Other";
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}

export function getStudentPrimaryContact(student: Student): {
  name?: string;
  phone?: string;
} {
  const fatherGuardian = student.guardians?.find(
    (guardian) => guardian.relationship === "father",
  );
  const motherGuardian = student.guardians?.find(
    (guardian) => guardian.relationship === "mother",
  );
  const primaryGuardian = student.guardians?.find(
    (guardian) => guardian.isPrimary,
  );

  const name =
    fatherGuardian?.name ||
    primaryGuardian?.name ||
    student.fatherName ||
    motherGuardian?.name ||
    student.motherName;

  const phone =
    fatherGuardian?.phone ||
    primaryGuardian?.phone ||
    student.phone ||
    motherGuardian?.phone ||
    student.alternatePhone;

  return {
    name: name?.trim() || undefined,
    phone: phone?.trim() || undefined,
  };
}
