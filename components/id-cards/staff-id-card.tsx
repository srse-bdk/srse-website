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
  getPersonInitials,
  IdCardDetailRow,
} from "@/components/id-cards/id-card-shared";
import {
  getIdCardBaseStyle,
  type IdCardOrientation,
} from "@/lib/config/id-card";
import { getIdCardTheme } from "@/lib/config/id-card-themes";
import type { IdCardThemeId } from "@/lib/types/id-card-settings.type";
import type { User } from "@/lib/types/user.type";
import { cn } from "@/lib/utils";

function formatStaffRole(staff: User): string {
  if (staff.position?.trim()) return staff.position.trim();
  if (staff.staffType === "teaching") return "Teacher";
  if (staff.staffType === "non-teaching") return "Non-teaching Staff";
  return "Staff";
}

interface StaffIdCardProps {
  staff: User;
  themeId?: IdCardThemeId;
  academicYear?: string;
  principalSignatureUrl?: string;
  orientation?: IdCardOrientation;
  className?: string;
}

export function StaffIdCard({
  staff,
  themeId,
  academicYear = "2026-27",
  principalSignatureUrl,
  orientation = "landscape",
  className,
}: StaffIdCardProps) {
  const theme = getIdCardTheme(themeId);
  const scanId = staff.scanId?.trim() || "";
  const displayName = staff.name?.trim() || "Staff Member";
  const role = formatStaffRole(staff);

  const isPortrait = orientation === "portrait";

  const details = (
    <div className={isPortrait ? "space-y-[0.3mm]" : undefined}>
      <IdCardPersonName
        name={displayName}
        theme={theme}
        compact={isPortrait}
      />
      <div className={isPortrait ? "space-y-[0.15mm]" : "space-y-[1px]"}>
        <IdCardDetailRow
          theme={theme}
          label="Role"
          value={role}
          compact={isPortrait}
        />
        <IdCardDetailRow
          theme={theme}
          label="Blood Group"
          value={staff.bloodGroup}
          compact={isPortrait}
        />
        <IdCardDetailRow
          theme={theme}
          label="Mobile No."
          value={staff.phoneNumber}
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
          cardTitle="Staff ID Card"
          academicYear={academicYear}
          scanId={scanId}
          principalSignatureUrl={principalSignatureUrl}
          photo={
            <IdCardPortraitSquarePhoto
              theme={theme}
              src={staff.profilePicture}
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
        cardTitle="Staff ID Card"
        academicYear={academicYear}
        scanId={scanId}
        principalSignatureUrl={principalSignatureUrl}
        photo={
          <IdCardSquarePhoto
            theme={theme}
            src={staff.profilePicture}
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
