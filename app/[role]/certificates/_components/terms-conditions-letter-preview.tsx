"use client";

import { forwardRef } from "react";
import { SchoolLetterhead } from "./school-letterhead";
import type { TermsConditionsLetterData } from "./letter-types";
import { defaultTermsConditionsBullets } from "@/lib/config/school-letterhead";
import { formatLetterDate } from "./letter-utils";

interface TermsConditionsLetterPreviewProps {
  data: TermsConditionsLetterData;
  isPrint?: boolean;
}

export const TermsConditionsLetterPreview = forwardRef<
  HTMLDivElement,
  TermsConditionsLetterPreviewProps
>(({ data, isPrint = false }, ref) => {
  const acknowledgmentDate = data.acknowledgmentDate
    ? formatLetterDate(data.acknowledgmentDate, "dd/MM/yyyy")
    : "";

  const bullets = [
    defaultTermsConditionsBullets[0].body(
      data.jobTitle,
      data.reportingTo,
    ),
    defaultTermsConditionsBullets[1].body(),
    defaultTermsConditionsBullets[2].body(),
    defaultTermsConditionsBullets[3].body(data.noticePeriodMonths),
  ];

  return (
    <SchoolLetterhead
      ref={ref}
      schoolLogo={data.schoolLogo}
      isPrint={isPrint}
    >
      <div className={isPrint ? "space-y-3" : "space-y-5"}>
        <p className="font-bold">Terms &amp; Conditions:</p>

        <ul
          className={`list-disc pl-6 ${
            isPrint ? "space-y-2 text-[10.5pt]" : "space-y-4"
          }`}
        >
          {defaultTermsConditionsBullets.map((item, index) => (
            <li key={item.title}>
              <strong>{item.title}:</strong> {bullets[index]}
            </li>
          ))}
        </ul>

        <p className={isPrint ? "pt-1" : "pt-2"}>
          By continuing your employment, you acknowledge that you have read,
          understood, and agree to these terms.
        </p>

        <div className={isPrint ? "mt-4 space-y-5" : "mt-10 space-y-8"}>
          <div>
            <p
              className={`border-b border-dotted border-gray-500 pb-1 ${
                isPrint ? "mb-4" : "mb-8"
              }`}
            >
              {data.employeeName || "\u00A0"}
            </p>
            <p className="text-[10pt] text-gray-600">Name</p>
            <p className="mt-1 text-[9pt] italic text-gray-500">
              (Sign above and return this to Principal)
            </p>
          </div>

          <div>
            <p className="mb-2 border-b border-dotted border-gray-500 pb-1 min-h-[1.5rem]">
              {acknowledgmentDate || "\u00A0"}
            </p>
            <p className="text-[10pt] text-gray-600">Date</p>
          </div>
        </div>
      </div>
    </SchoolLetterhead>
  );
});

TermsConditionsLetterPreview.displayName = "TermsConditionsLetterPreview";
