"use client";

import { motion, AnimatePresence } from "motion/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSidebar } from "@/components/ui/sidebar";
import { SidebarActiveIndicator } from "./sidebar-active-indicator";

export type SubMenuItem = {
  title: string;
  url: string;
  icon?: React.ElementType;
};

interface SidebarSubmenuProps {
  title: string;
  icon: React.ElementType;
  items: SubMenuItem[];
  isOpen: boolean;
  onToggle: () => void;
  activePath: string;
  currentSearchParams?: string;
  hasActiveSubItem: boolean;
}

// Helper function to check if path is active
function isPathActive(pathname: string, href: string, currentSearchParams?: string): boolean {
  try {
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
  } catch (e) {
    return pathname === href;
  }
}

export function SidebarSubmenu({
  title,
  icon: Icon,
  items,
  isOpen,
  onToggle,
  activePath,
  currentSearchParams,
  hasActiveSubItem,
}: SidebarSubmenuProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  // Sort by URL length (longest first) to find most specific match
  const sortedSubItems = [...items].sort((a, b) => b.url.length - a.url.length);

  return (
    <div className="relative">
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className={cn(
              "menu-item-group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
              "hover:bg-sidebar-accent/40 hover:shadow-sm",
              hasActiveSubItem && "bg-sidebar-accent/40 shadow-sm"
            )}
          >
            {hasActiveSubItem && <SidebarActiveIndicator variant="border" />}
            {!hasActiveSubItem && (
              <div className="menu-item-group-hover-indicator opacity-0 menu-item-group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 pointer-events-none">
                <SidebarActiveIndicator variant="border" />
              </div>
            )}

            <div
              data-icon-container
              data-active={hasActiveSubItem || undefined}
              className={cn(
                "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
                hasActiveSubItem
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/30"
                  : "bg-sidebar-accent/50 text-sidebar-foreground/70 menu-item-group-hover:bg-sidebar-primary menu-item-group-hover:text-sidebar-primary-foreground menu-item-group-hover:shadow-md menu-item-group-hover:shadow-sidebar-primary/30"
              )}
            >
              <Icon className="size-4 icon-svg" />
            </div>

            <span
              className={cn(
                "font-medium flex-1 text-left transition-colors duration-200",
                hasActiveSubItem
                  ? "text-sidebar-foreground font-semibold"
                  : "text-sidebar-foreground/80 menu-item-group-hover:text-sidebar-foreground menu-item-group-hover:font-semibold"
              )}
            >
              {title}
            </span>

            <motion.div
              animate={{ rotate: isOpen ? 90 : 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <ChevronRight className="size-4 text-sidebar-foreground/60 transition-colors duration-200 menu-item-group-hover:text-sidebar-foreground/80" />
            </motion.div>
          </button>
        </CollapsibleTrigger>

        <AnimatePresence>
          {isOpen && (
            <CollapsibleContent asChild>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{
                  duration: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="overflow-hidden"
              >
                <div className="ml-4 mt-1.5 space-y-0.5 border-l-2 border-sidebar-border/50 pl-4">
                  {items.map((subItem) => {
                    const isSubActive =
                      sortedSubItems.find((si) =>
                        isPathActive(activePath, si.url, currentSearchParams)
                      )?.url === subItem.url;

                    return (
                      <div key={subItem.title}>
                        <Link
                          href={subItem.url}
                          onClick={() => {
                            if (isMobile) setOpenMobile(false);
                          }}
                          className={cn(
                            "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-all duration-200",
                            "hover:bg-sidebar-accent/50 hover:shadow-sm",
                            isSubActive &&
                            "bg-sidebar-primary/10 text-sidebar-foreground font-medium shadow-sm"
                          )}
                        >
                          {isSubActive && (
                            <motion.div
                              className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-sidebar-primary"
                              layoutId="subActiveIndicator"
                              transition={{
                                type: "spring",
                                stiffness: 380,
                                damping: 30,
                              }}
                            />
                          )}

                          {subItem.icon ? (
                            <subItem.icon
                              className={cn(
                                "size-3.5 transition-colors duration-200",
                                isSubActive
                                  ? "text-sidebar-primary"
                                  : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                              )}
                            />
                          ) : (
                            <div className="size-3.5 rounded-full bg-sidebar-border" />
                          )}

                          <span
                            className={cn(
                              "transition-colors duration-200",
                              isSubActive
                                ? "text-sidebar-foreground"
                                : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
                            )}
                          >
                            {subItem.title}
                          </span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </CollapsibleContent>
          )}
        </AnimatePresence>
      </Collapsible>
    </div>
  );
}
