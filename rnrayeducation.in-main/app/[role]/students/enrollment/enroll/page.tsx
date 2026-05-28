"use client";

import { EnrollmentForm } from "./_components/enrollment-form";

export default function EnrollPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Enroll Student</h1>
        <p className="text-muted-foreground mt-1">
          Enroll a student in a class and assign roll number
        </p>
      </div>
      <EnrollmentForm />
    </div>
  );
}

