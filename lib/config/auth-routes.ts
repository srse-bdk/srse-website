import type { UserRole } from "@/lib/types/user.type";

/** Marketing and other pages that do not require login. */
export const PUBLIC_PATH_PREFIXES = [
  "/about",
  "/contact",
  "/facilities",
  "/gallery",
  "/fee-structure",
  "/privacy",
  "/blogs",
  "/signin",
] as const;

export const VALID_PORTAL_ROLES: UserRole[] = [
  "admin",
  "staff",
  "student",
  "parent",
  "scanner",
];

export const PROTECTED_ROLE_SEGMENTS: UserRole[] = [...VALID_PORTAL_ROLES];

export const GATE_PATH_PREFIX = "/gate";

const ROLE_PATH_PATTERN = new RegExp(
  `^/(${PROTECTED_ROLE_SEGMENTS.join("|")})(/|$)`,
);

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname.startsWith("/api/")) return true;
  if (pathname.startsWith("/_next/")) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isGatePath(pathname: string): boolean {
  return (
    pathname === GATE_PATH_PREFIX ||
    pathname.startsWith(`${GATE_PATH_PREFIX}/`)
  );
}

export function isRoleScopedPath(pathname: string): boolean {
  return ROLE_PATH_PATTERN.test(pathname);
}

export function getRoleFromPath(pathname: string): UserRole | null {
  const match = pathname.match(ROLE_PATH_PATTERN);
  return (match?.[1] as UserRole) || null;
}

/** Any path that requires a signed-in user with a valid portal role. */
export function isProtectedAppPath(pathname: string): boolean {
  if (isPublicPath(pathname)) return false;
  return isGatePath(pathname) || isRoleScopedPath(pathname);
}

export function canAccessGate(role: UserRole): boolean {
  return role === "admin" || role === "scanner";
}

export function isValidPortalRole(role: string): role is UserRole {
  return VALID_PORTAL_ROLES.includes(role as UserRole);
}
