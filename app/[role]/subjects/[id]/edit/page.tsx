"use client";

import { SubjectEditForm } from "./_components/subject-edit-form";

export default function EditSubjectPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Edit Subject</h1>
        <p className="text-muted-foreground mt-1">
          Update subject details in the master subject list
        </p>
      </div>
      <SubjectEditForm />
    </div>
  );
}
