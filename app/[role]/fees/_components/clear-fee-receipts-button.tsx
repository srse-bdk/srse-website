"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { feeService } from "@/lib/services/fee.service";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

/**
 * Admin: wipe payment history and re-issue all fees for every student.
 */
export function ClearFeeReceiptsButton() {
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setLoading(true);
    try {
      const result = await feeService.resetPaymentsAndReissueAllFees();
      toast.success(
        `Cleared ${result.feePaymentsDeleted} payments. Reissued ${result.tuitionIssued + result.ayFeesIssued} bills for ${result.studentsUpdated} students (${result.newAdmissions} new / ${result.continuing} continuing).`,
      );
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to reset and reissue fees",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Reset payments & reissue fees
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset all payments and reissue fees?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Deletes every student payment receipt and fee bill, then applies
              fees again for all active students:
            </span>
            <span className="block">
              • New admissions this year → Admission fee; tuition from admission
              month
            </span>
            <span className="block">
              • Continuing students → Re-admission (includes April tuition);
              tuition from May
            </span>
            <span className="block">
              You can exclude fees per student afterwards. This cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleReset}
          >
            Yes, reset & reissue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
