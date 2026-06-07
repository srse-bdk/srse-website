"use client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parentService } from "@/lib/services";
import type { User } from "@/lib/types/user.type";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: User | null;
  onSuccess: () => void;
}

export function DeleteParentDialog({
  open,
  onOpenChange,
  parent,
  onSuccess,
}: DeleteParentDialogProps) {
  const [deletePassword, setDeletePassword] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!parent || !deletePassword.trim()) {
      toast.error("Please enter the parent password to confirm deletion");
      return;
    }

    setIsDeleting(true);
    try {
      await parentService.delete(parent.id, parent.email, deletePassword);
      toast.success("Parent deleted successfully!");
      onSuccess();
      onOpenChange(false);
      setDeletePassword("");
    } catch (error) {
      console.error("Error deleting parent:", error);
      toast.error(
        "Failed to delete parent. Please check the password and try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    setDeletePassword("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Parent Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{parent?.name}</strong>?
            This action will permanently remove the parent account and cannot be
            undone. All linked student authorizations for this parent will be
            removed.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="delete-password">Enter Parent Password</Label>
            <Input
              id="delete-password"
              type="password"
              placeholder="Enter parent's password to confirm deletion"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeleting}
            />
            <p className="text-sm text-muted-foreground">
              You must enter the parent's current password to confirm deletion.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isDeleting}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting || !deletePassword.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
