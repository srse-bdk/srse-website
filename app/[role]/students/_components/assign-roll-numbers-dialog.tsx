"use client";

import { Hash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { studentService } from "@/lib/services";

interface AssignRollNumbersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AssignRollNumbersDialog({
  open,
  onOpenChange,
  onSuccess,
}: AssignRollNumbersDialogProps) {
  const [isAssigning, setIsAssigning] = useState(false);

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      const result = await studentService.assignRollNumbersAlphabetically();
      const parts = [
        `${result.updatedCount} roll number(s) assigned`,
        `${result.groupCount} class-section group(s)`,
      ];
      if (result.skippedCount > 0) {
        parts.push(`${result.skippedCount} skipped (missing class/section)`);
      }
      toast.success(`Roll numbers updated: ${parts.join(", ")}.`);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to assign roll numbers:", error);
      toast.error("Failed to assign roll numbers. Please try again.");
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Assign roll numbers for this year?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              This assigns roll numbers 1, 2, 3… within each class-section,
              sorted alphabetically by student name. Use this once at the start
              of the academic year.
            </span>
            <span className="block">
              Existing roll numbers in those groups will be overwritten. Students
              without class or section are skipped. Late admissions after this
              will receive the next available roll number, not an alphabetical
              slot.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isAssigning}>Cancel</AlertDialogCancel>
          <Button
            onClick={async () => {
              await handleAssign();
            }}
            disabled={isAssigning}
          >
            {isAssigning ? "Assigning..." : "Assign Roll Numbers"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface AssignRollNumbersButtonProps {
  disabled?: boolean;
}

export function AssignRollNumbersButton({
  disabled = false,
}: AssignRollNumbersButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
      >
        <Hash className="h-4 w-4" />
        <span className="hidden sm:inline">Assign Roll Numbers</span>
        <span className="sm:hidden">Roll Nos</span>
      </Button>
      <AssignRollNumbersDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
