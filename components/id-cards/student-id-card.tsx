"use client";

import {
  IdCardBodySection,
  IdCardGeometricFooterStrip,
  IdCardGeometricHeader,
  IdCardPersonName,
  IdCardSquarePhoto,
} from "@/components/id-cards/id-card-geometric";
import {
  formatDoB,
  getPersonInitials,
  IdCardDetailRow,
} from "@/components/id-cards/id-card-shared";
import { idCardBaseStyle } from "@/lib/config/id-card";
import { getIdCardTheme } from "@/lib/config/id-card-themes";
import type { IdCardThemeId } from "@/lib/types/id-card-settings.type";
import type { Student } from "@/lib/types/student.type";
import {
  formatClassSectionDisplay,
  getStudentPrimaryContact,
} from "@/lib/utils/student-display";
import { cn } from "@/lib/utils";

interface StudentIdCardProps {
  student: Student;
  themeId?: IdCardThemeId;
  academicYear?: string;
  principalSignatureUrl?: string;
  className?: string;
}

export function StudentIdCard({
  student,
  themeId,
  academicYear = "2026-27",
  principalSignatureUrl,
  className,
}: StudentIdCardProps) {
  const theme = getIdCardTheme(themeId);
  const scanId = student.scanId?.trim() || "";
  const displayName = student.fullName?.trim() || "Student";
  const classSection = formatClassSectionDisplay(student);
  const contact = getStudentPrimaryContact(student);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg bg-white shadow-md",
        className,
      )}
      style={idCardBaseStyle}
    >
      <IdCardGeometricHeader theme={theme} />

      <IdCardBodySection
        theme={theme}
        cardTitle="Student ID Card"
        academicYear={academicYear}
        scanId={scanId}
        principalSignatureUrl={principalSignatureUrl}
        photo={
          <IdCardSquarePhoto
            theme={theme}
            src={student.profilePicture}
            alt={displayName}
            initials={getPersonInitials(displayName)}
            className="block"
          />
        }
        details={
          <>
            <IdCardPersonName name={displayName} theme={theme} />
            <div className="space-y-[1px]">
              {classSection !== "-" ? (
                <IdCardDetailRow theme={theme} label="Class" value={classSection} />
              ) : null}
              <IdCardDetailRow
                theme={theme}
                label="D.O.B"
                value={formatDoB(student.dateOfBirth)}
              />
              <IdCardDetailRow
                theme={theme}
                label="Blood Group"
                value={student.bloodGroup}
              />
              <IdCardDetailRow
                theme={theme}
                label="Mobile No."
                value={contact.phone}
              />
            </div>
          </>
        }
      />

      <IdCardGeometricFooterStrip theme={theme} />
    </div>
  );
}
