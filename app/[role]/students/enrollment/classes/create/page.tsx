"use client";

import { ClassForm } from "./_components/class-form";

export default function CreateClassPage() {
  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Create Class</h1>
        <p className="text-muted-foreground mt-1">
          Create a new class with sections and capacity settings
        </p>
      </div>
      <ClassForm />
    </div>
  );
}

