"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { SidebarActiveIndicator } from "./sidebar-active-indicator";

interface SidebarMenuItemProps {
  icon: React.ElementType;
  title: string;
  href: string;
  isActive?: boolean;
  badge?: string | number;
  className?: string;
  onClick?: () => void;
}

export function SidebarMenuItem({
  icon: Icon,
  title,
  href,
  isActive = false,
  badge,
  className,
  onClick,
}: SidebarMenuItemProps) {
  return (
    <div className={cn("relative", className)}>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "menu-item-group relative flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200",
          "hover:bg-sidebar-accent/40 hover:shadow-sm",
          isActive && "bg-sidebar-accent/40 shadow-sm"
        )}
      >
        {isActive && <SidebarActiveIndicator variant="border" />}
        {!isActive && (
          <div className="menu-item-group-hover-indicator opacity-0 menu-item-group-hover:opacity-100 transition-opacity duration-200 absolute inset-0 pointer-events-none">
            <SidebarActiveIndicator variant="border" />
          </div>
        )}

        <div
          data-icon-container
          data-active={isActive || undefined}
          className={cn(
            "flex items-center justify-center rounded-lg p-1.5 transition-all duration-200",
            isActive
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/30"
              : "bg-sidebar-accent/50 text-sidebar-foreground/70 menu-item-group-hover:bg-sidebar-primary menu-item-group-hover:text-sidebar-primary-foreground menu-item-group-hover:shadow-md menu-item-group-hover:shadow-sidebar-primary/30"
          )}
        >
          <Icon className="size-4 icon-svg" />
        </div>

        <span
          className={cn(
            "font-medium flex-1 text-left transition-colors duration-200",
            isActive
              ? "text-sidebar-foreground font-semibold"
              : "text-sidebar-foreground/80 menu-item-group-hover:text-sidebar-foreground menu-item-group-hover:font-semibold"
          )}
        >
          {title}
        </span>

        {badge !== undefined && (
          <span className="flex items-center justify-center rounded-full bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold min-w-[20px] h-5 px-1.5">
            {badge}
          </span>
        )}
      </Link>
    </div>
  );
}
