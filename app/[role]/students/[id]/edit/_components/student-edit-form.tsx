"use client";

import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { Student } from "@/lib/types/student.type";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentForm } from "@/app/[role]/students/create/_components/student-form";

export function StudentEditForm() {
  const params = useParams();
  const studentId = params.id as string;

  const { data, loading, error } = useFirebaseRealtime<Student>(
    `students/${studentId}`,
    {
      asArray: false,
    },
  );

  const student = data as Student | null;

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full mt-4" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <p className="text-muted-foreground">
              {error instanceof Error
                ? error.message
                : "Student not found or failed to load."}
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // For now, redirect to create form with a note that edit functionality will be added
  // In a full implementation, you'd create an edit form component similar to create
  return (
    <div className="container mx-auto p-4 sm:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Student</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Edit functionality is coming soon. For now, you can view the student
            profile and manage documents.
          </p>
          <p className="text-sm">
            Student: <strong>{student.fullName}</strong> (Admission No:{" "}
            {student.admissionNumber})
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

