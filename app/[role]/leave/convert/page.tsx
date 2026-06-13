"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { leaveTypeService, staffLeaveService } from "@/lib/services";
import type { LeaveType } from "@/lib/types/leave.type";
import type { User } from "@/lib/types/user.type";

export default function ConvertAbsencesPage() {
  const params = useParams();
  const role = params.role as string;
  const user = useAppStore((state) => state.user);

  const { data: staffData } = useFirebaseRealtime<User>("users", {
    asArray: true,
    filter: (u) => u.role === "staff" && u.status !== "inactive",
  });
  const staffs = (staffData as User[]) || [];

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [staffId, setStaffId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [absentDates, setAbsentDates] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loadingAbsences, setLoadingAbsences] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    leaveTypeService.ensureDefaults().then(async () => {
      const types = await leaveTypeService.getActive();
      setLeaveTypes(types);
      if (types[0]) setLeaveTypeId(types[0].id);
    });
  }, []);

  const loadAbsences = async () => {
    if (!staffId || !startDate || !endDate) {
      toast.error("Select staff and date range");
      return;
    }
    setLoadingAbsences(true);
    try {
      const dates = await staffLeaveService.findAbsentWorkingDays(
        staffId,
        startDate,
        endDate,
      );
      setAbsentDates(dates);
      setSelected(new Set(dates));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load absences");
    } finally {
      setLoadingAbsences(false);
    }
  };

  const toggleDate = (date: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const handleConvert = async () => {
    if (!staffId || !leaveTypeId || !user?.uid) return;
    const staff = staffs.find((s) => s.uid === staffId);
    if (!staff) return;

    const dates = Array.from(selected).sort();
    if (dates.length === 0) {
      toast.error("Select at least one absent day");
      return;
    }

    setConverting(true);
    try {
      const ids = await staffLeaveService.convertAbsencesToLeave(
        staffId,
        staff.name,
        leaveTypeId,
        dates,
        user.uid,
      );
      toast.success(`Converted ${ids.length} leave record(s)`);
      setAbsentDates([]);
      setSelected(new Set());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Conversion failed");
    } finally {
      setConverting(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/${role}/leave`}>
          <ArrowLeft className="size-4 mr-2" />
          Leave Management
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Convert Absences to Leave</h1>
        <p className="text-muted-foreground">
          Find working days with no gate check-in (excluding holidays and approved leave).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find absences</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Staff</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staffs.map((staff) => (
                  <SelectItem key={staff.uid} value={staff.uid!}>
                    {staff.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>From</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <Input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button
            type="button"
            onClick={loadAbsences}
            disabled={loadingAbsences}
            className="sm:col-span-2 lg:col-span-4 w-fit"
          >
            {loadingAbsences ? "Loading..." : "Load absent days"}
          </Button>
        </CardContent>
      </Card>

      {absentDates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Absent days ({selected.size} selected)</CardTitle>
            <CardDescription>
              Choose leave type and convert selected days to approved leave.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-sm">
              <Label>Leave type</Label>
              <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.code} — {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-64 overflow-y-auto">
              {absentDates.map((date) => (
                <label
                  key={date}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(date)}
                    onCheckedChange={() => toggleDate(date)}
                  />
                  {date}
                </label>
              ))}
            </div>
            <Button type="button" onClick={handleConvert} disabled={converting}>
              {converting ? "Converting..." : "Convert to leave"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
