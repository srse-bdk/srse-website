"use client";

import { useRef, useState } from "react";
import { Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AttendanceStats } from "./attendance-stats";
import { AttendanceAnalytics } from "./attendance-analytics";
import { AttendanceHistory } from "./attendance-history";

export function StaffAttendance() {
  const [refetchKey, setRefetchKey] = useState(0);
  const attendanceStatsRef = useRef<{ refetch: () => void }>(null);
  const attendanceAnalyticsRef = useRef<{ refetch: () => void }>(null);
  const attendanceHistoryRef = useRef<{ refetch: () => void }>(null);

  const handleRefresh = () => {
    attendanceStatsRef.current?.refetch();
    attendanceAnalyticsRef.current?.refetch();
    attendanceHistoryRef.current?.refetch();
    setRefetchKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">My Attendance</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      </div>

      <Alert>
        <Info className="size-4" />
        <AlertTitle>Gate attendance only</AlertTitle>
        <AlertDescription>
          Your check-in and check-out are recorded when you scan your ID card at
          the school entry and exit scanners. Self punch from this app is not
          permitted.
        </AlertDescription>
      </Alert>

      <AttendanceStats ref={attendanceStatsRef} key={`stats-${refetchKey}`} />
      <AttendanceAnalytics
        ref={attendanceAnalyticsRef}
        key={`analytics-${refetchKey}`}
      />
      <AttendanceHistory
        ref={attendanceHistoryRef}
        key={`history-${refetchKey}`}
      />
    </div>
  );
}
