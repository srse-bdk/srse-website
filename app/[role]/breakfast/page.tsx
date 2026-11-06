"use client";

import { format, parseISO } from "date-fns";
import { Coffee, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { breakfastOrderService } from "@/lib/services/breakfast-order.service";
import type { BreakfastOrder } from "@/lib/types/canteen.type";
import {
  getOrderCutoff,
  getTomorrowYmd,
  isOrderingOpenForDate,
} from "@/lib/utils/canteen-breakfast";

function formatDisplayDate(ymd: string): string {
  try {
    return format(parseISO(`${ymd}T12:00:00`), "EEEE, d MMM yyyy");
  } catch {
    return ymd;
  }
}

export default function StudentBreakfastPage() {
  const user = useAppStore((state) => state.user);
  const studentId = user?.studentId || "";
  const forDate = useMemo(() => getTomorrowYmd(), []);
  const orderingOpen = isOrderingOpenForDate(forDate);
  const cutoff = getOrderCutoff(forDate);

  const { data, loading } = useFirebaseRealtime<BreakfastOrder>(
    "breakfastOrders",
    {
      asArray: true,
      filter: (row) =>
        row.studentId === studentId && row.forDate === forDate,
      enabled: Boolean(studentId),
    },
  );

  const order = useMemo(() => {
    const rows = (data as BreakfastOrder[]) || [];
    return (
      rows.find((r) => r.status === "ordered" || r.status === "paid") ||
      rows[0] ||
      null
    );
  }, [data]);

  const [saving, setSaving] = useState(false);

  const classLabel = [user?.currentClass, user?.currentSection]
    .filter(Boolean)
    .join("-") || "-";

  const handleYes = async () => {
    if (!studentId) return;
    setSaving(true);
    try {
      await breakfastOrderService.placeOrder(
        {
          studentId,
          studentName: user?.name || "Student",
          classLabel,
          forDate,
        },
        user?.uid || studentId,
      );
      toast.success("Breakfast ordered for tomorrow — pay at the canteen");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to place order",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNo = async () => {
    if (!studentId) return;
    setSaving(true);
    try {
      await breakfastOrderService.cancelOrder(
        studentId,
        forDate,
        user?.uid || studentId,
      );
      toast.success("Breakfast order cancelled");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel order",
      );
    } finally {
      setSaving(false);
    }
  };

  const activeOrdered =
    order?.status === "ordered" || order?.status === "paid";

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Coffee className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Tomorrow&apos;s breakfast</h1>
          <p className="text-sm text-muted-foreground">
            Order by 10:00 PM tonight. Pay at the canteen.
          </p>
        </div>
      </div>

      {!studentId ? (
        <p className="text-sm text-muted-foreground">
          Your student profile is not linked to this account.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {formatDisplayDate(forDate)}
            </CardTitle>
            <CardDescription>
              Cutoff: {format(cutoff, "d MMM yyyy, h:mm a")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {order?.status === "paid" ? (
              <div className="space-y-2">
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">
                  Paid at canteen
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Your breakfast for tomorrow is confirmed and paid.
                </p>
              </div>
            ) : order?.status === "ordered" ? (
              <div className="space-y-2">
                <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border-none">
                  Ordered — pay at canteen
                </Badge>
                <p className="text-sm text-muted-foreground">
                  You&apos;re on the list for tomorrow. Pay when you collect
                  breakfast.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Do you want breakfast tomorrow?
              </p>
            )}

            {!orderingOpen ? (
              <p className="text-sm font-medium text-muted-foreground">
                Ordering is closed for tomorrow (after 10:00 PM).
              </p>
            ) : order?.status === "paid" ? null : (
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  className="flex-1"
                  disabled={saving || activeOrdered}
                  onClick={() => void handleYes()}
                >
                  {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
                  Yes, I want breakfast
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled={saving || !activeOrdered}
                  onClick={() => void handleNo()}
                >
                  No / Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
