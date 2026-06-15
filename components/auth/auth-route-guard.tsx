"use client";

import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useAppStore } from "@/hooks/use-app-store";
import {
  isGatePath,
  isProtectedAppPath,
  isPublicPath,
  canAccessGate,
  getRoleFromPath,
  isRoleScopedPath,
} from "@/lib/config/auth-routes";
import {
  canRoleAccessPath,
  canUserAccessPathname,
  getDefaultRouteForRole,
  getRolePathSuffix,
} from "@/lib/config/role-access";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { toast } from "sonner";

export function AuthRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppStore((state) => state.user);
  const authReady = useAppStore((state) => state.authReady);

  const accessContext = useMemo(
    () => ({
      userId: user?.uid,
      studentId: user?.studentId,
    }),
    [user?.uid, user?.studentId],
  );

  const gateBlocked =
    authReady &&
    user?.role &&
    isGatePath(pathname) &&
    !canAccessGate(user.role);

  const roleBlocked =
    authReady &&
    user?.role &&
    isRoleScopedPath(pathname) &&
    !canUserAccessPathname(user.role, pathname, accessContext);

  const needsAuth =
    authReady && isProtectedAppPath(pathname) && !user?.role;

  useEffect(() => {
    if (!authReady) return;

    if (pathname === "/signin" && user?.role) {
      const next = searchParams.get("next");
      if (next && canUserAccessPathname(user.role, next, accessContext)) {
        router.replace(next);
      } else {
        router.replace(getDefaultRouteForRole(user.role));
      }
      return;
    }

    if (isPublicPath(pathname)) return;

    if (!user?.role) {
      if (isProtectedAppPath(pathname)) {
        router.replace(`/signin?next=${encodeURIComponent(pathname)}`);
      }
      return;
    }

    if (isGatePath(pathname) && !canAccessGate(user.role)) {
      toast.error("You do not have access to gate scanners.");
      router.replace(getDefaultRouteForRole(user.role));
      return;
    }

    if (isRoleScopedPath(pathname)) {
      const urlRole = getRoleFromPath(pathname);
      if (urlRole && urlRole !== user.role) {
        router.replace(getDefaultRouteForRole(user.role));
        return;
      }

      const pathSuffix = getRolePathSuffix(pathname, user.role);
      if (!canRoleAccessPath(user.role, pathSuffix, accessContext)) {
        toast.error("You do not have access to this page.");
        router.replace(getDefaultRouteForRole(user.role));
      }
    }
  }, [
    authReady,
    user,
    pathname,
    router,
    searchParams,
    accessContext,
  ]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LogoSpinner size={100} />
      </div>
    );
  }

  if (needsAuth || gateBlocked || roleBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LogoSpinner size={100} />
      </div>
    );
  }

  return <>{children}</>;
}

/** @deprecated Use AuthRouteGuard — kept for imports that expect a null render guard */
export function RoleRouteGuard() {
  return null;
}
