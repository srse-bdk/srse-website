import { z } from "zod";

const personSelectionSchema = z.object({
  staffSelectionMode: z.enum(["list", "manual"]),
  gender: z.enum(["male", "female", "other"]),
});

const signatorySchema = z.object({
  signatoryName: z.string().min(1, "Signatory name is required"),
  signatoryTitle: z.string().min(1, "Signatory title is required"),
  schoolLogo: z.string().optional(),
});

export const annualIncrementLetterSchema = personSelectionSchema
  .merge(signatorySchema)
  .extend({
    letterDate: z.string().min(1, "Letter date is required"),
    employeeId: z.string().min(1, "Employee ID is required"),
    employeeName: z.string().min(1, "Employee name is required"),
    location: z.string().optional(),
    revisedSalary: z.number().min(1, "Revised salary is required"),
    effectiveDate: z.string().min(1, "Effective date is required"),
  });

export const termsConditionsLetterSchema = personSelectionSchema
  .merge(signatorySchema)
  .extend({
    employeeName: z.string().min(1, "Employee name is required"),
    jobTitle: z.string().min(1, "Job title is required"),
    reportingTo: z.string().min(1, "Reporting manager is required"),
    noticePeriodMonths: z.number().min(1).max(12),
    acknowledgmentDate: z.string().optional(),
  });

export const officialExperienceLetterSchema = personSelectionSchema
  .merge(signatorySchema)
  .extend({
    letterDate: z.string().min(1, "Letter date is required"),
    employeeId: z.string().optional(),
    personName: z.string().min(1, "Name is required"),
    designation: z.string().min(1, "Designation is required"),
    location: z.string().optional(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().optional(),
    additionalParagraph: z.string().optional(),
  });

export const officialAppointmentLetterSchema = personSelectionSchema
  .merge(signatorySchema)
  .extend({
    letterDate: z.string().min(1, "Letter date is required"),
    employeeId: z.string().optional(),
    employeeName: z.string().min(1, "Employee name is required"),
    location: z.string().optional(),
    positionTitle: z.string().min(1, "Position title is required"),
    reportingTo: z.string().min(1, "Reporting manager is required"),
    startDate: z.string().min(1, "Start date is required"),
    monthlySalary: z.number().optional(),
    probationMonths: z.number().min(0).max(12),
  });

export type AnnualIncrementLetterData = z.infer<
  typeof annualIncrementLetterSchema
>;
export type TermsConditionsLetterData = z.infer<
  typeof termsConditionsLetterSchema
>;
export type OfficialExperienceLetterData = z.infer<
  typeof officialExperienceLetterSchema
>;
export type OfficialAppointmentLetterData = z.infer<
  typeof officialAppointmentLetterSchema
>;
