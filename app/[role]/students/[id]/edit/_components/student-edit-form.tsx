"use client";

import { StudentForm } from "@/app/[role]/students/create/_components/student-form";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { Student } from "@/lib/types/student.type";
import { useParams } from "next/navigation";

export function StudentEditForm() {
  const params = useParams();
  const studentId = params.id as string;

  const { data, loading, error } = useFirebaseRealtime<Student>(
    `students/${studentId}`,
    {
      asArray: false,
    },
  );

  const rawStudent = data as Student | null;
  const student =
    rawStudent && (rawStudent.firstName || rawStudent.fullName || rawStudent.admissionNumber)
      ? { ...rawStudent, id: rawStudent.id || studentId }
      : null;

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

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <StudentForm key={studentId} student={student} />
    </div>
  );
}
