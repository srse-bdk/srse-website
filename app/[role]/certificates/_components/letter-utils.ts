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

export const letterPrintPageStyle = `
  @page {
    margin: 12mm;
    size: A4;
  }
  @media print {
    body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .letter-print-page {
      page-break-after: always;
      break-after: page;
    }
    .letter-print-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
  }
`;
