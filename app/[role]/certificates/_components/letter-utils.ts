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

export function formatSalaryInr(amount: number): string {
  return `INR ${amount.toLocaleString("en-IN")}`;
}

export function getDearName(name: string, gender: "male" | "female" | "other") {
  const first = name.trim().split(/\s+/)[0] || name;
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
