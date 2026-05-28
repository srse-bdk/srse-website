"use client";

import { forwardRef, useMemo } from "react";
import Image from "next/image";
import { format } from "date-fns";
import { RichTextRenderer } from "@/components/ui/rich-text-renderer";
import type {
  ExperienceCertificateData,
  AppointmentLetterData,
  IncrementLetterData,
  CertificateType,
} from "./certificate-types";

interface CertificatePreviewProps {
  data: ExperienceCertificateData | AppointmentLetterData | IncrementLetterData;
  type: CertificateType;
  isPrint?: boolean;
}

const formatDate = (dateString: string, formatStr: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    switch (formatStr) {
      case "DD/MM/YYYY":
        return format(date, "dd/MM/yyyy");
      case "MM/DD/YYYY":
        return format(date, "MM/dd/yyyy");
      case "YYYY-MM-DD":
        return format(date, "yyyy-MM-dd");
      case "DD MMM YYYY":
        return format(date, "dd MMM yyyy");
      default:
        return format(date, "dd/MM/yyyy");
    }
  } catch {
    return dateString;
  }
};

const getFontSizeClass = (size: string) => {
  switch (size) {
    case "small":
      return "text-sm";
    case "medium":
      return "text-base";
    case "large":
      return "text-lg";
    default:
      return "text-base";
  }
};

const getHeaderFontSizeClass = (size: string) => {
  switch (size) {
    case "small":
      return "text-xl";
    case "medium":
      return "text-2xl";
    case "large":
      return "text-3xl";
    default:
      return "text-2xl";
  }
};

const getFontSizeValue = (size: string) => {
  switch (size) {
    case "small":
      return "0.875rem";
    case "medium":
      return "1rem";
    case "large":
      return "1.25rem";
    default:
      return "1rem";
  }
};


/* eslint-disable @typescript-eslint/no-explicit-any */
const replaceTextInContent = (content: any, replacements: Record<string, string>) => {
  if (!content) return content;

  // Helper to replace text using proper regex escape if needed, 
  // but here we use the specific known placeholders from the screenshot/requirements.
  const applyReplacements = (str: string) => {
    let newStr = str;
    const gender = replacements.gender || "male";

    const pronouns = {
      subject: gender === "male" ? "He" : gender === "female" ? "She" : "He/She",
      possessive: gender === "male" ? "his" : gender === "female" ? "her" : "his/her",
      possessiveCap: gender === "male" ? "His" : gender === "female" ? "Her" : "His/Her",
      object: gender === "male" ? "him" : gender === "female" ? "her" : "him/her",
    };

    newStr = newStr.replace(/\[Mr\.\/Ms\. Full Name\]/g, replacements.staffName || "__________");
    newStr = newStr.replace(/\[Student Name\]/g, replacements.staffName || "__________");
    newStr = newStr.replace(/\[Subject\/Grade\]/g, replacements.position || "__________");
    newStr = newStr.replace(/\[Position Title\]/g, replacements.position || "__________");
    newStr = newStr.replace(/\[Department\]/g, replacements.department || "__________");
    newStr = newStr.replace(/\[School Name\]/g, replacements.schoolName || "__________");
    newStr = newStr.replace(/\[Start Date\]/g, replacements.startDate || "__________");
    newStr = newStr.replace(/\[End Date\]/g, replacements.endDate || "__________");
    newStr = newStr.replace(/\[Effective Date\]/g, replacements.effectiveDate || "__________");
    newStr = newStr.replace(/\[Salary\]/g, replacements.salary || "__________");
    newStr = newStr.replace(/\[Previous Salary\]/g, replacements.previousSalary || "__________");
    newStr = newStr.replace(/\[New Salary\]/g, replacements.newSalary || "__________");
    newStr = newStr.replace(/\[Increment Amount\]/g, replacements.incrementAmount || "__________");
    newStr = newStr.replace(/\[Increment Percentage\]/g, replacements.incrementPercentage || "__________");
    newStr = newStr.replace(/\[Reporting Manager\]/g, replacements.reportingManager || "__________");

    // As per user request: instead of [Mr./Ms. Last Name], he or she will be added
    newStr = newStr.replace(/\[Mr\.\/Ms\. Last Name\]/g, pronouns.subject);

    // Auto-replace pronoun placeholders
    newStr = newStr.replace(/\[He\/She\]/g, pronouns.subject);
    newStr = newStr.replace(/\[he\/she\]/g, pronouns.subject.toLowerCase());
    newStr = newStr.replace(/\[his\/her\]/g, pronouns.possessive);
    newStr = newStr.replace(/\[His\/Her\]/g, pronouns.possessiveCap);
    newStr = newStr.replace(/\[him\/her\]/g, pronouns.object);

    return newStr;
  };

  if (typeof content === "string") {
    return applyReplacements(content);
  }

  if (typeof content === "object") {
    // Deep clone to avoid mutating original form data
    const newContent = JSON.parse(JSON.stringify(content));

    const traverse = (node: any) => {
      if (node.text && typeof node.text === "string") {
        node.text = applyReplacements(node.text);
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(traverse);
      }
    };

    traverse(newContent);
    return newContent;
  }

  return content;
};

