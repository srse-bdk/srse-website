"use client";

import {
  getIdCardLayout,
  type IdCardOrientation,
} from "@/lib/config/id-card";
import type { IdCardThemeId } from "@/lib/types/id-card-settings.type";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import { StaffIdCard } from "@/components/id-cards/staff-id-card";
import { StudentIdCard } from "@/components/id-cards/student-id-card";
import { cn } from "@/lib/utils";

interface IdCardPrintPagesProps {
  kind: "student" | "staff";
  themeId?: IdCardThemeId;
  academicYear?: string;
  principalSignatureUrl?: string;
  orientation?: IdCardOrientation;
  students?: Student[];
  staffMembers?: User[];
  studentPages?: Student[][];
  staffPages?: User[][];
  singleCard?: boolean;
  className?: string;
  pageClassName?: string;
}

function PrintPageGrid({
  children,
  pageClassName,
  singleCard = false,
  orientation = "landscape",
}: {
  children: React.ReactNode;
  pageClassName?: string;
  singleCard?: boolean;
  orientation?: IdCardOrientation;
}) {
  const layout = getIdCardLayout(orientation);

  if (singleCard) {
    return (
      <div
        className={cn(
          "id-card-print-page mx-auto box-border flex items-center justify-center bg-white",
          pageClassName,
        )}
        style={{
          width: "210mm",
          minHeight: "297mm",
          padding: "8mm",
          pageBreakAfter: "always",
          breakAfter: "page",
        }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "id-card-print-page mx-auto box-border bg-white",
        pageClassName,
      )}
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "8mm",
        display: "grid",
        gridTemplateColumns: `repeat(${layout.gridColumns}, ${layout.widthMm}mm)`,
        gridTemplateRows: `repeat(${layout.gridRows}, ${layout.heightMm}mm)`,
        columnGap: `${layout.columnGapMm}mm`,
        rowGap: `${layout.rowGapMm}mm`,
        justifyContent: "center",
        alignContent: "start",
        pageBreakAfter: "always",
        breakAfter: "page",
      }}
    >
      {children}
    </div>
  );
}

export function IdCardPrintPages({
  kind,
  themeId,
  academicYear,
  principalSignatureUrl,
  orientation = "landscape",
  students,
  staffMembers,
  studentPages,
  staffPages,
  singleCard = false,
  className,
  pageClassName,
}: IdCardPrintPagesProps) {
  if (kind === "student" && studentPages) {
    return (
      <div className={cn("space-y-8", className)}>
        {studentPages.map((pageStudents, pageIndex) => (
          <PrintPageGrid
            key={`student-page-${pageIndex}`}
            pageClassName={pageClassName}
            singleCard={singleCard && pageStudents.length === 1}
            orientation={orientation}
          >
            {pageStudents.map((student) => (
              <StudentIdCard
                key={student.id}
                student={student}
                themeId={themeId}
                academicYear={academicYear}
                principalSignatureUrl={principalSignatureUrl}
                orientation={orientation}
              />
            ))}
          </PrintPageGrid>
        ))}
      </div>
    );
  }

  if (kind === "staff" && staffPages) {
    return (
      <div className={cn("space-y-8", className)}>
        {staffPages.map((pageStaff, pageIndex) => (
          <PrintPageGrid
            key={`staff-page-${pageIndex}`}
            pageClassName={pageClassName}
            singleCard={singleCard && pageStaff.length === 1}
            orientation={orientation}
          >
            {pageStaff.map((staff) => (
              <StaffIdCard
                key={staff.id}
                staff={staff}
                themeId={themeId}
                academicYear={academicYear}
                principalSignatureUrl={principalSignatureUrl}
                orientation={orientation}
              />
            ))}
          </PrintPageGrid>
        ))}
      </div>
    );
  }

  if (kind === "student" && students) {
    return (
      <div className={cn("flex flex-wrap justify-center gap-6", className)}>
        {students.map((student) => (
          <StudentIdCard
            key={student.id}
            student={student}
            themeId={themeId}
            academicYear={academicYear}
            principalSignatureUrl={principalSignatureUrl}
            orientation={orientation}
          />
        ))}
      </div>
    );
  }

  if (kind === "staff" && staffMembers) {
    return (
      <div className={cn("flex flex-wrap justify-center gap-6", className)}>
        {staffMembers.map((staff) => (
          <StaffIdCard
            key={staff.id}
            staff={staff}
            themeId={themeId}
            academicYear={academicYear}
            principalSignatureUrl={principalSignatureUrl}
            orientation={orientation}
          />
        ))}
      </div>
    );
  }

  return null;
}
