"use client";

import { BarChart3, Calendar, LogOut } from "lucide-react";
import { motion } from "motion/react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem as ShadcnSidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useMenuItems } from "@/hooks/use-menu-items";
import type { UserRole } from "@/lib/types/user.type";
import { SidebarMenuItem } from "@/components/ui/sidebar-menu-item";
import { SidebarSubmenu } from "@/components/ui/sidebar-submenu";
import { cn } from "@/lib/utils";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const logoVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const logoutVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

// Helper function to check if path is active
function isPathActive(pathname: string, href: string, currentSearchParams?: string): boolean {
  const url = new URL(href, "http://localhost");
  const hrefPathname = url.pathname;
  const hrefSearch = url.search;

  // Exact match with query params if href has them
  if (hrefSearch) {
    return pathname === hrefPathname && currentSearchParams === hrefSearch.replace("?", "");
  }

  // Exact match for base path
  if (pathname === hrefPathname && !currentSearchParams) return true;

  // Prefix match for parent items
  if (pathname.startsWith(hrefPathname)) {
    const nextChar = pathname[hrefPathname.length];
    return !nextChar || nextChar === "/";
  }

  return false;
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearchParamsString = searchParams.toString();
  const params = useParams();
  const router = useRouter();
  const role = params.role as UserRole;
  const { navigationItems, settingsItems } = useMenuItems();
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  const filteredItems = navigationItems;

  // Initialize open menus based on active path - fixed with useEffect
  useEffect(() => {
    const initialOpen: Record<string, boolean> = {};
    filteredItems.forEach((item) => {
      if (item.subItems && item.subItems.length > 0) {
        const sortedSubItems = [...item.subItems].sort(
          (a, b) => b.url.length - a.url.length
        );
        const hasActiveSubItem = sortedSubItems.some((subItem) => {
          const subHref = `/${role}${subItem.url}`;
          return isPathActive(pathname, subHref, currentSearchParamsString);
        });
        if (hasActiveSubItem) {
          initialOpen[item.title] = true;
        }
      }
    });
    setOpenMenus((prev) => {
      // Only update if there are changes to avoid unnecessary re-renders
      const hasChanges = Object.keys(initialOpen).some(
        (key) => initialOpen[key] !== prev[key]
      );
      return hasChanges ? { ...prev, ...initialOpen } : prev;
    });
  }, [pathname, currentSearchParamsString, role, filteredItems]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const handleLogout = async () => {
    try {
      const { firebaseAuth } = await import("@atechhub/firebase");
      await firebaseAuth({
        action: "logout",
      });
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Format date elegantly
  const formattedDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <Sidebar variant="inset" className="border-r border-sidebar-border/50">
      <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-br from-sidebar/50 to-sidebar-accent/5 backdrop-blur-sm">
        <motion.div
          variants={headerVariants}
          initial="hidden"
          animate="visible"
          className="flex items-center gap-3 px-4 py-4"
        >
          <motion.div
            variants={logoVariants}
            initial="hidden"
            animate="visible"
            className="relative flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <BarChart3 className="size-5" />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
          </motion.div>
          <div className="grid flex-1 text-left leading-tight">
            <span className="truncate text-sm font-bold capitalize text-sidebar-foreground">
              {role} Panel
            </span>
            <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground/60">
              <Calendar className="size-3" />
              <span suppressHydrationWarning>{formattedDate}</span>
            </div>
          </div>
        </motion.div>
      </SidebarHeader>

      <SidebarContent className="gap-3 px-3 py-5">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-sidebar-foreground/50">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-1.5"
              >
                {filteredItems.map((item) => {
                  // Check if item has sub-items
                  if (item.subItems && item.subItems.length > 0) {
                    const isOpen = openMenus[item.title] || false;

                    // Check if any sub-item is active - find the most specific match
                    const sortedSubItems = [...item.subItems].sort(
                      (a, b) => b.url.length - a.url.length
                    );
                    const activeSubItem = sortedSubItems.find((subItem) => {
                      const subHref = `/${role}${subItem.url}`;
                      return isPathActive(pathname, subHref, currentSearchParamsString);
                    });
                    const hasActiveSubItem = !!activeSubItem;

                    return (
                      <motion.div key={item.title} variants={itemVariants}>
                        <SidebarSubmenu
                          title={item.title}
                          icon={item.icon as React.ElementType}
                          items={item.subItems.map((sub) => ({
                            title: sub.title,
                            url: `/${role}${sub.url}`,
                            icon: sub.icon as React.ElementType | undefined,
                          }))}
                          isOpen={isOpen}
                          onToggle={() => toggleMenu(item.title)}
                          activePath={pathname}
                          currentSearchParams={currentSearchParamsString}
                          hasActiveSubItem={hasActiveSubItem}
                        />
                      </motion.div>
                    );
                  }

                  // Regular menu item without sub-items
                  const href = item.url ? `/${role}${item.url}` : "#";
                  const isActive = item.url
                    ? isPathActive(pathname, href, currentSearchParamsString)
                    : false;

                  return (
                    <motion.div key={item.title} variants={itemVariants}>
                      <SidebarMenuItem
                        icon={item.icon as React.ElementType}
                        title={item.title}
                        href={href}
                        isActive={isActive}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="mx-3 my-4 bg-sidebar-border/50" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-1.5"
              >
                {settingsItems.map((item) => {
                  const href = `/${role}${item.url}`;
                  const isActive = isPathActive(pathname, href);

                  return (
                    <motion.div key={item.title} variants={itemVariants}>
                      <SidebarMenuItem
                        icon={item.icon as React.ElementType}
                        title={item.title}
                        href={href}
                        isActive={isActive}
                      />
                    </motion.div>
                  );
                })}
              </motion.div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 px-3 py-4">
        <SidebarMenu>
          <motion.div
            variants={logoutVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.02, x: 2 }}
            whileTap={{ scale: 0.98 }}
          >
            <ShadcnSidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip="Logout"
                className={cn(
                  "group relative w-full transition-all duration-200 rounded-lg",
                  "bg-destructive/5 text-destructive hover:bg-destructive/10 hover:text-destructive",
                  "dark:bg-destructive/10 dark:hover:bg-destructive/20",
                  "border border-destructive/20 hover:border-destructive/30",
                  "shadow-sm hover:shadow-md hover:shadow-destructive/10"
                )}
              >
                <motion.div
                  whileHover={{ rotate: -15, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <LogOut className="size-4" />
                </motion.div>
                <span className="font-semibold">Logout</span>
              </SidebarMenuButton>
            </ShadcnSidebarMenuItem>
          </motion.div>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
