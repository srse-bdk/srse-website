"use client";

import {
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { useQueryState, parseAsString } from "nuqs";
import { Users, Clock, TrendingUp, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { attendanceService } from "@/lib/services";
import type { AdminAnalytics } from "@/lib/types/attendance.type";
import { toast } from "sonner";

export interface AdminAttendanceAnalyticsRef {
  refetch: () => void;
}

export const AdminAttendanceAnalytics = forwardRef<AdminAttendanceAnalyticsRef>(
  (_, ref) => {
    const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
    const [loading, setLoading] = useState(true);

    // URL state management
    const [period, setPeriod] = useQueryState(
      "analyticsPeriod",
      parseAsString.withDefault("week").withOptions({
        clearOnDefault: true,
      }),
    );

    const loadAnalytics = useCallback(async () => {
      try {
        setLoading(true);
        const data = await attendanceService.getAdminAnalytics(
          (period as "week" | "month") || "week",
        );
        setAnalytics(data);
      } catch (error) {
        console.error("Failed to load analytics:", error);
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }, [period]);

    useEffect(() => {
      loadAnalytics();
    }, [loadAnalytics]);

    useImperativeHandle(ref, () => ({
      refetch: loadAnalytics,
    }));

    if (loading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Organization Analytics</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </CardContent>
        </Card>
      );
    }

    if (!analytics) {
      return null;
    }

    return (
      <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold tracking-tight">Organization Analytics</CardTitle>
              <p className="text-xs text-muted-foreground font-medium">Performance overview for the selected period</p>
            </div>
            <Select
              value={period || "week"}
              onValueChange={(v) => setPeriod(v as "week" | "month")}
            >
              <SelectTrigger className="w-full sm:w-36 bg-background/50 border-none ring-1 ring-border shadow-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            <div className="space-y-2 p-3 rounded-xl bg-primary/5 ring-1 ring-primary/10">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-primary uppercase tracking-wider">
                <Users className="size-3.5" />
                <span>Total Staff</span>
              </div>
              <div className="text-xl sm:text-2xl font-black">{analytics.totalStaff}</div>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-green-500/5 ring-1 ring-green-500/10">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-green-600 uppercase tracking-wider">
                <Users className="size-3.5" />
                <span>Present</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-green-600">
                {analytics.presentStaff}
              </div>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-red-500/5 ring-1 ring-red-500/10">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-red-600 uppercase tracking-wider">
                <Users className="size-3.5" />
                <span>Absent</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-600">
                {analytics.absentStaff}
              </div>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-blue-500/5 ring-1 ring-blue-500/10">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">
                <Clock className="size-3.5" />
                <span>Total Hours</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-blue-600">{analytics.totalHours}</div>
            </div>
            <div className="space-y-2 p-3 rounded-xl bg-orange-500/5 ring-1 ring-orange-500/10 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-wider">
                <TrendingUp className="size-3.5" />
                <span>Avg Hours</span>
              </div>
              <div className="text-xl sm:text-2xl font-black text-orange-600">
                {analytics.averageHoursPerStaff}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  },
);

AdminAttendanceAnalytics.displayName = "AdminAttendanceAnalytics";
