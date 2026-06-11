"use client";

import { mutate } from "@atechhub/firebase";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StaffIdCard } from "@/components/id-cards/staff-id-card";
import { StudentIdCard } from "@/components/id-cards/student-id-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEFAULT_ACADEMIC_YEAR } from "@/lib/config/id-card";
import { DEFAULT_ID_CARD_THEME_ID } from "@/lib/config/id-card-themes";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";

interface IdCardThemePickerProps {
  academicYear: string;
  principalSignatureUrl?: string;
  previewKind: "student" | "staff";
  previewStudent: Student;
  previewStaff: User;
  previewLabel?: string;
  onAcademicYearChange: (year: string) => void;
}

export function IdCardThemePicker({
  academicYear,
  principalSignatureUrl,
  previewKind,
  previewStudent,
  previewStaff,
  previewLabel,
  onAcademicYearChange,
}: IdCardThemePickerProps) {
  const [savingYear, setSavingYear] = useState(false);
  const themeId = DEFAULT_ID_CARD_THEME_ID;

  const handleAcademicYearBlur = async () => {
    const trimmed = academicYear.trim() || DEFAULT_ACADEMIC_YEAR;
    onAcademicYearChange(trimmed);

    setSavingYear(true);
    try {
      await mutate({
        action: "update",
        path: "settings/idCard",
        data: {
          academicYear: trimmed,
          updatedAt: new Date().toISOString(),
        },
        actionBy: "admin",
      });
    } catch (error) {
      console.error("Failed to save academic year:", error);
      toast.error("Failed to save academic year");
    } finally {
      setSavingYear(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Card preview</CardTitle>
        <CardDescription>
          Sunshine Rainbow is the school ID card theme. In single-card mode, the
          selected student or staff member is shown here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="max-w-xs space-y-2">
          <Label htmlFor="academic-year">Academic year</Label>
          <div className="relative">
            <Input
              id="academic-year"
              value={academicYear}
              onChange={(event) => onAcademicYearChange(event.target.value)}
              onBlur={handleAcademicYearBlur}
              placeholder={DEFAULT_ACADEMIC_YEAR}
            />
            {savingYear ? (
              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Live preview</Label>
            {previewLabel ? (
              <p className="text-xs text-muted-foreground">{previewLabel}</p>
            ) : null}
          </div>
          <div className="overflow-x-auto rounded-lg border bg-muted/30 p-6">
            <div className="inline-block origin-top-left scale-[1.45]">
              {previewKind === "student" ? (
                <StudentIdCard
                  student={previewStudent}
                  themeId={themeId}
                  academicYear={academicYear || DEFAULT_ACADEMIC_YEAR}
                  principalSignatureUrl={principalSignatureUrl}
                />
              ) : (
                <StaffIdCard
                  staff={previewStaff}
                  themeId={themeId}
                  academicYear={academicYear || DEFAULT_ACADEMIC_YEAR}
                  principalSignatureUrl={principalSignatureUrl}
                />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
