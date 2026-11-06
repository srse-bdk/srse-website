"use client";

import { format, parseISO } from "date-fns";
import { Coffee, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CanteenUserManager } from "@/app/[role]/canteen/_components/canteen-user-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { breakfastOrderService } from "@/lib/services/breakfast-order.service";
import type { BreakfastOrder } from "@/lib/types/canteen.type";
import {
  getTomorrowYmd,
  toLocalYmd,
} from "@/lib/utils/canteen-breakfast";

function statusBadge(status: BreakfastOrder["status"]) {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
          Paid
        </Badge>
      );
    case "ordered":
      return (
        <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-none">
          Unpaid
        </Badge>
      );
    case "cancelled":
      return (
        <Badge variant="secondary" className="border-none">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function CanteenPage() {
  const user = useAppStore((state) => state.user);
  const [selectedDate, setSelectedDate] = useState(() => getTomorrowYmd());
  const [markingId, setMarkingId] = useState<string | null>(null);

  const { data, loading } = useFirebaseRealtime<BreakfastOrder>(
    "breakfastOrders",
    { asArray: true },
  );

  const ordersForDate = useMemo(() => {
    const rows = ((data as BreakfastOrder[]) || []).filter(
      (row) => row.forDate === selectedDate && row.status !== "cancelled",
    );
    return rows.sort((a, b) =>
      String(a.studentName || "").localeCompare(String(b.studentName || "")),
    );
  }, [data, selectedDate]);

  const prepCount = ordersForDate.length;
  const unpaidCount = ordersForDate.filter((o) => o.status === "ordered").length;
  const paidCount = ordersForDate.filter((o) => o.status === "paid").length;

  const handleMarkPaid = async (orderId: string) => {
    setMarkingId(orderId);
    try {
      await breakfastOrderService.markPaid(orderId, user?.uid || "canteen");
      toast.success("Marked as paid");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to mark paid",
      );
    } finally {
      setMarkingId(null);
    }
  };

  let dateLabel = selectedDate;
  try {
    dateLabel = format(parseISO(`${selectedDate}T12:00:00`), "EEEE, d MMM yyyy");
  } catch {
    /* keep ymd */
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Coffee className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Canteen breakfast</h1>
            <p className="text-sm text-muted-foreground">
              Next-day orders from students. Payment collected at the counter.
            </p>
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="canteen-date">Breakfast date</Label>
          <Input
            id="canteen-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || getTomorrowYmd())}
            className="w-[180px]"
          />
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => setSelectedDate(toLocalYmd())}
            >
              Today
            </button>
            <button
              type="button"
              className="text-primary underline-offset-2 hover:underline"
              onClick={() => setSelectedDate(getTomorrowYmd())}
            >
              Tomorrow
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>To prepare</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{prepCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {dateLabel}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Unpaid</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-amber-700">
              {unpaidCount}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Paid</CardDescription>
            <CardTitle className="text-3xl tabular-nums text-emerald-700">
              {paidCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Orders</CardTitle>
          <CardDescription>
            Active breakfast orders for {dateLabel}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : ordersForDate.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No breakfast orders for this date.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ordersForDate.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.studentName}
                    </TableCell>
                    <TableCell>{order.classLabel || "—"}</TableCell>
                    <TableCell>{statusBadge(order.status)}</TableCell>
                    <TableCell className="text-right">
                      {order.status === "ordered" ? (
                        <Button
                          size="sm"
                          disabled={markingId === order.id}
                          onClick={() => void handleMarkPaid(order.id)}
                        >
                          {markingId === order.id && (
                            <Loader2 className="size-3 mr-1 animate-spin" />
                          )}
                          Mark paid
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CanteenUserManager />
    </div>
  );
}
