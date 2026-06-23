"use client";

import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import {
  leaveTypeService,
  staffLeaveAccrualService,
  staffLeaveService,
} from "@/lib/services";
import type { LeaveType, StaffLeaveApplication } from "@/lib/types/leave.type";
import {
  ACCRUAL_LEAVE_CODES,
  FULL_LEAVE_POLICY_DESCRIPTION,
} from "@/lib/config/leave-accrual";
import { getAcademicYear } from "@/lib/utils/academic-year";
import { formatDateTime } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-900",
  cancelled: "bg-muted text-muted-foreground",
};

export function StaffLeaveDashboard() {
  const user = useAppStore((state) => state.user);
  const staffId = user?.uid || user?.id || "";
  const academicYear = getAcademicYear();

  const { data: applicationsData, loading } = useFirebaseRealtime<StaffLeaveApplication>(
    "staffLeaveApplications",
    { asArray: true },
  );

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [balance, setBalance] = useState<
    Awaited<ReturnType<typeof staffLeaveService.getStaffPortalBalanceSummary>>
  >([]);
  const [specialLeaveBalance, setSpecialLeaveBalance] = useState<
    Awaited<ReturnType<typeof staffLeaveService.getSpecialLeaveBalance>>
  >(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [leavePreview, setLeavePreview] = useState<{
    workingDays: number;
    holidays: Array<{ date: string; reason: string }>;
  } | null>(null);
  const [holidayNotesByAppId, setHolidayNotesByAppId] = useState<
    Record<string, Array<{ date: string; reason: string }>>
  >({});

  const myApplications = useMemo(() => {
    const all = (applicationsData as StaffLeaveApplication[]) || [];
    return all
      .filter((app) => app.staffId === staffId)
      .sort((a, b) => b.appliedAt - a.appliedAt);
  }, [applicationsData, staffId]);

  const portalBalance = useMemo(
    () =>
      balance.filter((item) =>
        ACCRUAL_LEAVE_CODES.includes(
          item.code as (typeof ACCRUAL_LEAVE_CODES)[number],
        ),
      ),
    [balance],
  );

  const portalLeaveTypes = useMemo(
    () =>
      leaveTypes.filter((type) =>
        ACCRUAL_LEAVE_CODES.includes(
          type.code as (typeof ACCRUAL_LEAVE_CODES)[number],
        ),
      ),
    [leaveTypes],
  );

  useEffect(() => {
    async function load() {
      try {
        await leaveTypeService.deduplicateByCode();
        await leaveTypeService.ensureAccrualTypesPresent();
        await staffLeaveAccrualService.ensureQuarterlyAccrualsForStaff(
          staffId,
          academicYear,
          staffId,
        );
        await staffLeaveAccrualService.repairAccrualLeaveTypeIds(
          staffId,
          academicYear,
          staffId,
        );

        const [types, summary, spl] = await Promise.all([
          leaveTypeService.getStaffSelectable(),
          staffLeaveService.getStaffPortalBalanceSummary(staffId, academicYear),
          staffLeaveService.getSpecialLeaveBalance(staffId, academicYear),
        ]);
        setLeaveTypes(types);
        setBalance(summary);
        setSpecialLeaveBalance(spl);
        if (types.length > 0) {
          setLeaveTypeId((current) =>
            types.some((type) => type.id === current) ? current : types[0].id,
          );
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load leave data",
        );
      } finally {
        setLoadingBalance(false);
      }
    }
    if (staffId) load();
  }, [staffId, academicYear]);

  useEffect(() => {
    if (!startDate || !endDate || endDate < startDate) {
      setLeavePreview(null);
      return;
    }

    let cancelled = false;
    staffLeaveService
      .getLeaveRangePreview(startDate, endDate)
      .then((preview) => {
        if (!cancelled) setLeavePreview(preview);
      })
      .catch(() => {
        if (!cancelled) setLeavePreview(null);
      });

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  useEffect(() => {
    if (myApplications.length === 0) {
      setHolidayNotesByAppId({});
      return;
    }

    let cancelled = false;
    async function loadHolidayNotes() {
      const notes: Record<string, Array<{ date: string; reason: string }>> = {};
      await Promise.all(
        myApplications.map(async (app) => {
          const holidays = await staffLeaveService.getHolidaysInLeaveRange(
            app.startDate,
            app.endDate,
          );
          if (holidays.length > 0) {
            notes[app.id] = holidays;
          }
        }),
      );
      if (!cancelled) setHolidayNotesByAppId(notes);
    }

    void loadHolidayNotes();
    return () => {
      cancelled = true;
    };
  }, [myApplications]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!staffId || !user?.name) return;

    setSubmitting(true);
    try {
      await staffLeaveService.applyLeave(
        {
          staffId,
          staffName: user.name,
          leaveTypeId,
          startDate,
          endDate,
          reason,
        },
        staffId,
      );
      toast.success("Leave application submitted");
      setReason("");
      setStartDate("");
      setEndDate("");
      const summary = await staffLeaveService.getStaffPortalBalanceSummary(
        staffId,
        academicYear,
      );
      setBalance(summary);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit leave",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await staffLeaveService.cancelApplication(id, staffId);
      toast.success("Application cancelled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel",
      );
    }
  };

  if (loadingBalance) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Leave</h1>
        <p className="text-muted-foreground">
          Session {academicYear} — {FULL_LEAVE_POLICY_DESCRIPTION}
        </p>
      </div>

      {portalBalance.length === 0 ? (
        <Alert>
          <AlertDescription>
            Leave balances are not available yet. Please contact the school
            office if this continues after refreshing the page.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          {portalBalance.map((item) => (
            <Card key={item.leaveTypeId}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{item.code}</CardTitle>
                <CardDescription>{item.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{item.remainingDays}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {item.accruedDays} accrued ({item.perQuarterDays}/quarter ×{" "}
                  {item.quartersCredited} quarter
                  {item.quartersCredited === 1 ? "" : "s"})
                  <br />
                  {item.usedDays} used · {item.pendingDays} pending · cap{" "}
                  {item.maxDaysPerYear}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Alert>
        <AlertDescription className="space-y-1 text-sm">
          <p>
            <strong>Special Leave (exam / medical):</strong>
          </p>
          <p>
            Granted by admin only after Principal&apos;s recommendation. You cannot
            apply online.
          </p>
          <p>
            Number of SPL granted:{" "}
            {specialLeaveBalance?.usedDays ?? 0} day
            {(specialLeaveBalance?.usedDays ?? 0) === 1 ? "" : "s"}
          </p>
        </AlertDescription>
      </Alert>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="size-5" />
              Apply for Leave
            </CardTitle>
            <CardDescription>
              Casual Leave, Sick Leave, and Emergency Leave only. Weekends and
              school holidays are excluded.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Leave type</Label>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {portalLeaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.code} — {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="startDate">From</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">To</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                  />
                </div>
              </div>
              {leavePreview && leavePreview.workingDays > 0 && (
                <p className="text-sm text-muted-foreground">
                  {leavePreview.workingDays} leave day
                  {leavePreview.workingDays === 1 ? "" : "s"} will be counted
                  (holidays excluded).
                </p>
              )}
              {leavePreview && leavePreview.holidays.length > 0 && (
                <Alert>
                  <AlertDescription className="text-sm space-y-1">
                    {leavePreview.holidays.map((holiday) => (
                      <span key={holiday.date} className="block">
                        {format(parseISO(holiday.date), "d MMM yyyy")} is an approved
                        holiday ({holiday.reason}) — not counted in leave days.
                      </span>
                    ))}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for leave"
                  required
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={submitting || portalLeaveTypes.length === 0}>
                {submitting ? "Submitting..." : "Submit application"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="size-5" />
              Application History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[420px] overflow-y-auto">
            {loading ? (
              <Loader2 className="size-5 animate-spin mx-auto" />
            ) : myApplications.length === 0 ? (
              <p className="text-sm text-muted-foreground">No applications yet.</p>
            ) : (
              myApplications.map((app) => (
                <div key={app.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">
                      {app.leaveTypeCode} — {format(parseISO(app.startDate), "dd MMM")} to{" "}
                      {format(parseISO(app.endDate), "dd MMM yyyy")}
                    </span>
                    <Badge className={STATUS_COLORS[app.status] || ""}>
                      {app.status}
                      {app.source === "admin_grant" ? " · granted" : ""}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {app.totalDays} day(s) · {app.reason}
                  </p>
                  {holidayNotesByAppId[app.id]?.map((holiday) => (
                    <p key={holiday.date} className="text-xs text-muted-foreground">
                      {format(parseISO(holiday.date), "d MMM yyyy")} is an approved
                      holiday ({holiday.reason}) — not counted in leave days.
                    </p>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    Applied {formatDateTime(app.appliedAt)}
                  </p>
                  {app.status === "pending" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancel(app.id)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
