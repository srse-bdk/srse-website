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
import { gateActivityResetService } from "@/lib/services";

export function GateActivityResetCard() {
  const [isResetting, setIsResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result =
        await gateActivityResetService.resetAllGateActivityHistory("admin");

      toast.success(
        `Gate activity cleared. Removed ${result.scannerLoginsDeleted} kiosk login(s) and ${result.studentScansDeleted} student scan(s). New logins and scans will be recorded from now on.`,
      );
      setDialogOpen(false);
    } catch (error) {
      console.error("Gate activity reset failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset gate activity. Please try again.",
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
          Reset gate activity history
        </CardTitle>
        <CardDescription>
          Clears all kiosk scanner login records and all student entry/exit
          scans. Admin activity log, student gate pages, and parent views will
          start empty. New events are recorded normally after this.
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
              Reset kiosk logins &amp; student scans
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear all gate activity history?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  This permanently deletes every kiosk login event and every
                  student arrival/dismissal scan in the activity log.
                </span>
                <span className="block font-medium text-foreground">
                  Gate scanners and student entry/exit will continue to work —
                  only past history is removed.
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
                {isResetting ? "Clearing..." : "Yes, clear all history"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
