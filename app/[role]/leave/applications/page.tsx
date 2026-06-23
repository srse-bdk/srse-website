"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getAuth } from "firebase/auth";
import { format, parseISO } from "date-fns";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { staffLeaveService } from "@/lib/services";
import type { StaffLeaveApplication } from "@/lib/types/leave.type";
import { formatDateTime } from "@/lib/utils/date";

export default function LeaveApplicationsPage() {
  const params = useParams();
  const role = params.role as string;
  const user = useAppStore((state) => state.user);

  const { data, loading } = useFirebaseRealtime<StaffLeaveApplication>(
    "staffLeaveApplications",
    { asArray: true },
  );

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending">("pending");

  const applications = useMemo(() => {
    const all = ((data as StaffLeaveApplication[]) || []).sort(
      (a, b) => b.appliedAt - a.appliedAt,
    );
    if (filter === "pending") {
      return all.filter((app) => app.status === "pending");
    }
    return all;
  }, [data, filter]);

  const handleReview = async (
    id: string,
    status: "approved" | "rejected",
  ) => {
    const reviewerId = user?.uid ?? getAuth().currentUser?.uid;
    if (!reviewerId) {
      toast.error("Unable to identify reviewer. Please sign in again.");
      return;
    }
    setProcessingId(id);
    try {
      await staffLeaveService.reviewApplication(id, status, reviewerId);
      toast.success(`Application ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review failed");
    } finally {
      setProcessingId(null);
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

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Applications</h1>
          <p className="text-muted-foreground">Approve or reject staff requests.</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filter === "pending" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("pending")}
          >
            Pending
          </Button>
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            All
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="size-6 animate-spin mx-auto" />
          ) : applications.length === 0 ? (
            <p className="text-sm text-muted-foreground">No applications found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.staffName}</TableCell>
                    <TableCell>{app.leaveTypeCode}</TableCell>
                    <TableCell>
                      {format(parseISO(app.startDate), "dd MMM")} –{" "}
                      {format(parseISO(app.endDate), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{app.totalDays}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{app.reason}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {app.status}
                        {app.source === "absent_conversion"
                          ? " · converted"
                          : app.source === "admin_grant"
                            ? " · admin grant"
                            : ""}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(app.appliedAt)}
                    </TableCell>
                    <TableCell>
                      {app.status === "pending" && (
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={processingId === app.id}
                            onClick={() => handleReview(app.id, "approved")}
                          >
                            <Check className="size-4 text-emerald-600" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            disabled={processingId === app.id}
                            onClick={() => handleReview(app.id, "rejected")}
                          >
                            <X className="size-4 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
