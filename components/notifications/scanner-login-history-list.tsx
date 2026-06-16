"use client";

import { Monitor, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScannerLoginEvent } from "@/lib/types/notification-history.type";
import { formatDateTime } from "@/lib/utils/date";
import { formatDeviceInfoSummary } from "@/lib/utils/device-info";

interface ScannerLoginHistoryListProps {
  events: ScannerLoginEvent[];
  emptyMessage?: string;
}

export function ScannerLoginHistoryList({
  events,
  emptyMessage = "No scanner login events yet.",
}: ScannerLoginHistoryListProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <Card key={event.id} className="border-border/80">
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="size-4 text-primary" />
                {event.scannerName}
              </CardTitle>
              <Badge variant="outline">Kiosk login</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDateTime(event.loginAt)}
            </p>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="text-muted-foreground">Email:</span>{" "}
              {event.scannerEmail || "—"}
            </p>
            <p className="flex items-start gap-2">
              <Monitor className="size-4 mt-0.5 shrink-0 text-muted-foreground" />
              <span>
                {formatDeviceInfoSummary(event.device)}
                {event.device?.language ? ` · ${event.device.language}` : ""}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">IP: {event.ip || "unknown"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
