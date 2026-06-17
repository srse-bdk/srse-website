"use client";

import { useState } from "react";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FULL_LEAVE_POLICY_DESCRIPTION } from "@/lib/config/leave-accrual";
import { staffLeaveService } from "@/lib/services";

export function LeavePolicyResetCard() {
  const [isResetting, setIsResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await staffLeaveService.resetAllLeaveData("admin");

      toast.success(
        `Leave data reset complete. Removed ${result.applicationsDeleted} application(s) and ${result.accrualsDeleted} accrual record(s). Credited ${result.accrualsCreated} quarter entries for ${result.staffProcessed} staff.`,
      );
      setDialogOpen(false);
    } catch (error) {
      console.error("Leave reset failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset leave data. Please try again.",
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="size-5 text-destructive" />
          Reset leave policy &amp; data
        </CardTitle>
        <CardDescription>
          {FULL_LEAVE_POLICY_DESCRIPTION} Use this once to clear all staff leave
          requests and rebuild quarterly balances under the current policy.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (isResetting) return;
            setDialogOpen(open);
          }}
        >
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isResetting}>
              {isResetting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RotateCcw className="mr-2 size-4" />
              )}
              Reset all leave requests &amp; accruals
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset all staff leave data?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  This permanently deletes every leave application (pending,
                  approved, rejected) and all quarterly accrual records for all
                  staff.
                </span>
                <span className="block">
                  Then it applies the policy: {FULL_LEAVE_POLICY_DESCRIPTION}
                </span>
                <span className="block font-medium text-foreground">
                  Elapsed quarters in the current session will be credited
                  again for all active staff.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isResetting}
                onClick={(event) => {
                  event.preventDefault();
                  void handleReset();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isResetting ? "Resetting..." : "Yes, reset everything"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
