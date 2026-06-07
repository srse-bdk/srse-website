"use client";

import { SubjectForm } from "./_components/subject-form";

export default function CreateSubjectPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Create Subject</h1>
        <p className="text-muted-foreground mt-1">
          Create a new subject in the master subject list
        </p>
      </div>
      <SubjectForm />
    </div>
  );
}
