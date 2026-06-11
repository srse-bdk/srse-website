"use client";

import { useAppStore } from "@/hooks/use-app-store";
import {
  canRoleAccessPath,
  getDefaultRouteForRole,
  getRolePathSuffix,
} from "@/lib/config/role-access";
import type { UserRole } from "@/lib/types/user.type";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

export function RoleRouteGuard() {
  const pathname = usePathname();
  const params = useParams();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const urlRole = params.role as UserRole;

  useEffect(() => {
    if (!user?.role) {
      return;
    }

    if (user.role !== urlRole) {
      router.replace(getDefaultRouteForRole(user.role));
      return;
    }

    const pathSuffix = getRolePathSuffix(pathname, user.role);
    const allowed = canRoleAccessPath(user.role, pathSuffix, {
      userId: user.uid,
      studentId: user.studentId,
    });

    if (!allowed) {
      toast.error("You do not have access to this page.");
      router.replace(getDefaultRouteForRole(user.role));
    }
  }, [user, pathname, urlRole, router]);

  return null;
}
