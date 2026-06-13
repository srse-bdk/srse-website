import type { BloodGroup } from "@/lib/types/student.type";

export const BLOOD_GROUP_OPTIONS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

/** Normalize stored/imported blood group values to a valid BloodGroup. */
export function normalizeBloodGroup(
  value?: string | null,
): BloodGroup | undefined {
  if (!value) return undefined;

  const normalized = String(value).trim().toUpperCase().replace(/\s+/g, "");
  if (!normalized) return undefined;

  return BLOOD_GROUP_OPTIONS.includes(normalized as BloodGroup)
    ? (normalized as BloodGroup)
    : undefined;
}
