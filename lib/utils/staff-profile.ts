import type { User } from "@/lib/types/user.type";

/** Non-teaching staff stored for ID cards only — no Firebase Auth login. */
export function isProfileOnlyStaff(
  staff: Pick<User, "staffType" | "hasLogin" | "email"> | null | undefined,
): boolean {
  if (!staff) return false;
  if (staff.hasLogin === false) return true;
  return staff.staffType === "non-teaching" && !staff.email?.trim();
}
