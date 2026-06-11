"use client";

import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import {
  Clock,
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/hooks/use-app-store";
import { attendanceService } from "@/lib/services";
import { formatTime } from "@/lib/utils/date";
import type { Attendance } from "@/lib/types/attendance.type";
import { toast } from "sonner";

export interface AttendanceStatsRef {
  refetch: () => void;
}

export const AttendanceStats = forwardRef<AttendanceStatsRef>((_, ref) => {
  const user = useAppStore((state) => state.user);
  const [openSession, setOpenSession] = useState<Attendance | null>(null);
  const [todaySessions, setTodaySessions] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTodayRecord = async () => {
    if (!user?.uid) return;

    try {
      const [open, sessions] = await Promise.all([
        attendanceService.getTodayOpenSession(user.uid),
        attendanceService.getTodaySessions(user.uid),
      ]);
      setOpenSession(open);
      setTodaySessions(sessions);
    } catch (error) {
      console.error("Failed to load today's record:", error);
      toast.error("Failed to load attendance record");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      loadTodayRecord();
    }
  }, [user?.uid]);

  useImperativeHandle(ref, () => ({
    refetch: loadTodayRecord,
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const displaySession =
    openSession || todaySessions[todaySessions.length - 1] || null;
  const isActive = !!openSession;
  const totalHoursToday = todaySessions.reduce(
    (sum, session) => sum + (session.totalHours ?? 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Today&apos;s Status</CardTitle>
          {displaySession && (
            <Badge
              variant={isActive ? "secondary" : "default"}
              className={
                isActive
                  ? "bg-blue-500 hover:bg-blue-600 text-white"
                  : "bg-green-500 hover:bg-green-600 text-white"
              }
            >
              {isActive ? (
                <>
                  <Clock className="size-3" />
                  Active
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3" />
                  {todaySessions.length > 1
                    ? `${todaySessions.length} visits`
                    : "Completed"}
                </>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displaySession ? (
          <div className="space-y-4">
            {/* Status Overview */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div
                  className={`size-12 rounded-full flex items-center justify-center ${
                    isActive
                      ? "bg-blue-100 dark:bg-blue-900/30"
                      : "bg-green-100 dark:bg-green-900/30"
                  }`}
                >
                  {isActive ? (
                    <Clock className="size-6 text-blue-600 dark:text-blue-400" />
                  ) : (
                    <CheckCircle2 className="size-6 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">Attendance Status</p>
                  <p className="text-xs text-muted-foreground">
                    {isActive
                      ? todaySessions.length > 1
                        ? `Visit ${todaySessions.length} — currently clocked in`
                        : "Currently clocked in"
                      : todaySessions.length > 1
                        ? `${todaySessions.length} visits today — punch in to return`
                        : "Session complete — punch in to return"}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Punch In */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div className="size-2 rounded-full bg-green-500" />
                {isActive ? "Current punch in" : "Last punch in"}
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Clock className="size-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {formatTime(displaySession.punchInTime)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isActive ? "Current session" : "Latest session"}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="size-5 text-green-500" />
              </div>
            </div>

            {/* Punch Out */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <div
                  className={`size-2 rounded-full ${
                    displaySession.punchOutTime ? "bg-red-500" : "bg-muted"
                  }`}
                />
                Punch Out
              </div>
              <div
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  displaySession.punchOutTime
                    ? "bg-card"
                    : "bg-muted/30 border-dashed"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-lg flex items-center justify-center ${
                      displaySession.punchOutTime
                        ? "bg-red-100 dark:bg-red-900/30"
                        : "bg-muted"
                    }`}
                  >
                    <Clock
                      className={`size-5 ${
                        displaySession.punchOutTime
                          ? "text-red-600 dark:text-red-400"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {displaySession.punchOutTime
                        ? formatTime(displaySession.punchOutTime)
                        : "Not punched out"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {displaySession.punchOutTime
                        ? "End of session"
                        : "Waiting for punch out"}
                    </p>
                  </div>
                </div>
                {displaySession.punchOutTime ? (
                  <CheckCircle2 className="size-5 text-red-500" />
                ) : (
                  <XCircle className="size-5 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Total Hours */}
            {totalHoursToday > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 border">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <TrendingUp className="size-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Total Hours Today</p>
                      <p className="text-xs text-muted-foreground">
                        {todaySessions.filter((s) => s.totalHours).length}{" "}
                        completed session
                        {todaySessions.filter((s) => s.totalHours).length === 1
                          ? ""
                          : "s"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {totalHoursToday.toFixed(2)}h
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calendar className="size-8 text-muted-foreground" />
            </div>
            <p className="font-medium mb-1">No attendance record</p>
            <p className="text-sm text-muted-foreground">
              Punch in to start tracking your attendance
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

AttendanceStats.displayName = "AttendanceStats";