export const CertificatePreview = forwardRef<
  HTMLDivElement,
  CertificatePreviewProps
>(({ data, type, isPrint = false }, ref) => {
  const currentDate = formatDate(new Date().toISOString(), data.dateFormat);

  // Dynamic Google Fonts Loader
  const googleFontUrl = "https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400;1,700&family=Montserrat:ital,wght@0,400;0,700;1,400;1,700&family=Open+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Outfit:wght@400;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400;1,700&family=Roboto:ital,wght@0,400;0,700;1,400;1,700&display=swap";

  const certificateStyles = useMemo(
    () => ({
      fontFamily: data.fontFamily,
      backgroundColor: data.backgroundColor,
      border:
        data.borderStyle !== "none"
          ? `${data.borderWidth}px ${data.borderStyle} ${data.borderColor}`
          : "none",
      padding: `${data.padding}px`,
      color: data.textColor,
      textAlign: data.textAlignment as "left" | "center" | "right" | "justify",
      lineHeight: data.lineSpacing === "normal" ? "1.5" : data.lineSpacing,
      fontSize: getFontSizeValue(data.fontSize),
    }),
    [data]
  );

  const headerStyles = useMemo(
    () => ({
      fontSize: getHeaderFontSizeClass(data.headerFontSize),
      color: data.headerTextColor,
    }),
    [data]
  );

  const renderCertificateContent = () => {
    switch (type) {
      case "experience":
        return renderExperienceCertificate(data as ExperienceCertificateData);
      case "appointment":
        return renderAppointmentLetter(data as AppointmentLetterData);
      case "increment":
        return renderIncrementLetter(data as IncrementLetterData);
      default:
        return null;
    }
  };

  const renderExperienceCertificate = (certData: ExperienceCertificateData) => {
    const duration = certData.duration || "N/A";
    const endDateText = certData.endDate
      ? formatDate(certData.endDate, certData.dateFormat)
      : "Present";
    const startDateText = formatDate(certData.startDate, certData.dateFormat);

    // Prepare replacements map
    const replacements = {
      staffName: certData.staffName,
      position: certData.staffPosition,
      schoolName: certData.schoolName,
      startDate: startDateText !== "N/A" ? startDateText : "__________",
      endDate: endDateText,
      gender: certData.gender,
      lastName: certData.staffName?.split(" ").pop(),
    };

    // Perform replacement on bodyContent
    // We cast to 'any' because strict typing expects a specific Record structure, 
    // but at runtime we might have a string (default value) or a JSON object (editor output).
    const content = replaceTextInContent(certData.bodyContent as any, replacements as any);

    return (
      <div className="space-y-4">
        {content ? (
          typeof content === "string" ? (
            <div
              className="max-w-none"
              style={{ textAlign: data.textAlignment as any }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <RichTextRenderer
              content={content}
              className="max-w-none"
            />
          )
        ) : (
          <div className="space-y-3">
            <p>
              This is to certify that <strong>{certData.staffName}</strong>
              {certData.staffPosition && `, ${certData.staffPosition}`} has
              worked with our institution from <strong>{startDateText}</strong>{" "}
              to <strong>{endDateText}</strong>.
            </p>
            {duration !== "N/A" && (
              <p>
                Total duration of service: <strong>{duration}</strong>
              </p>
            )}
            {certData.achievements && (
              <div className="mt-4">
                <RichTextRenderer content={certData.achievements} />
              </div>
            )}
            {certData.additionalNotes && (
              <p className="mt-4">{certData.additionalNotes}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAppointmentLetter = (certData: AppointmentLetterData) => {
    const startDateText = formatDate(certData.startDate, certData.dateFormat);
    const salaryText = certData.salaryAmount
      ? `${certData.salaryCurrency}${certData.salaryAmount.toLocaleString()}`
      : "As per discussion";

    // Prepare replacements map
    const replacements = {
      staffName: certData.staffName,
      position: certData.positionTitle,
      department: certData.department,
      schoolName: certData.schoolName,
      startDate: startDateText !== "N/A" ? startDateText : "__________",
      salary: salaryText,
      reportingManager: certData.reportingManager,
      gender: certData.gender,
      lastName: certData.staffName?.split(" ").pop(),
    };

    // Perform replacement on bodyContent
    // We cast to 'any' because strict typing expects a specific Record structure, 
    // but at runtime we might have a string (default value) or a JSON object (editor output).
    // Using termsAndConditions as the main body content container for Appointment Letter if available,
    // or we might want to standardize on 'bodyContent' in the schema? 
    // The current schema uses 'termsAndConditions' for Appointment.
    // However, if we want "same logic", we should probably mostly rely on the rich text field.
    const content = replaceTextInContent(certData.termsAndConditions as any, replacements as any);

    return (
      <div className="space-y-4">
        {content ? (
          typeof content === "string" ? (
            <div
              className="max-w-none"
              style={{ textAlign: data.textAlignment as any }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <RichTextRenderer
              content={content}
              className="max-w-none"
            />
          )
        ) : (
          <div className="space-y-3">
            <p>
              We are pleased to offer you the position of{" "}
              <strong>{certData.positionTitle}</strong>
              {certData.department &&
                ` in the ${certData.department} department`}
              .
            </p>
            <p>
              Your appointment will commence on <strong>{startDateText}</strong>
              .
            </p>
            {certData.salaryAmount && (
              <p>
                Your starting salary will be <strong>{salaryText}</strong>.
              </p>
            )}
            {certData.reportingManager && (
              <p>
                You will be reporting to{" "}
                <strong>{certData.reportingManager}</strong>.
              </p>
            )}
            {certData.additionalClauses && (
              <p className="mt-4">{certData.additionalClauses}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderIncrementLetter = (certData: IncrementLetterData) => {
    const effectiveDateText = formatDate(
      certData.effectiveDate,
      certData.dateFormat
    );
    const previousSalaryText = certData.previousSalary
      ? `₹${certData.previousSalary.toLocaleString()}`
      : "N/A";
    const newSalaryText = certData.newSalary
      ? `₹${certData.newSalary.toLocaleString()}`
      : "N/A";
    const incrementAmountText = certData.incrementAmount
      ? `₹${certData.incrementAmount.toLocaleString()}`
      : "N/A";
    const incrementPercentText = certData.incrementPercentage
      ? `${certData.incrementPercentage}%`
      : "N/A";

    const replacements = {
      staffName: certData.staffName,
      schoolName: certData.schoolName,
      effectiveDate: effectiveDateText !== "N/A" ? effectiveDateText : "__________",
      previousSalary: previousSalaryText,
      newSalary: newSalaryText,
      incrementAmount: incrementAmountText,
      incrementPercentage: incrementPercentText,
      gender: certData.gender,
      lastName: certData.staffName?.split(" ").pop(),
    };

    // Using 'reason' as the main body content container for Increment Letter
    const content = replaceTextInContent(certData.reason as any, replacements as any);

    return (
      <div className="space-y-4">
        {content ? (
          typeof content === "string" ? (
            <div
              className="max-w-none"
              style={{ textAlign: data.textAlignment as any }}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          ) : (
            <RichTextRenderer
              content={content}
              className="max-w-none"
            />
          )
        ) : (
          <div className="space-y-3">
            <p>
              We are pleased to inform you that your salary has been revised
              effective from <strong>{effectiveDateText}</strong>.
            </p>
            <div className="mt-4 space-y-2">
              <p>
                Previous Salary: <strong>{previousSalaryText}</strong>
              </p>
              <p>
                New Salary: <strong>{newSalaryText}</strong>
              </p>
              <p>
                Increment Amount: <strong>{incrementAmountText}</strong>
              </p>
              <p>
                Increment Percentage: <strong>{incrementPercentText}</strong>
              </p>
            </div>
            {certData.additionalNotes && (
              <p className="mt-4">{certData.additionalNotes}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      className={`bg-white text-black relative overflow-hidden flex flex-col ${isPrint ? "print:bg-white" : "shadow-lg border rounded-lg"
        }`}
      style={{
        ...certificateStyles,
        minHeight: "296mm", // A4 height approx
        width: "100%",
      }}
    >
      <link href={googleFontUrl} rel="stylesheet" />
      {/* Decorative Side Elements */}
      <div className="absolute top-[15%] left-0 w-3 h-[70%] bg-[#4f46e5] rounded-r-xl opacity-80 print:opacity-100" />
      <div className="absolute top-[25%] right-0 w-3 h-[50%] bg-[#4f46e5] rounded-l-xl opacity-80 print:opacity-100" />

      {/* Centered Watermark behind body content */}
      {data.schoolLogo && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.04]">
          <div className="relative w-[70%] h-[70%] filter grayscale">
            <Image
              src={data.schoolLogo}
              alt="Watermark"
              fill
              className="object-contain"
            />
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col flex-grow p-8 sm:p-10 h-full">
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4 gap-8">
          <div className="flex-1">
            <h1
              className={`font-bold mb-6 tracking-tight ${getHeaderFontSizeClass(
                data.headerFontSize
              )}`}
              style={{ color: data.headerTextColor || "#ea580c" }} // Default to orange-600 if not set, or fallback to user
            >
              {data.certificateTitle}
            </h1>

            <div className="space-y-1.5 text-sm text-gray-600">
              <p className="font-semibold text-gray-900">{data.schoolName}</p>
              <p className="whitespace-pre-wrap">{data.schoolAddress}</p>
              <p className="font-medium text-gray-900 pt-1">{currentDate}</p>
            </div>
          </div>

          <div className="flex flex-col items-center shrink-0 w-32">
            {data.schoolLogo && (
              <div className="relative w-24 h-24 mb-2">
                <Image
                  src={data.schoolLogo}
                  alt="School Logo"
                  fill
                  className="object-contain"
                />
              </div>
            )}

          </div>
        </div>

        {/* Body Section */}
        <div className="flex-grow">
          <p className="font-bold text-gray-800 mb-2 text-sm">
            To Whom It May Concern:
          </p>
          <div className="leading-relaxed">
            {renderCertificateContent()}
          </div>
        </div>

        {/* Footer Section */}
        <div>
          <p className="font-bold text-gray-800 mb-2 text-sm">
            Best regards,
          </p>
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              {/* Signature Space */}
              <div className="h-16 min-w-[150px] relative mb-1">
                {data.signatureImage ? (
                  <Image
                    src={data.signatureImage}
                    alt="Signature"
                    fill
                    className="object-contain object-left-bottom"
                  />
                ) : (
                  // Placeholder space as requested
                  <div className="w-full h-full" />
                )}
              </div>

              <div>
                <p
                  className="text-xl text-blue-600 font-medium italic"
                  style={{ fontFamily: "cursive" }}
                >
                  {data.signatoryName || "Signatory Name"}
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  {data.signatoryTitle || "Human Resources Department"}
                </p>
                <p className="text-xs text-gray-500">{data.schoolName}</p>
              </div>
            </div>

            {data.footerText && (
              <div className="mt-8 pt-4 border-t border-gray-100 italic text-gray-500 text-[10px] text-center">
                {data.footerText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CertificatePreview.displayName = "CertificatePreview";
