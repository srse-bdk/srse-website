"use client";

import { LogIn, LogOut, UserCheck, UserX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { QrCodeScanner } from "@/components/core/barcode-scanner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { mutate } from "@atechhub/firebase";
import {
  attendanceService,
  enrollmentService,
  notifyStudentGateEvent,
  studentAttendanceService,
} from "@/lib/services";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/utils/date";
import { parseScanValue } from "@/lib/utils/scan-parser";

export type GateScannerMode = "entry" | "exit";

type ScanResultState =
  | {
      status: "success";
      action: "in" | "out" | "arrival" | "dismissal";
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

type ResolvedPerson =
  | {
      type: "staff";
      id: string;
      name: string;
      profilePicture?: string;
    }
  | {
      type: "student";
      id: string;
      name: string;
      profilePicture?: string;
      currentClass?: string;
      currentSection?: string;
    };

const MODE_CONFIG = {
  entry: {
    title: "Entry Scanner",
    description: "Scan ID cards at the school entrance to record arrival / check-in.",
    icon: LogIn,
    headerClass: "border-emerald-200 bg-emerald-50/80",
    badgeClass: "bg-emerald-600 text-white hover:bg-emerald-600",
    staffAction: "IN Recorded" as const,
    studentAction: "Arrival Recorded" as const,
    markedBy: "entry-scanner",
  },
  exit: {
    title: "Exit Scanner",
    description: "Scan ID cards at the school exit to record departure / check-out.",
    icon: LogOut,
    headerClass: "border-orange-200 bg-orange-50/80",
    badgeClass: "bg-orange-600 text-white hover:bg-orange-600",
    staffAction: "OUT Recorded" as const,
    studentAction: "Dismissal Recorded" as const,
    markedBy: "exit-scanner",
  },
} as const;

interface GateScannerProps {
  mode: GateScannerMode;
}

export function GateScanner({ mode }: GateScannerProps) {
  const config = MODE_CONFIG[mode];
  const ModeIcon = config.icon;

  const { data: usersData } = useFirebaseRealtime<User>("users", {
    asArray: true,
    filter: (user) => user.role === "staff",
  });
  const { data: studentsData } = useFirebaseRealtime<Student>("students", {
    asArray: true,
  });

  const staffs = useMemo(
    () =>
      ((usersData as User[]) || []).filter((staff) => staff.status !== "inactive"),
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
  const [scanResult, setScanResult] = useState<ScanResultState>(null);
  const [autoStartAfterVerify, setAutoStartAfterVerify] = useState(false);
  const [recentEvents, setRecentEvents] = useState<
    Array<{
      id: string;
      name: string;
      action: "IN" | "OUT" | "ARRIVAL" | "DISMISSAL";
      time: number;
    }>
  >([]);

  const resolvePerson = useCallback(
    (rawValue: string): ResolvedPerson | null => {
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
          type: "staff",
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
          type: "student",
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

  const handleStudentEntry = async (person: ResolvedPerson & { type: "student" }, now: number) => {
    const today = new Date().toISOString().split("T")[0];
    const existing = await studentAttendanceService.getByStudentAndDate(person.id, today);

    if (existing?.arrivalTime) {
      setScanResult({
        status: "warning",
        message: `${person.name} already arrived at ${formatDateTime(existing.arrivalTime)}.`,
        timestamp: now,
      });
      return;
    }

    if (existing) {
      await studentAttendanceService.update(
        existing.id,
        { arrivalTime: now, status: "present" },
        config.markedBy,
      );
    } else {
      let enrollmentToUse = await enrollmentService.getCurrentEnrollment(person.id);
      if (!enrollmentToUse) {
        const allEnrollments = await enrollmentService.getByStudentId(person.id);
        const sorted = [...allEnrollments].sort((a, b) => {
          const aTs = new Date(a.updatedAt || a.createdAt || 0).getTime();
          const bTs = new Date(b.updatedAt || b.createdAt || 0).getTime();
          return bTs - aTs;
        });
        enrollmentToUse = sorted[0] || null;
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
            arrivalTime: now,
          },
          config.markedBy,
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
            markedBy: config.markedBy,
            markedAt: now,
            arrivalTime: now,
            notes: "Marked via entry scanner (no enrollment record found)",
            createdAt: new Date(now).toISOString(),
            updatedAt: new Date(now).toISOString(),
          },
          actionBy: config.markedBy,
        });
      }
    }

    setRecentEvents((prev) => [
      { id: person.id, name: person.name, action: "ARRIVAL", time: now },
      ...prev.slice(0, 4),
    ]);
    setScanResult({
      status: "success",
      action: "arrival",
      message: `${person.name} arrival recorded successfully.`,
      person: {
        id: person.id,
        name: person.name,
        role: "student",
        profilePicture: person.profilePicture,
      },
      timestamp: now,
    });
    void notifyStudentGateEvent({
      studentId: person.id,
      studentName: person.name,
      event: "arrival",
      timestamp: now,
    });
  };

  const handleStudentExit = async (person: ResolvedPerson & { type: "student" }, now: number) => {
    const today = new Date().toISOString().split("T")[0];
    const existing = await studentAttendanceService.getByStudentAndDate(person.id, today);

    if (!existing) {
      setScanResult({
        status: "error",
        message: `${person.name} has no entry recorded today. Use the entry scanner first.`,
        timestamp: now,
      });
      return;
    }

    const hasEntry =
      Boolean(existing.arrivalTime) || existing.status === "present";
    if (!hasEntry) {
      setScanResult({
        status: "error",
        message: `${person.name} has no entry recorded today. Use the entry scanner first.`,
        timestamp: now,
      });
      return;
    }

    if (existing.dismissalTime) {
      setScanResult({
        status: "warning",
        message: `${person.name} already dismissed at ${formatDateTime(existing.dismissalTime)}.`,
        timestamp: now,
      });
      return;
    }

    await studentAttendanceService.recordGateDismissal(existing.id, config.markedBy);

    setRecentEvents((prev) => [
      { id: person.id, name: person.name, action: "DISMISSAL", time: now },
      ...prev.slice(0, 4),
    ]);
    setScanResult({
      status: "success",
      action: "dismissal",
      message: `${person.name} dismissal recorded successfully.`,
      person: {
        id: person.id,
        name: person.name,
        role: "student",
        profilePicture: person.profilePicture,
      },
      timestamp: now,
    });
    void notifyStudentGateEvent({
      studentId: person.id,
      studentName: person.name,
      event: "dismissal",
      timestamp: now,
    });
  };

  const handleStaffEntry = async (person: ResolvedPerson & { type: "staff" }, now: number) => {
    const openSession = await attendanceService.getTodayOpenSession(person.id);
    const todaySessions = await attendanceService.getTodaySessions(person.id);

    if (openSession) {
      setScanResult({
        status: "warning",
        message: `${person.name} already checked in at ${formatDateTime(openSession.punchInTime)}.`,
        timestamp: now,
      });
      return;
    }

    const completedToday = todaySessions.filter((session) => session.punchOutTime);
    if (completedToday.length > 0) {
      const last = completedToday.at(-1)!;
      setScanResult({
        status: "warning",
        message: `${person.name} already completed check-out today at ${formatDateTime(last.punchOutTime!)}.`,
        timestamp: now,
      });
      return;
    }

    await attendanceService.punchIn({
      staffId: person.id,
      staffName: person.name,
      source: "entry-scanner",
    });

    setRecentEvents((prev) => [
      { id: person.id, name: person.name, action: "IN", time: now },
      ...prev.slice(0, 4),
    ]);
    setScanResult({
      status: "success",
      action: "in",
      message: `${person.name} checked in successfully.`,
      person: {
        id: person.id,
        name: person.name,
        role: "staff",
        profilePicture: person.profilePicture,
      },
      timestamp: now,
    });
  };

  const handleStaffExit = async (person: ResolvedPerson & { type: "staff" }, now: number) => {
    const openSession = await attendanceService.getTodayOpenSession(person.id);
    const todaySessions = await attendanceService.getTodaySessions(person.id);

    if (!openSession) {
      if (todaySessions.some((session) => session.punchOutTime)) {
        const last = todaySessions.filter((s) => s.punchOutTime).at(-1)!;
        setScanResult({
          status: "warning",
          message: `${person.name} already checked out at ${formatDateTime(last.punchOutTime!)}.`,
          timestamp: now,
        });
        return;
      }

      setScanResult({
        status: "error",
        message: `${person.name} has no check-in today. Use the entry scanner first.`,
        timestamp: now,
      });
      return;
    }

    await attendanceService.punchOut(openSession.id, { source: "exit-scanner" });

    setRecentEvents((prev) => [
      { id: person.id, name: person.name, action: "OUT", time: now },
      ...prev.slice(0, 4),
    ]);
    setScanResult({
      status: "success",
      action: "out",
      message: `${person.name} checked out successfully.`,
      person: {
        id: person.id,
        name: person.name,
        role: "staff",
        profilePicture: person.profilePicture,
      },
      timestamp: now,
    });
  };

  const handleDetected = useCallback(
    async (rawValue: string) => {
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
          if (mode === "entry") {
            await handleStudentEntry(person, now);
          } else {
            await handleStudentExit(person, now);
          }
          return;
        }

        if (mode === "entry") {
          await handleStaffEntry(person, now);
        } else {
          await handleStaffExit(person, now);
        }
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
    [isProcessing, mode, resolvePerson],
  );

  const successBadgeLabel =
    scanResult?.status === "success"
      ? scanResult.action === "in"
        ? config.staffAction
        : scanResult.action === "out"
          ? config.staffAction
          : scanResult.action === "arrival"
            ? config.studentAction
            : config.studentAction
      : "";

  const showScanner = scanResult === null;

  useEffect(() => {
    if (!scanResult) return;
    const timer = window.setTimeout(() => {
      setAutoStartAfterVerify(true);
      setScanResult(null);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [scanResult]);

  useEffect(() => {
    if (!showScanner || !autoStartAfterVerify) return;
    const frame = requestAnimationFrame(() => setAutoStartAfterVerify(false));
    return () => cancelAnimationFrame(frame);
  }, [showScanner, autoStartAfterVerify]);

  return (
    <div className="mx-auto w-full max-w-lg space-y-4">
      <Card className={cn("overflow-hidden", config.headerClass)}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <ModeIcon className="size-5" />
            {config.title}
          </CardTitle>
          <CardDescription>{config.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 bg-background rounded-t-xl">
          <div className="relative min-h-[280px]">
            {showScanner ? (
              <QrCodeScanner
                onDetected={handleDetected}
                autoStart={autoStartAfterVerify}
              />
            ) : (
              <div className="flex h-full min-h-[280px] flex-col justify-center space-y-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    Live verification
                  </p>
                </div>

                {scanResult?.status === "success" && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-14 shrink-0">
                        <AvatarImage
                          src={scanResult.person.profilePicture}
                          alt={scanResult.person.name}
                        />
                        <AvatarFallback className="text-base">
                          {scanResult.person.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 text-left">
                        <p className="text-lg font-semibold truncate">
                          {scanResult.person.name}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {scanResult.person.role}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Badge className={config.badgeClass}>{successBadgeLabel}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDateTime(scanResult.timestamp)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-emerald-900">{scanResult.message}</p>
                  </div>
                )}

                {scanResult?.status === "warning" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
                    <p className="font-medium">Already recorded</p>
                    <p className="text-sm mt-1">{scanResult.message}</p>
                  </div>
                )}

                {scanResult?.status === "error" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
                    <p className="font-medium">Scan failed</p>
                    <p className="text-sm mt-1">{scanResult.message}</p>
                  </div>
                )}
              </div>
            )}

            {isProcessing && showScanner && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/70">
                <p className="text-sm font-medium text-muted-foreground">Processing…</p>
              </div>
            )}
          </div>

          {recentEvents.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-sm font-medium">Recent scans</p>
              {recentEvents.map((event) => (
                <div
                  key={`${event.id}-${event.time}`}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <span className="text-sm truncate pr-2">{event.name}</span>
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    {event.action === "IN" || event.action === "ARRIVAL" ? (
                      <UserCheck className="size-3 text-emerald-600" />
                    ) : (
                      <UserX className="size-3 text-orange-600" />
                    )}
                    <span>{event.action}</span>
                    <span>{formatDateTime(event.time)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** @deprecated Use GateScanner with mode prop */
export function StaffGateScanner() {
  return <GateScanner mode="entry" />;
}
