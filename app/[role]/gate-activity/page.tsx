"use client";

import { Bell, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { StudentGateHistoryList } from "@/components/notifications/student-gate-history-list";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { StudentGateEventRecord } from "@/lib/types/notification-history.type";

export default function StudentGateActivityPage() {
  const user = useAppStore((state) => state.user);
  const studentId = user?.studentId || "";

  const { data, loading } = useFirebaseRealtime<StudentGateEventRecord>(
    "studentGateEvents",
    {
      asArray: true,
      filter: (event) => event.studentId === studentId,
      enabled: Boolean(studentId),
    },
  );

  const events = useMemo(
    () =>
      ((data as StudentGateEventRecord[]) || []).sort(
        (a, b) => b.timestamp - a.timestamp,
      ),
    [data],
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Bell className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">School gate activity</h1>
          <p className="text-sm text-muted-foreground">
            Your recorded arrivals and dismissals at the school gate.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : !studentId ? (
        <p className="text-sm text-muted-foreground">
          Your student profile is not linked to this account.
        </p>
      ) : (
        <StudentGateHistoryList events={events} />
      )}
    </div>
  );
}
