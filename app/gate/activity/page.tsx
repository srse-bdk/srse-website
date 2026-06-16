"use client";

import Link from "next/link";
import { ArrowLeft, Bell, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ScannerLoginHistoryList } from "@/components/notifications/scanner-login-history-list";
import { StudentGateHistoryList } from "@/components/notifications/student-gate-history-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/hooks/use-app-store";
import type {
  ScannerLoginEvent,
  StudentGateEventRecord,
} from "@/lib/types/notification-history.type";

export default function GateActivityPage() {
  const user = useAppStore((state) => state.user);
  const [tab, setTab] = useState<"all" | "scanner" | "student">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scannerEvents, setScannerEvents] = useState<ScannerLoginEvent[]>([]);
  const [studentEvents, setStudentEvents] = useState<StudentGateEventRecord[]>(
    [],
  );

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gate-activity", { cache: "no-store" });
      const payload = (await response.json()) as {
        success?: boolean;
        scannerLogins?: ScannerLoginEvent[];
        studentGateEvents?: StudentGateEventRecord[];
        error?: string;
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Failed to load gate activity");
      }

      setScannerEvents(payload.scannerLogins || []);
      setStudentEvents(payload.studentGateEvents || []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load gate activity",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      void loadActivity();
    }
  }, [user?.role, loadActivity]);

  if (user?.role && user.role !== "admin") {
    return null;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-3xl mx-auto">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/gate">
          <ArrowLeft className="size-4 mr-2" />
          Gate hub
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Bell className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Gate activity</h1>
            <p className="text-sm text-muted-foreground">
              Kiosk login history and student entry/exit scans.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadActivity()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="scanner">Kiosk logins</TabsTrigger>
          <TabsTrigger value="student">Student scans</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="all" className="space-y-6 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent kiosk logins</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScannerLoginHistoryList events={scannerEvents.slice(0, 10)} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent student scans</CardTitle>
                </CardHeader>
                <CardContent>
                  <StudentGateHistoryList
                    events={studentEvents.slice(0, 10)}
                    showStudentName
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="scanner" className="mt-4">
              <ScannerLoginHistoryList events={scannerEvents} />
            </TabsContent>

            <TabsContent value="student" className="mt-4">
              <StudentGateHistoryList events={studentEvents} showStudentName />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
