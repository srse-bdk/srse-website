import { format, parseISO, isValid } from "date-fns";

export function formatLetterDate(
  dateString: string,
  pattern: string = "d MMMM yyyy",
): string {
  if (!dateString) return "";
  try {
    const date = dateString.includes("T")
      ? parseISO(dateString)
      : new Date(dateString);
    if (!isValid(date)) return dateString;
    return format(date, pattern);
  } catch {
    return dateString;
  }
}

export function formatSalaryInr(amount?: number | null): string {
  if (amount == null || Number.isNaN(amount)) {
    return "INR ________";
  }
  return `INR ${amount.toLocaleString("en-IN")}`;
}

export function getDearName(
  name: string | undefined,
  gender: "male" | "female" | "other",
) {
  const trimmed = name?.trim();
  if (!trimmed) return "Dear ________";
  const first = trimmed.split(/\s+/)[0] || trimmed;
  if (gender === "male") return `Dear Mr. ${first}`;
  if (gender === "female") return `Dear ${first}`;
  return `Dear ${first}`;
}

/** A4 print: no @page margin — padding lives inside each letter sheet. */
export const letterPrintPageStyle = `
  @page {
    margin: 0;
    size: A4 portrait;
  }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .letter-print-page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
      page-break-inside: avoid;
      break-inside: avoid;
      box-sizing: border-box;
    }
    .letter-print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .letter-print-inner {
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      padding: 10mm 12mm 8mm;
      box-sizing: border-box;
    }
    .letter-print-main {
      flex: 1 1 auto;
      min-height: 0;
    }
    .letter-print-footer {
      flex-shrink: 0;
      margin-top: auto;
    }
    .print-root {
      margin: 0 !important;
      padding: 0 !important;
    }
    .print-root > * {
      margin: 0 !important;
    }
  }
`;
