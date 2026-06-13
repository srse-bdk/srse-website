"use client";

import {
  IdCardBodySection,
  IdCardGeometricFooterStrip,
  IdCardGeometricHeader,
  IdCardPersonName,
  IdCardSquarePhoto,
} from "@/components/id-cards/id-card-geometric";
import {
  IdCardPortraitBodySection,
  IdCardPortraitFooterStrip,
  IdCardPortraitHeader,
  IdCardPortraitSquarePhoto,
} from "@/components/id-cards/id-card-geometric-portrait";
import {
  formatDoB,
  getPersonInitials,
  IdCardDetailRow,
} from "@/components/id-cards/id-card-shared";
import {
  getIdCardBaseStyle,
  type IdCardOrientation,
} from "@/lib/config/id-card";
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
  orientation?: IdCardOrientation;
  className?: string;
}

export function StudentIdCard({
  student,
  themeId,
  academicYear = "2026-27",
  principalSignatureUrl,
  orientation = "landscape",
  className,
}: StudentIdCardProps) {
  const theme = getIdCardTheme(themeId);
  const scanId = student.scanId?.trim() || "";
  const displayName = student.fullName?.trim() || "Student";
  const classSection = formatClassSectionDisplay(student);
  const contact = getStudentPrimaryContact(student);

  const isPortrait = orientation === "portrait";

  const details = (
    <div className={isPortrait ? "space-y-[0.3mm]" : undefined}>
      <IdCardPersonName
        name={displayName}
        theme={theme}
        compact={isPortrait}
      />
      <div className={isPortrait ? "space-y-[0.15mm]" : "space-y-[1px]"}>
        {classSection !== "-" ? (
          <IdCardDetailRow
            theme={theme}
            label="Class"
            value={classSection}
            compact={isPortrait}
          />
        ) : null}
        <IdCardDetailRow
          theme={theme}
          label="D.O.B"
          value={formatDoB(student.dateOfBirth)}
          compact={isPortrait}
        />
        <IdCardDetailRow
          theme={theme}
          label="Blood Group"
          value={student.bloodGroup}
          compact={isPortrait}
        />
        <IdCardDetailRow
          theme={theme}
          label="Mobile No."
          value={contact.phone}
          compact={isPortrait}
        />
      </div>
    </div>
  );

  if (isPortrait) {
    return (
      <div
        className={cn(
          "flex flex-col overflow-hidden rounded-lg bg-white shadow-md",
          className,
        )}
        style={getIdCardBaseStyle("portrait")}
      >
        <IdCardPortraitHeader theme={theme} />
        <IdCardPortraitBodySection
          theme={theme}
          cardTitle="Student ID Card"
          academicYear={academicYear}
          scanId={scanId}
          principalSignatureUrl={principalSignatureUrl}
          photo={
            <IdCardPortraitSquarePhoto
              theme={theme}
              src={student.profilePicture}
              alt={displayName}
              initials={getPersonInitials(displayName)}
            />
          }
          details={details}
        />
        <IdCardPortraitFooterStrip theme={theme} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg bg-white shadow-md",
        className,
      )}
      style={getIdCardBaseStyle("landscape")}
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
        details={details}
      />

      <IdCardGeometricFooterStrip theme={theme} />
    </div>
  );
}
