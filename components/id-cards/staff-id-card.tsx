"use client";

import {
  IdCardBodySection,
  IdCardGeometricFooterStrip,
  IdCardGeometricHeader,
  IdCardPersonName,
  IdCardSquarePhoto,
} from "@/components/id-cards/id-card-geometric";
import {
  getPersonInitials,
  IdCardDetailRow,
} from "@/components/id-cards/id-card-shared";
import { idCardBaseStyle } from "@/lib/config/id-card";
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
  className?: string;
}

export function StaffIdCard({
  staff,
  themeId,
  academicYear = "2026-27",
  principalSignatureUrl,
  className,
}: StaffIdCardProps) {
  const theme = getIdCardTheme(themeId);
  const scanId = staff.scanId?.trim() || "";
  const displayName = staff.name?.trim() || "Staff Member";
  const role = formatStaffRole(staff);

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
        details={
          <>
            <IdCardPersonName name={displayName} theme={theme} />
            <div className="space-y-[1px]">
              <IdCardDetailRow theme={theme} label="Role" value={role} />
              <IdCardDetailRow
                theme={theme}
                label="Blood Group"
                value={staff.bloodGroup}
              />
              <IdCardDetailRow
                theme={theme}
                label="Mobile No."
                value={staff.phoneNumber}
              />
            </div>
          </>
        }
      />

      <IdCardGeometricFooterStrip theme={theme} />
    </div>
  );
}
