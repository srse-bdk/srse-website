import type { Student } from "@/lib/types/student.type";

export function abbreviateClassNameForDisplay(className?: string): string {
  const value = String(className || "").trim();
  if (!value) return "";

  const upper = value.toUpperCase();
  if (upper.includes("NURSERY")) return "NUR";
  if (upper === "LKG") return "LKG";
  if (upper === "UKG") return "UKG";

  return upper;
}

export function formatClassSectionDisplay(student: Student): string {
  const cls = abbreviateClassNameForDisplay(student.currentClass);
  const sec = String(student.currentSection || "").trim().toUpperCase();
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
