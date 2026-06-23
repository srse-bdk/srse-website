"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react";
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
  SPECIAL_LEAVE_DESCRIPTION,
  SPECIAL_LEAVE_MAX_DAYS_PER_YEAR,
} from "@/lib/config/leave-accrual";
import { leaveTypeService, staffLeaveService } from "@/lib/services";
import type { StaffLeaveBalanceSummary } from "@/lib/types/leave.type";
import type { User } from "@/lib/types/user.type";
import { getAcademicYear } from "@/lib/utils/academic-year";

export default function GrantSpecialLeavePage() {
  const params = useParams();
  const role = params.role as string;
  const user = useAppStore((state) => state.user);
  const academicYear = getAcademicYear();

  const { data: staffData } = useFirebaseRealtime<User>("users", {
    asArray: true,
    filter: (u) => u.role === "staff" && u.status !== "inactive",
  });
  const staffs = (staffData as User[]) || [];

  const [staffId, setStaffId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [principalRecommendation, setPrincipalRecommendation] = useState("");
  const [splBalance, setSplBalance] = useState<StaffLeaveBalanceSummary | null>(
    null,
  );
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewDays, setPreviewDays] = useState<number | null>(null);

  useEffect(() => {
    void leaveTypeService.ensureSpecialLeaveTypePresent();
  }, []);

  useEffect(() => {
    if (!staffId) {
      setSplBalance(null);
      return;
    }

    let cancelled = false;
    setLoadingBalance(true);
    void staffLeaveService
      .getSpecialLeaveBalance(staffId, academicYear)
      .then((balance) => {
        if (!cancelled) setSplBalance(balance);
      })
      .catch(() => {
        if (!cancelled) setSplBalance(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingBalance(false);
      });

    return () => {
      cancelled = true;
    };
  }, [staffId, academicYear]);

  useEffect(() => {
    if (!startDate || !endDate || endDate < startDate) {
      setPreviewDays(null);
      return;
    }

    let cancelled = false;
    void staffLeaveService
      .getLeaveRangePreview(startDate, endDate)
      .then((preview) => {
        if (!cancelled) setPreviewDays(preview.workingDays);
      })
      .catch(() => {
        if (!cancelled) setPreviewDays(null);
      });

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const adminId = user?.uid ?? user?.id;
    if (!adminId) {
      toast.error("Unable to identify admin. Please sign in again.");
      return;
    }

    const staff = staffs.find((s) => s.uid === staffId);
    if (!staff) {
      toast.error("Select a staff member");
      return;
    }

    setSubmitting(true);
    try {
      await staffLeaveService.grantSpecialLeaveByAdmin(
        {
          staffId,
          staffName: staff.name,
          startDate,
          endDate,
          reason,
          principalRecommendation,
        },
        adminId,
      );
      toast.success(`Special Leave recorded for ${staff.name}`);
      setStartDate("");
      setEndDate("");
      setReason("");
      setPrincipalRecommendation("");
      setPreviewDays(null);
      const balance = await staffLeaveService.getSpecialLeaveBalance(
        staffId,
        academicYear,
      );
      setSplBalance(balance);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to grant Special Leave",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/${role}/leave`}>
          <ArrowLeft className="mr-2 size-4" />
          Leave Management
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Grant Special Leave</h1>
        <p className="text-muted-foreground">{SPECIAL_LEAVE_DESCRIPTION}</p>
      </div>

      <Alert>
        <ShieldCheck className="size-4" />
        <AlertDescription>
          Staff cannot apply for Special Leave online. Record it here only after
          the Principal has recommended it (exam or medical case).
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Record Special Leave</CardTitle>
          <CardDescription>
            Session {academicYear} · max {SPECIAL_LEAVE_MAX_DAYS_PER_YEAR} days
            per staff per year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Staff member</Label>
              <Select value={staffId} onValueChange={setStaffId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  {staffs.map((staff) => (
                    <SelectItem key={staff.uid} value={staff.uid}>
                      {staff.name}
                      {staff.email ? ` (${staff.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {staffId && (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                {loadingBalance ? (
                  <span className="text-muted-foreground">Loading balance…</span>
                ) : splBalance ? (
                  <p>
                    <strong>Special Leave this session:</strong>{" "}
                    {splBalance.usedDays} used · {splBalance.remainingDays}{" "}
                    remaining of {splBalance.maxDaysPerYear} days
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    No Special Leave balance yet (0 of{" "}
                    {SPECIAL_LEAVE_MAX_DAYS_PER_YEAR} days used).
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="spl-start">From</Label>
                <Input
                  id="spl-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spl-end">To</Label>
                <Input
                  id="spl-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {previewDays != null && previewDays > 0 && (
              <p className="text-sm text-muted-foreground">
                {previewDays} working day{previewDays === 1 ? "" : "s"} will be
                counted (holidays excluded).
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="spl-reason">Reason</Label>
              <Input
                id="spl-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Board exam duty / Medical case"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="spl-principal">Principal&apos;s recommendation</Label>
              <Textarea
                id="spl-principal"
                value={principalRecommendation}
                onChange={(e) => setPrincipalRecommendation(e.target.value)}
                placeholder="Brief note on Principal's approval (date or reference)"
                rows={3}
                required
              />
            </div>

            <Button type="submit" disabled={submitting || !staffId}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Grant Special Leave (approved)"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Granted leave appears as approved in Leave Applications with source
        &quot;admin grant&quot;. Staff see it in their application history only.
      </p>
    </div>
  );
}
