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
import { attendanceResetService } from "@/lib/services";

export function AttendanceResetCard() {
  const [isResetting, setIsResetting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result =
        await attendanceResetService.resetAllAttendanceHistory("admin");

      toast.success(
        `Attendance history cleared. Removed ${result.staffRecordsDeleted} staff record(s) and ${result.studentRecordsDeleted} student record(s).`,
      );
      setDialogOpen(false);
    } catch (error) {
      console.error("Attendance reset failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset attendance data. Please try again.",
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
          Reset attendance history
        </CardTitle>
        <CardDescription>
          Permanently deletes all staff punch-in/out records and all student
          attendance marks (present, absent, late, gate scans). This cannot be
          undone.
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
              Reset all staff &amp; student attendance
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Delete all attendance data for staff and students?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <span className="block">
                  This removes every record in staff attendance (punch history,
                  gate entries) and student attendance (daily marks, reports,
                  calendar data).
                </span>
                <span className="block font-medium text-foreground">
                  Staff and student profiles are not affected — only attendance
                  history is deleted.
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
                {isResetting ? "Deleting..." : "Yes, delete all attendance"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
