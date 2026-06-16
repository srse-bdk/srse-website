import { schoolLetterheadDefaults } from "@/lib/config/school-letterhead";

export function getDefaultSignatoryFields() {
  return {
    signatoryName: schoolLetterheadDefaults.signatoryName,
    signatoryTitle: schoolLetterheadDefaults.signatoryTitle,
    schoolLogo: schoolLetterheadDefaults.schoolLogo,
    staffSelectionMode: "manual" as const,
    gender: "female" as const,
  };
}
