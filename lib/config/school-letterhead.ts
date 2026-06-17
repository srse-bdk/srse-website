export const schoolLetterheadDefaults = {
  schoolName: "S R SCHOOL OF EXCELLENCE",
  schoolTagline: "(A venture of Rama Narayan Ray Educational Charitable Trust)",
  schoolAddress:
    "Acharya Nagar, Near Bont Square, Bhadrak, Odisha – 756100",
  schoolEmail: "srschoolofexcellence@gmail.com",
  schoolWebsite: "https://www.rnrayeducation.in",
  schoolLogo: "/logo.png",
  signatoryName: "Pankaj Mohanty",
  signatoryTitle: "Secretary and Trusty, RN Ray Educational Charitable Trust",
} as const;

export const defaultAdditionalRoleText =
  "Additionally, you will be doing the role of course coordinator managing academic activities in the school.";

export const defaultTermsConditionsBullets = [
  {
    title: "Job Title & Responsibilities",
    body: (jobTitle: string, reportingTo: string, additionalRole?: string) => {
      let text = `You're an ${jobTitle} reporting to ${reportingTo}.`;
      if (additionalRole?.trim()) {
        text += ` ${additionalRole.trim()}`;
      }
      return text;
    },
  },
  {
    title: "Performance",
    body: () =>
      "Your performance will be reviewed periodically, and any increments are at the management's discretion.",
  },
  {
    title: "Leave",
    body: () =>
      "You'll get leaves (e.g., Sick, Casual, Public Holidays) as per organisation's leave policy. Except Sick Leave, all other leaves should be pre-approved otherwise it will be treated as pay loss.",
  },
  {
    title: "Resignation & Termination",
    body: (noticeMonths: number) =>
      `You can opt to exit the school with ${noticeMonths} month's written notice. The school can terminate anytime for serious misconduct or continuous poor performance.`,
  },
] as const;
