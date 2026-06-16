"use client";

import { LogIn, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StudentGateEventRecord } from "@/lib/types/notification-history.type";
import { formatDateTime } from "@/lib/utils/date";

interface StudentGateHistoryListProps {
  events: StudentGateEventRecord[];
  showStudentName?: boolean;
  emptyMessage?: string;
}

export function StudentGateHistoryList({
  events,
  showStudentName = false,
  emptyMessage = "No gate scan events yet.",
}: StudentGateHistoryListProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        const isArrival = event.event === "arrival";
        const Icon = isArrival ? LogIn : LogOut;
        return (
          <Card key={event.id} className="border-border/80">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon
                    className={`size-4 ${isArrival ? "text-emerald-600" : "text-orange-600"}`}
                  />
                  {isArrival ? "School arrival" : "School dismissal"}
                </CardTitle>
                <Badge
                  className={
                    isArrival
                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                      : "bg-orange-100 text-orange-800 hover:bg-orange-100"
                  }
                >
                  {isArrival ? "Arrival" : "Dismissal"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDateTime(event.timestamp)}
              </p>
            </CardHeader>
            <CardContent className="text-sm">
              {showStudentName ? (
                <p>
                  <span className="text-muted-foreground">Student:</span>{" "}
                  {event.studentName}
                </p>
              ) : (
                <p className="text-muted-foreground">
                  {isArrival
                    ? "Your arrival at school was recorded at the gate."
                    : "Your dismissal from school was recorded at the gate."}
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
