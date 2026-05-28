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
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface EditParentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: User | null;
  onSuccess: () => void;
}

export function EditParentDialog({
  open,
  onOpenChange,
  parent,
  onSuccess,
}: EditParentDialogProps) {
  const [editName, setEditName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Update editName when parent changes
  useEffect(() => {
    if (parent) {
      setEditName(parent.name);
    }
  }, [parent]);

  const handleEdit = async () => {
    if (!parent || !editName.trim()) {
      toast.error("Please enter a valid parent name");
      return;
    }

    setIsEditing(true);
    try {
      await parentService.update(parent.id, {
        name: editName.trim(),
      });
      toast.success("Parent name updated successfully!");
      onSuccess();
      onOpenChange(false);
      setEditName("");
    } catch (error) {
      console.error("Error updating parent:", error);
      toast.error("Failed to update parent name. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setEditName("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Parent Name</AlertDialogTitle>
          <AlertDialogDescription>
            Update the display name for <strong>{parent?.name}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Parent Name</Label>
            <Input
              id="edit-name"
              type="text"
              placeholder="Enter parent name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={isEditing}
            />
            <p className="text-sm text-muted-foreground">
              This will update the parent's display name used across the
              platform.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isEditing}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleEdit}
            disabled={isEditing || !editName.trim()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isEditing ? "Updating..." : "Update Name"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
