"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface SidebarActiveIndicatorProps {
  className?: string;
  variant?: "border" | "background";
}

export function SidebarActiveIndicator({
  className,
  variant = "border",
}: SidebarActiveIndicatorProps) {
  if (variant === "border") {
    return (
      <motion.div
        layoutId="activeIndicator"
        className={cn(
          "absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary shadow-lg shadow-sidebar-primary/50",
          className
        )}
        transition={{
          type: "spring",
          stiffness: 380,
          damping: 30,
        }}
      />
    );
  }

  return (
    <motion.div
      layoutId="activeIndicator"
      className={cn(
        "absolute inset-0 rounded-lg bg-sidebar-primary/10 border-l-2 border-sidebar-primary",
        className
      )}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 30,
      }}
    />
  );
}
