"use client";

import { UserCheck, UserX } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { QrCodeScanner } from "@/components/core/barcode-scanner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { mutate } from "@atechhub/firebase";
import {
  attendanceService,
  enrollmentService,
  studentAttendanceService,
} from "@/lib/services";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import { formatDateTime } from "@/lib/utils/date";
import { getCurrentLocation } from "@/lib/utils/location";
import { backfillMissingScanIds } from "@/lib/utils/scan-id";
import { parseScanValue } from "@/lib/utils/scan-parser";
import { toast } from "sonner";

/** Minimum wait between opposing gate scans (IN→OUT or OUT→IN). */
const STAFF_GATE_SCAN_COOLDOWN_MS = 60 * 1000;

type ScanResultState =
  | {
      status: "success";
      action: "in" | "out" | "present";
      message: string;
      person: {
        id: string;
        name: string;
        role: "staff" | "student";
        profilePicture?: string;
      };
      timestamp: number;
    }
  | {
      status: "warning" | "error";
      message: string;
      timestamp: number;
    }
  | null;

export function StaffGateScanner() {
  const currentUser = useAppStore((state) => state.user);
  const { data: usersData } = useFirebaseRealtime<User>("users", {
    asArray: true,
    filter: (user) => user.role === "staff",
  });
  const { data: studentsData } = useFirebaseRealtime<Student>("students", {
    asArray: true,
  });

  const staffs = useMemo(
    () => ((usersData as User[]) || []).filter((staff) => staff.status !== "inactive"),
    [usersData],
  );
  const students = useMemo(
    () =>
      ((studentsData as Student[]) || []).filter(
        (student) => student.status !== "inactive",
      ),
    [studentsData],
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [manualScanValue, setManualScanValue] = useState("");
  const [scanResult, setScanResult] = useState<ScanResultState>(null);
  const [recentEvents, setRecentEvents] = useState<
    Array<{
      id: string;
      name: string;
      action: "IN" | "OUT" | "PRESENT";
      time: number;
    }>
  >([]);

  const resolvePerson = useCallback(
    (rawValue: string) => {
      const parsed = parseScanValue(rawValue);
      if (parsed.tokens.length === 0) return null;

      const tokenSet = new Set(parsed.tokens.map((token) => token.toUpperCase()));
      const matchedStaff = staffs.find((staff) => {
        const candidates = [
          staff.scanId,
          staff.id,
          staff.uid,
          staff.email,
          staff.phoneNumber,
        ]
          .filter(Boolean)
          .map((value) => String(value).toUpperCase());
        return candidates.some((candidate) => tokenSet.has(candidate));
      });

      if (matchedStaff?.uid) {
        return {
          type: "staff" as const,
          id: matchedStaff.uid,
          name: matchedStaff.name,
          profilePicture: matchedStaff.profilePicture,
        };
      }

      const matchedStudent = students.find((student) => {
        const candidates = [
          student.scanId,
          student.id,
          student.pen,
          student.admissionNumber,
          student.rollNumber,
        ]
          .filter(Boolean)
          .map((value) => String(value).toUpperCase());
        return candidates.some((candidate) => tokenSet.has(candidate));
      });

      if (matchedStudent?.id) {
        return {
          type: "student" as const,
          id: matchedStudent.id,
          name: matchedStudent.fullName,
          profilePicture: matchedStudent.profilePicture,
          currentClass: matchedStudent.currentClass,
          currentSection: matchedStudent.currentSection,
        };
      }

      return null;
    },
    [staffs, students],
  );

  const handleDetected = useCallback(
    async (rawValue: string, options?: { allowLocationFallback?: boolean }) => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        const person = resolvePerson(rawValue);
        if (!person?.id) {
          setScanResult({
            status: "error",
            message: "Card not recognized for any active staff or student.",
            timestamp: Date.now(),
          });
          return;
        }

        const now = Date.now();

        if (person.type === "student") {
          const today = new Date().toISOString().split("T")[0];
          let enrollmentToUse = await enrollmentService.getCurrentEnrollment(person.id);
          if (!enrollmentToUse) {
            // Fallback for legacy data where enrollment status is not marked active.
            const allEnrollments = await enrollmentService.getByStudentId(person.id);
            const sorted = [...allEnrollments].sort((a, b) => {
              const aTs = new Date(a.updatedAt || a.createdAt || 0).getTime();
              const bTs = new Date(b.updatedAt || b.createdAt || 0).getTime();
              return bTs - aTs;
            });
            enrollmentToUse = sorted[0] || null;
          }

          const existingAttendance = await studentAttendanceService.getByStudentAndDate(
            person.id,
            today,
          );
          if (existingAttendance) {
            setScanResult({
              status: "warning",
              message: `${person.name} attendance is already marked for today.`,
              timestamp: now,
            });
            return;
          }

          if (enrollmentToUse) {
            await studentAttendanceService.markAttendance(
              {
                studentId: person.id,
                enrollmentId: enrollmentToUse.id,
                classId: enrollmentToUse.classId,
                section: enrollmentToUse.section,
                date: today,
                status: "present",
              },
              "gate-scanner",
            );
          } else {
            const fallbackClassId = String(person.currentClass || "").trim();
            const fallbackSection = String(person.currentSection || "").trim();

            await mutate({
              action: "createWithId",
              path: "studentAttendance",
              data: {
                studentId: person.id,
                enrollmentId: `legacy-${person.id}`,
                classId: fallbackClassId || "UNASSIGNED",
                section: fallbackSection || "UNASSIGNED",
                date: today,
                status: "present",
                markedBy: "gate-scanner",
                markedAt: now,
                notes: "Marked via gate scanner (no enrollment record found)",
                createdAt: new Date(now).toISOString(),
                updatedAt: new Date(now).toISOString(),
              },
              actionBy: "gate-scanner",
            });
          }

          setRecentEvents((prev) => [
            { id: person.id, name: person.name, action: "PRESENT", time: now },
            ...prev.slice(0, 4),
          ]);
          setScanResult({
            status: "success",
            action: "present",
            message: enrollmentToUse
              ? "Student marked present successfully."
              : "Student marked present (fallback: no enrollment record).",
            person: {
              id: person.id,
              name: person.name,
              role: "student",
              profilePicture: person.profilePicture,
            },
            timestamp: now,
          });
          return;
        }

        let location;
        try {
          location = await getCurrentLocation();
        } catch {
          if (options?.allowLocationFallback) {
            location = {
              lat: 0,
              lng: 0,
              address: "Manual test mode (location skipped)",
            };
          } else {
            setScanResult({
              status: "error",
              message: "Location permission is required to record gate attendance.",
              timestamp: Date.now(),
            });
            return;
          }
        }

        if (!location) {
          setScanResult({
            status: "error",
            message: "Location permission is required to record gate attendance.",
            timestamp: Date.now(),
          });
          return;
        }

        const openSession = await attendanceService.getTodayOpenSession(person.id);
        const todaySessions = await attendanceService.getTodaySessions(person.id);

        if (!openSession) {
          const lastSession = todaySessions.at(-1);
          if (lastSession?.punchOutTime) {
            const msSinceOut = now - lastSession.punchOutTime;
            if (msSinceOut < STAFF_GATE_SCAN_COOLDOWN_MS) {
              const waitSeconds = Math.ceil(
                (STAFF_GATE_SCAN_COOLDOWN_MS - msSinceOut) / 1000,
              );
              setScanResult({
                status: "warning",
                message: `${person.name}'s OUT time is already recorded at ${formatDateTime(lastSession.punchOutTime)}. Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before scanning IN.`,
                timestamp: now,
              });
              return;
            }
          }

          await attendanceService.punchIn({
            staffId: person.id,
            staffName: person.name,
            location,
          });

          const sessionNumber = todaySessions.length + 1;
          setRecentEvents((prev) => [
            { id: person.id, name: person.name, action: "IN", time: now },
            ...prev.slice(0, 4),
          ]);
          setScanResult({
            status: "success",
            action: "in",
            message:
              sessionNumber > 1
                ? `Staff checked in successfully (visit ${sessionNumber} today).`
                : "Staff checked in successfully.",
            person: {
              id: person.id,
              name: person.name,
              role: "staff",
              profilePicture: person.profilePicture,
            },
            timestamp: now,
          });
          return;
        }

        const msSinceIn = now - openSession.punchInTime;
        if (msSinceIn < STAFF_GATE_SCAN_COOLDOWN_MS) {
          const waitSeconds = Math.ceil(
            (STAFF_GATE_SCAN_COOLDOWN_MS - msSinceIn) / 1000,
          );
          setScanResult({
            status: "warning",
            message: `${person.name}'s IN time is already recorded at ${formatDateTime(openSession.punchInTime)}. Please wait ${waitSeconds} second${waitSeconds === 1 ? "" : "s"} before scanning OUT.`,
            timestamp: now,
          });
          return;
        }

        await attendanceService.punchOut(openSession.id, location);
        setRecentEvents((prev) => [
          { id: person.id, name: person.name, action: "OUT", time: now },
          ...prev.slice(0, 4),
        ]);
        setScanResult({
          status: "success",
          action: "out",
          message: "Staff checked out successfully. Wait 1 minute before scanning IN again.",
          person: {
            id: person.id,
            name: person.name,
            role: "staff",
            profilePicture: person.profilePicture,
          },
          timestamp: now,
        });
      } catch (error) {
        console.error("Gate scanner error:", error);
        setScanResult({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Attendance could not be recorded. Try again.",
          timestamp: Date.now(),
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [isProcessing, resolvePerson],
  );

  const handleBackfillScanIds = async () => {
    if (isBackfilling) return;
    setIsBackfilling(true);
    try {
      const result = await backfillMissingScanIds();
      toast.success(
        `Backfill complete. Users updated: ${result.usersUpdated}, Students updated: ${result.studentsUpdated}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to backfill scan IDs",
      );
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Gate Scanner</CardTitle>
          <CardDescription>
            Scan the QR code on a staff or student ID card.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <QrCodeScanner onDetected={handleDetected} />
          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-medium">Manual Test Input</p>
            <div className="flex gap-2">
              <Input
                value={manualScanValue}
                onChange={(event) => setManualScanValue(event.target.value)}
                placeholder="Enter scan ID (e.g. STU-XXXXXXXX)"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!manualScanValue.trim()) return;
                  handleDetected(manualScanValue.trim(), {
                    allowLocationFallback: true,
                  });
                  setManualScanValue("");
                }}
              >
                Simulate
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Staff QR scans mark IN/OUT and student QR scans mark PRESENT
            automatically.
          </p>
          {currentUser?.role === "admin" && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">Scan ID Backfill</p>
              <p className="text-xs text-muted-foreground">
                Generate missing scan IDs for existing staff and students.
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={handleBackfillScanIds}
                disabled={isBackfilling}
              >
                {isBackfilling ? "Backfilling..." : "Backfill Missing Scan IDs"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Verification</CardTitle>
          <CardDescription>
            Photo and action confirmation appear after each scan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {scanResult?.status === "success" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <Avatar className="size-12">
                  <AvatarImage
                    src={scanResult.person.profilePicture}
                    alt={scanResult.person.name}
                  />
                  <AvatarFallback>
                    {scanResult.person.name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">{scanResult.person.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {scanResult.person.role}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                  {scanResult.action === "in"
                    ? "IN Recorded"
                    : scanResult.action === "out"
                      ? "OUT Recorded"
                      : "PRESENT Recorded"}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {formatDateTime(scanResult.timestamp)}
                </span>
              </div>
            </div>
          )}

          {scanResult?.status === "warning" && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <p className="font-medium">Already recorded</p>
              <p className="text-sm">{scanResult.message}</p>
            </div>
          )}

          {scanResult?.status === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
              <p className="font-medium">Scan failed</p>
              <p className="text-sm">{scanResult.message}</p>
            </div>
          )}

          {!scanResult && (
            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              Scan results will appear here.
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium">Recent scans</p>
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scans yet.</p>
            ) : (
              recentEvents.map((event) => (
                <div key={`${event.id}-${event.time}`} className="flex items-center justify-between rounded-md border p-2">
                  <span className="text-sm">{event.name}</span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {event.action === "IN" ? (
                      <UserCheck className="size-3 text-emerald-600" />
                    ) : event.action === "PRESENT" ? (
                      <UserCheck className="size-3 text-blue-600" />
                    ) : (
                      <UserX className="size-3 text-orange-600" />
                    )}
                    <span>{event.action}</span>
                    <span>{formatDateTime(event.time)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
