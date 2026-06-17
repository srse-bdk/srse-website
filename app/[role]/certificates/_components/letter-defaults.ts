import {
  defaultAdditionalRoleText,
  schoolLetterheadDefaults,
} from "@/lib/config/school-letterhead";

export function getDefaultSignatoryFields() {
  return {
    signatoryName: schoolLetterheadDefaults.signatoryName,
    signatoryTitle: schoolLetterheadDefaults.signatoryTitle,
    schoolLogo: schoolLetterheadDefaults.schoolLogo,
    staffSelectionMode: "manual" as const,
    gender: "female" as const,
  };
}

export function getDefaultTermsConditionsFields() {
  return {
    ...getDefaultSignatoryFields(),
    employeeName: "",
    jobTitle: "Assistant Teacher – Level 2",
    reportingTo: "Principal, S R School of Excellence",
    noticePeriodMonths: 2,
    acknowledgmentDate: "",
    includeAdditionalRole: true,
    additionalRoleText: defaultAdditionalRoleText,
  };
}
