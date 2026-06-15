import { canAccessGate, isGatePath } from "@/lib/config/auth-routes";
import type { UserRole } from "@/lib/types/user.type";

export type RoleAccessContext = {
  userId?: string;
  studentId?: string;
};

export function getDefaultRouteForRole(role: UserRole): string {
  if (role === "scanner") {
    return "/gate/entry";
  }
  return `/${role}/dashboard`;
}

/** Path after the role prefix, e.g. `/fees` from `/student/fees`. */
export function getRolePathSuffix(pathname: string, role: UserRole): string {
  const prefix = `/${role}`;
  if (pathname === prefix || pathname === `${prefix}/`) {
    return "/dashboard";
  }
  if (pathname.startsWith(`${prefix}/`)) {
    return pathname.slice(prefix.length);
  }
  return pathname;
}

function splitPath(path: string): string[] {
  return path.split("?")[0].split("/").filter(Boolean);
}

function matchesRoute(pattern: string, path: string): boolean {
  const patternParts = splitPath(pattern);
  const pathParts = splitPath(path);

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  return patternParts.every(
    (part, index) => part.startsWith(":") || part === pathParts[index],
  );
}

const PARENT_ROUTE_PATTERNS = [
  "/dashboard",
  "/settings",
  "/children",
  "/fees",
  "/time-table",
  "/time-table/:id",
];

const STUDENT_ROUTE_PATTERNS = [
  "/dashboard",
  "/settings",
  "/fees",
  "/time-table",
  "/time-table/:id",
  "/students/:studentId",
];

const STAFF_ROUTE_PATTERNS = [
  "/dashboard",
  "/settings",
  "/attendance",
  "/leave",
  "/staffs/:staffId/time-table",
];

const SCANNER_ROUTE_PATTERNS = ["/scanner", "/scanner/entry", "/scanner/exit"];

function matchesAnyPattern(patterns: string[], path: string): boolean {
  return patterns.some((pattern) => matchesRoute(pattern, path));
}

export function canRoleAccessPath(
  role: UserRole,
  pathSuffix: string,
  context: RoleAccessContext = {},
): boolean {
  if (role === "admin") {
    return true;
  }

  const path = pathSuffix || "/dashboard";

  if (role === "scanner") {
    return matchesAnyPattern(SCANNER_ROUTE_PATTERNS, path);
  }

  if (role === "parent") {
    return matchesAnyPattern(PARENT_ROUTE_PATTERNS, path);
  }

  if (role === "student") {
    if (!matchesAnyPattern(STUDENT_ROUTE_PATTERNS, path)) {
      return false;
    }

    const profileMatch = path.match(/^\/students\/([^/]+)/);
    if (profileMatch) {
      return Boolean(
        context.studentId && profileMatch[1] === context.studentId,
      );
    }

    return true;
  }

  if (role === "staff") {
    if (path === "/time-table/generate" || path.startsWith("/time-table/generate")) {
      return false;
    }

    const staffPathMatch = path.match(/^\/staffs\/([^/]+)(\/.*)?$/);
    if (staffPathMatch) {
      const staffId = staffPathMatch[1];
      const subPath = staffPathMatch[2] || "";
      if (staffId !== context.userId) {
        return false;
      }
      return subPath === "" || subPath === "/time-table";
    }

    return matchesAnyPattern(STAFF_ROUTE_PATTERNS, path);
  }

  return false;
}

export function canUserAccessPathname(
  role: UserRole,
  pathname: string,
  context: RoleAccessContext = {},
): boolean {
  if (canAccessGate(role) && isGatePath(pathname)) {
    return true;
  }

  const urlRole = pathname.split("/")[1] as UserRole;
  if (urlRole !== role) {
    return false;
  }

  const pathSuffix = getRolePathSuffix(pathname, role);
  return canRoleAccessPath(role, pathSuffix, context);
}
