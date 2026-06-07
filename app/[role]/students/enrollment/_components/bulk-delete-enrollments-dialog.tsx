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
import { enrollmentService } from "@/lib/services/enrollment.service";
import { AlertTriangle } from "lucide-react";

interface BulkDeleteEnrollmentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: string[];
  onSuccess: () => void;
}

export function BulkDeleteEnrollmentsDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkDeleteEnrollmentsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of selectedIds) {
        try {
          await enrollmentService.delete(id);
          successCount++;
        } catch (error) {
          console.error(`Failed to delete enrollment ${id}:`, error);
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} enrollment(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} enrollment(s)`);
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error performing bulk delete:", error);
      toast.error("Failed to delete enrollments. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Delete Selected Enrollments
          </AlertDialogTitle>
          <AlertDialogDescription>
            <span className="text-red-500 font-semibold">Warning:</span> You are
            about to permanently delete <strong>{selectedIds.length}</strong>{" "}
            enrollment record(s). This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBulkDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete All Selected"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
