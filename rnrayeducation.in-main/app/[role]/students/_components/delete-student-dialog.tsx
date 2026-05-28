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
import { studentService } from "@/lib/services";
import type { Student } from "@/lib/types/student.type";
import { useState } from "react";
import { toast } from "sonner";

interface DeleteStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onSuccess: () => void;
}

export function DeleteStudentDialog({
  open,
  onOpenChange,
  student,
  onSuccess,
}: DeleteStudentDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!student) return;

    setIsDeleting(true);
    try {
      await studentService.delete(student.id);
      toast.success("Student deleted successfully");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to delete student. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (!student) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Student</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete{" "}
            <span className="font-semibold">{student.fullName}</span> (Admission
            No: {student.admissionNumber})? This action cannot be undone and
            will permanently delete the student's profile, documents, and all
            associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

