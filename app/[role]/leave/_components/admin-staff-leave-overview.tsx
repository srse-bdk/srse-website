"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Loader2,
  Search,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { staffLeaveAccrualService, staffLeaveService } from "@/lib/services";
import type {
  StaffLeaveApplication,
  StaffLeaveBalanceSummary,
} from "@/lib/types/leave.type";
import type { User } from "@/lib/types/user.type";
import { getAcademicYear } from "@/lib/utils/academic-year";
import { formatDateTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

interface StaffLeaveOverviewRow {
  staffId: string;
  staffName: string;
  balances: StaffLeaveBalanceSummary[];
  splGranted: number;
  totalUsed: number;
  totalPending: number;
}

function getBalanceByCode(
  balances: StaffLeaveBalanceSummary[],
  code: string,
): StaffLeaveBalanceSummary | undefined {
  return balances.find((b) => b.code === code);
}

function formatBalanceCell(balance?: StaffLeaveBalanceSummary) {
  if (!balance) return "—";
  const pending =
    balance.pendingDays > 0 ? ` · ${balance.pendingDays} pending` : "";
  const mismatch =
    balance.usesQuarterlyAccrual &&
    balance.accruedDays !==
      balance.quartersCredited * balance.perQuarterDays;
  return (
    <span className="text-xs leading-snug">
      <span className="font-semibold">{balance.usedDays}</span>
      <span className="text-muted-foreground">/{balance.accruedDays}</span>
      <span className="text-muted-foreground"> · </span>
      <span
        className={cn(
          "font-medium",
          mismatch ? "text-amber-700" : "text-emerald-700",
        )}
      >
        {balance.remainingDays} left
      </span>
      {pending ? (
        <span className="text-amber-700">{pending}</span>
      ) : null}
    </span>
  );
}

function needsAccrualRepair(balances: StaffLeaveBalanceSummary[]): boolean {
  return balances.some(
    (b) =>
      b.usesQuarterlyAccrual &&
      b.accruedDays !== b.quartersCredited * b.perQuarterDays,
  );
}

async function loadStaffLeaveRows(
  staffs: User[],
  academicYear: string,
): Promise<StaffLeaveOverviewRow[]> {
  return Promise.all(
    staffs.map(async (staff) => {
      const staffId = staff.uid || staff.id;
      const [balances, spl] = await Promise.all([
        staffLeaveService.getStaffPortalBalanceSummary(staffId, academicYear),
        staffLeaveService.getSpecialLeaveBalance(staffId, academicYear),
      ]);

      const totalUsed = balances.reduce((s, b) => s + b.usedDays, 0);
      const totalPending = balances.reduce((s, b) => s + b.pendingDays, 0);
      const splGranted = spl?.usedDays ?? 0;

      return {
        staffId,
        staffName: staff.name,
        balances,
        splGranted,
        totalUsed: totalUsed + splGranted,
        totalPending,
      };
    }),
  );
}

export function AdminStaffLeaveOverview() {
  const params = useParams();
  const role = params.role as string;
  const academicYear = getAcademicYear();
  const today = new Date().toISOString().split("T")[0];

  const [search, setSearch] = useState("");
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffLeaveOverviewRow[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [balanceRefreshKey, setBalanceRefreshKey] = useState(0);
  const [repairingStaffId, setRepairingStaffId] = useState<string | null>(null);

  const { data: staffData, loading: staffLoading } = useFirebaseRealtime<User>(
    "users",
    {
      asArray: true,
      filter: (user) => user.role === "staff" && user.status !== "inactive",
    },
  );

  const { data: applicationsData, loading: appsLoading } =
    useFirebaseRealtime<StaffLeaveApplication>("staffLeaveApplications", {
      asArray: true,
    });

  const staffs = useMemo(() => {
    const list = (staffData as User[]) || [];
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [staffData]);

  const applications = (applicationsData as StaffLeaveApplication[]) || [];

  const { startDate: yearStart, endDate: yearEnd } = useMemo(() => {
    const startYear = Number.parseInt(academicYear.split("-")[0], 10);
    return {
      startDate: `${startYear}-04-01`,
      endDate: `${startYear + 1}-03-31`,
    };
  }, [academicYear]);

  const sessionApplications = useMemo(
    () =>
      applications.filter(
        (app) => app.endDate >= yearStart && app.startDate <= yearEnd,
      ),
    [applications, yearStart, yearEnd],
  );

  const pendingCount = useMemo(
    () => sessionApplications.filter((app) => app.status === "pending").length,
    [sessionApplications],
  );

  const onLeaveTodayCount = useMemo(() => {
    const staffOnLeave = new Set(
      sessionApplications
        .filter(
          (app) =>
            app.status === "approved" &&
            app.startDate <= today &&
            app.endDate >= today,
        )
        .map((app) => app.staffId),
    );
    return staffOnLeave.size;
  }, [sessionApplications, today]);

  const totalUsedDays = useMemo(
    () =>
      sessionApplications
        .filter((app) => app.status === "approved")
        .reduce((sum, app) => sum + app.totalDays, 0),
    [sessionApplications],
  );

  useEffect(() => {
    if (staffLoading || staffs.length === 0) {
      if (!staffLoading) {
        setRows([]);
        setLoadingBalances(false);
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoadingBalances(true);
      try {
        const results = await loadStaffLeaveRows(staffs, academicYear);
        if (!cancelled) {
          setRows(results);
        }
      } catch (error) {
        console.error("Failed to load staff leave balances:", error);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoadingBalances(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [staffs, academicYear, staffLoading, balanceRefreshKey]);

  const handleRepairAccruals = async (staffId: string, staffName: string) => {
    setRepairingStaffId(staffId);
    try {
      const { deleted, updated } =
        await staffLeaveAccrualService.repairAccrualsForStaff(
          staffId,
          academicYear,
          "admin",
        );
      if (deleted === 0 && updated === 0) {
        toast.message(`No duplicate accruals found for ${staffName}`);
      } else {
        toast.success(
          `Repaired ${staffName}: removed ${deleted} duplicate(s), fixed ${updated} record(s).`,
        );
      }
      setBalanceRefreshKey((k) => k + 1);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error
          ? error.message
          : `Failed to repair accruals for ${staffName}`,
      );
    } finally {
      setRepairingStaffId(null);
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => row.staffName.toLowerCase().includes(q));
  }, [rows, search]);

  const applicationsByStaff = useMemo(() => {
    const map = new Map<string, StaffLeaveApplication[]>();
    for (const app of sessionApplications) {
      const list = map.get(app.staffId) ?? [];
      list.push(app);
      map.set(app.staffId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.appliedAt - a.appliedAt);
    }
    return map;
  }, [sessionApplications]);

  const isLoading = staffLoading || appsLoading || loadingBalances;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Staff leave overview</h2>
          <p className="text-sm text-muted-foreground">
            Session {academicYear} — balances and leave taken per staff member
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${role}/leave/applications`}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Review applications
            {pendingCount > 0 ? ` (${pendingCount})` : ""}
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending approvals</CardDescription>
            <CardTitle className="text-3xl">{pendingCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On approved leave today</CardDescription>
            <CardTitle className="text-3xl">{onLeaveTodayCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total leave days taken (session)</CardDescription>
            <CardTitle className="text-3xl">{totalUsedDays}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Staff balances
            </CardTitle>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search staff..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
          <CardDescription>
            CL / SL / EL show used vs accrued and remaining. SPL shows admin-granted
            days only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {staffs.length === 0
                ? "No active staff found."
                : "No staff match your search."}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Staff</TableHead>
                    <TableHead>CL</TableHead>
                    <TableHead>SL</TableHead>
                    <TableHead>EL</TableHead>
                    <TableHead>SPL</TableHead>
                    <TableHead className="text-right">Total used</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRows.map((row) => {
                    const expanded = expandedStaffId === row.staffId;
                    const history = applicationsByStaff.get(row.staffId) ?? [];
                    const cl = getBalanceByCode(row.balances, "CL");
                    const sl = getBalanceByCode(row.balances, "SL");
                    const el = getBalanceByCode(row.balances, "EL");
                    const accrualMismatch = needsAccrualRepair(row.balances);

                    return (
                      <Fragment key={row.staffId}>
                        <TableRow
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() =>
                            setExpandedStaffId(expanded ? null : row.staffId)
                          }
                        >
                          <TableCell>
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <span className="inline-flex items-center gap-1.5">
                              {row.staffName}
                              {accrualMismatch ? (
                                <AlertTriangle
                                  className="h-3.5 w-3.5 shrink-0 text-amber-600"
                                  aria-label="Accrual data needs repair"
                                />
                              ) : null}
                            </span>
                          </TableCell>
                          <TableCell>{formatBalanceCell(cl)}</TableCell>
                          <TableCell>{formatBalanceCell(sl)}</TableCell>
                          <TableCell>{formatBalanceCell(el)}</TableCell>
                          <TableCell>
                            <span className="text-xs font-medium">
                              {row.splGranted} granted
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {row.totalUsed}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.totalPending > 0 ? (
                              <Badge variant="secondary" className="text-amber-800">
                                {row.totalPending}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">0</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {expanded ? (
                          <TableRow key={`${row.staffId}-history`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-0">
                              <div className="space-y-3 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="text-sm font-semibold">
                                    Leave history — {row.staffName}
                                  </p>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    disabled={repairingStaffId === row.staffId}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      void handleRepairAccruals(
                                        row.staffId,
                                        row.staffName,
                                      );
                                    }}
                                  >
                                    {repairingStaffId === row.staffId ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <Wrench className="mr-1 h-3 w-3" />
                                    )}
                                    Repair accruals
                                  </Button>
                                </div>
                                {accrualMismatch ? (
                                  <Alert className="border-amber-300 bg-amber-50">
                                    <AlertDescription className="text-sm text-amber-950">
                                      Accrued days do not match quarter credits
                                      (e.g. 3 accrued but only 2 quarters). Use{" "}
                                      <strong>Repair accruals</strong> to remove
                                      duplicate rows for this staff member only.
                                    </AlertDescription>
                                  </Alert>
                                ) : null}
                                {history.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No leave recorded this session.
                                  </p>
                                ) : (
                                  <div className="overflow-x-auto rounded-md border bg-background">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Type</TableHead>
                                          <TableHead>Dates</TableHead>
                                          <TableHead>Days</TableHead>
                                          <TableHead>Status</TableHead>
                                          <TableHead>Source</TableHead>
                                          <TableHead>Applied</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {history.map((app) => (
                                          <TableRow key={app.id}>
                                            <TableCell className="font-medium">
                                              {app.leaveTypeCode}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                              {format(
                                                parseISO(app.startDate),
                                                "dd MMM",
                                              )}{" "}
                                              –{" "}
                                              {format(
                                                parseISO(app.endDate),
                                                "dd MMM yyyy",
                                              )}
                                            </TableCell>
                                            <TableCell>{app.totalDays}</TableCell>
                                            <TableCell>
                                              <Badge
                                                variant="outline"
                                                className={cn(
                                                  "capitalize",
                                                  app.status === "pending" &&
                                                    "border-amber-300 text-amber-900",
                                                  app.status === "approved" &&
                                                    "border-emerald-300 text-emerald-900",
                                                )}
                                              >
                                                {app.status}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground capitalize">
                                              {app.source === "admin_grant"
                                                ? "Admin grant"
                                                : app.source === "absent_conversion"
                                                  ? "Converted"
                                                  : "Application"}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                              {formatDateTime(app.appliedAt)}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
