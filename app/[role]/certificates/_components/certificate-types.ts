import { z } from "zod";

// Common certificate fields schema
export const commonCertificateSchema = z.object({
  // Header/Logo Section
  schoolLogo: z.string().optional(),
  schoolName: z.string().min(1, "School name is required"),
  schoolAddress: z.string().optional(),
  headerFontSize: z.enum(["small", "medium", "large"]),
  headerTextColor: z.string(),

  // Certificate Body
  certificateTitle: z.string().min(1, "Certificate title is required"),
  bodyContent: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  fontFamily: z.enum([
    "Arial",
    "Times New Roman",
    "Georgia",
    "Helvetica",
    "Courier New",
    "Roboto",
    "Open Sans",
    "Lato",
    "Montserrat",
    "Playfair Display",
    "Outfit",
  ]),
  fontSize: z.enum(["small", "medium", "large"]),
  textColor: z.string(),
  lineSpacing: z.enum(["normal", "1.5", "2", "2.5"]),

  // Footer/Signature Section
  signatoryName: z.string().min(1, "Signatory name is required"),
  signatoryTitle: z.string().min(1, "Signatory title is required"),
  signatureImage: z.string().optional(),
  dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD MMM YYYY"]),
  footerText: z.string().optional(),

  // Layout & Styling
  borderStyle: z.enum(["none", "solid", "dashed", "dotted"]),
  borderColor: z.string(),
  borderWidth: z.number().min(0).max(10),
  backgroundColor: z.string(),
  padding: z.number().min(0).max(100),
  textAlignment: z.enum(["left", "center", "right", "justify"]),
  dateInputType: z.enum(["picker", "manual"]).default("picker"),
  staffSelectionMode: z.enum(["list", "manual"]).default("list"),
});

// Experience Certificate specific fields
export const experienceCertificateSchema = commonCertificateSchema.extend({
  staffName: z.string().min(1, "Staff name is required"),
  gender: z.enum(["male", "female", "other"]).default("male"),
  staffPosition: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  duration: z.string().optional(),
  achievements: z.record(z.string(), z.unknown()).optional(),
  additionalNotes: z.string().optional(),
});

// Appointment Letter specific fields
export const appointmentLetterSchema = commonCertificateSchema.extend({
  staffName: z.string().min(1, "Staff name is required"),
  gender: z.enum(["male", "female", "other"]).default("male"),
  positionTitle: z.string().min(1, "Position title is required"),
  department: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  salaryAmount: z.number().optional(),
  salaryCurrency: z.string(),
  termsAndConditions: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  reportingManager: z.string().optional(),
  additionalClauses: z.string().optional(),
});

// Increment Letter specific fields
export const incrementLetterSchema = commonCertificateSchema.extend({
  staffName: z.string().min(1, "Staff name is required"),
  gender: z.enum(["male", "female", "other"]).default("male"),
  previousSalary: z.number().optional(),
  newSalary: z.number().optional(),
  incrementAmount: z.number().optional(),
  incrementPercentage: z.number().optional(),
  effectiveDate: z.string().min(1, "Effective date is required"),
  reason: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  additionalNotes: z.string().optional(),
});

export type CommonCertificateData = z.infer<typeof commonCertificateSchema>;
export type ExperienceCertificateData = z.infer<
  typeof experienceCertificateSchema
>;
export type AppointmentLetterData = z.infer<typeof appointmentLetterSchema>;
export type IncrementLetterData = z.infer<typeof incrementLetterSchema>;

export type CertificateType = "experience" | "appointment" | "increment";
