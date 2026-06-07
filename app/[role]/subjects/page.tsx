"use client";

import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookText, CheckCircle, XCircle } from "lucide-react";
import type { Subject } from "@/lib/types/subject.type";
import { SubjectsTable } from "./_components/subjects-table";

export default function SubjectsPage() {
  const { data, loading, error } = useFirebaseRealtime<Subject>("subjects", {
    asArray: true,
  });

  const subjects = (data as Subject[]) || [];

  // Calculate stats
  const stats = {
    total: subjects.length,
    active: subjects.filter((s) => s.status === "active").length,
    inactive: subjects.filter((s) => s.status === "inactive").length,
  };

  if (loading) {
    const skeletonCardKeys = ["stats-total", "stats-active", "stats-inactive"];

    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
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
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load subjects. Please try again."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl">
      {/* Compact Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
        <Card className="border border-border/50 bg-gradient-to-br from-card/80 via-card/60 to-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 hover:border-primary/30 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 truncate">
                Total Subjects
              </p>
              <div className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {stats.total}
              </div>
            </div>
            <div className="rounded-lg bg-primary/10 p-1.5 sm:p-2 flex-shrink-0">
              <BookText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="border border-border/50 bg-gradient-to-br from-green-50/50 via-card/60 to-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 hover:border-green-300/50 dark:from-green-950/20 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 truncate">
                Active
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

        <Card className="border border-border/50 bg-gradient-to-br from-yellow-50/50 via-card/60 to-card/40 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200 hover:border-yellow-300/50 dark:from-yellow-950/20 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-1 truncate">
                Inactive
              </p>
              <div className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.inactive}
              </div>
            </div>
            <div className="rounded-lg bg-yellow-100 dark:bg-yellow-900/30 p-1.5 sm:p-2 flex-shrink-0">
              <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </Card>
      </div>

      {/* Subjects Table */}
      <SubjectsTable subjects={subjects} />
    </div>
  );
}
