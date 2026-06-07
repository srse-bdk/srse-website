"use client";

import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Users, CheckCircle, XCircle } from "lucide-react";
import type { Class } from "@/lib/types/class.type";
import { ClassesTable } from "./_components/classes-table";

export default function ClassesPage() {
  const { data, loading, error } = useFirebaseRealtime<Class>("classes", {
    asArray: true,
  });

  const classes = (data as Class[]) || [];

  // Calculate stats
  const activeClasses = classes.filter((c) => c.status === "active");
  const totalSections = classes.reduce((sum, c) => sum + c.sections.length, 0);
  const stats = {
    total: classes.length,
    active: activeClasses.length,
    inactive: classes.filter((c) => c.status === "inactive").length,
    sections: totalSections,
  };

  if (loading) {
    const skeletonCardKeys = [
      "stats-total",
      "stats-active",
      "stats-inactive",
      "stats-sections",
    ];

    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {skeletonCardKeys.map((key) => (
            <Card key={key}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-red-600">Error</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Failed to load classes. Please try again."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
      {/* Compact Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <Card className="border border-border/50 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/30 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 truncate">
                Total Classes
              </p>
              <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stats.total}
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/50 bg-gradient-to-br from-green-50/50 via-card/60 to-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300/50 dark:from-green-950/20 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 truncate">
                Active Classes
              </p>
              <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
                {stats.active}
              </div>
            </div>
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-1.5 sm:p-2 flex-shrink-0">
              <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/50 bg-gradient-to-br from-red-50/50 via-card/60 to-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 hover:border-red-300/50 dark:from-red-950/20 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 truncate">
                Inactive Classes
              </p>
              <div className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                {stats.inactive}
              </div>
            </div>
            <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-1.5 sm:p-2 flex-shrink-0">
              <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/50 bg-gradient-to-br from-blue-50/50 via-card/60 to-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 hover:border-blue-300/50 dark:from-blue-950/20 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 truncate">
                Total Sections
              </p>
              <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">
                {stats.sections}
              </div>
            </div>
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-1.5 sm:p-2 flex-shrink-0">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Classes Table */}
      <ClassesTable classes={classes} />
    </div>
  );
}
