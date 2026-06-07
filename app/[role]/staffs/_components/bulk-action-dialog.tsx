"use client";

import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
import { staffService } from "@/lib/services";
import { AlertTriangle } from "lucide-react";

interface BulkActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  bulkAction: string;
  onSuccess: () => void;
}

export function BulkActionDialog({
  open,
  onOpenChange,
  selectedIds,
  bulkAction,
  onSuccess,
}: BulkActionDialogProps) {
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const isDeleteAction = bulkAction === "delete";

  const handleBulkAction = async () => {
    if (selectedIds.length === 0) return;

    setIsBulkProcessing(true);
    try {
      if (isDeleteAction) {
        // For delete, use the simpler deleteById method
        let successCount = 0;
        let failCount = 0;

        for (const id of selectedIds) {
          try {
            await staffService.deleteById(id);
            successCount++;
          } catch (error) {
            console.error(`Failed to delete staff ${id}:`, error);
            failCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully deleted ${successCount} staff(s)`);
        }
        if (failCount > 0) {
          toast.error(`Failed to delete ${failCount} staff(s)`);
        }
      } else {
        // Status update
        const promises = selectedIds.map((id) =>
          staffService.update(id, {
            status: bulkAction as "active" | "inactive" | "pending",
          }),
        );
        await Promise.all(promises);
        toast.success(
          `Successfully updated ${selectedIds.length} staffs to ${bulkAction}`,
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast.error(
        isDeleteAction
          ? "Failed to delete staffs. Please try again."
          : "Failed to update staffs. Please try again.",
      );
    } finally {
      setIsBulkProcessing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle
            className={
              isDeleteAction ? "text-red-600 flex items-center gap-2" : ""
            }
          >
            {isDeleteAction && <AlertTriangle className="h-5 w-5" />}
            {isDeleteAction ? "Delete Selected Staffs" : "Bulk Status Update"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDeleteAction ? (
              <>
                <span className="text-red-500 font-semibold">Warning:</span> You
                are about to permanently delete{" "}
                <strong>{selectedIds.length}</strong> staff(s). This action
                cannot be undone. All associated accounts will also be removed.
              </>
            ) : (
              <>
                Are you sure you want to set{" "}
                <strong>{selectedIds.length}</strong> staffs to{" "}
                <strong>{bulkAction}</strong> status? This action will update
                all selected staffs.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkAction}
            disabled={isBulkProcessing}
            className={isDeleteAction ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {isBulkProcessing
              ? isDeleteAction
                ? "Deleting..."
                : "Updating..."
              : isDeleteAction
                ? "Delete All Selected"
                : `Set to ${bulkAction}`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
