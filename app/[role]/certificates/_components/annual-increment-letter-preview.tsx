"use client";

import { forwardRef } from "react";
import { SchoolLetterhead, SignatoryBlock } from "./school-letterhead";
import type { AnnualIncrementLetterData } from "./letter-types";
import {
  formatLetterDate,
  formatSalaryInr,
  getDearName,
} from "./letter-utils";
import { schoolLetterheadDefaults } from "@/lib/config/school-letterhead";

interface AnnualIncrementLetterPreviewProps {
  data: AnnualIncrementLetterData;
  isPrint?: boolean;
}

export const AnnualIncrementLetterPreview = forwardRef<
  HTMLDivElement,
  AnnualIncrementLetterPreviewProps
>(({ data, isPrint = false }, ref) => {
  const letterDate = formatLetterDate(data.letterDate);
  const effectiveDate = formatLetterDate(data.effectiveDate, "d-MMM-yyyy");

  return (
    <SchoolLetterhead
      ref={ref}
      schoolLogo={data.schoolLogo}
      isPrint={isPrint}
    >
      <div className={isPrint ? "space-y-2.5" : "space-y-4"}>
        <p>{letterDate}</p>

        <div className="space-y-0.5">
          <p>Emp ID - {data.employeeId}</p>
          <p>{data.employeeName}</p>
          {data.location ? <p>{data.location}</p> : null}
        </div>

        <p className="font-bold underline">Sub: Annual Increment Letter</p>

        <p>{getDearName(data.employeeName, data.gender)},</p>

        <p>
          We are pleased to inform you that, following your performance review,
          your salary has been adjusted as part of our annual increment process.
        </p>

        <ul className="list-disc space-y-2 pl-6">
          <li>
            You will receive a monthly consolidated salary of{" "}
            <strong>{formatSalaryInr(data.revisedSalary)}</strong> effective from{" "}
            <strong>{effectiveDate || "________"}</strong>.
          </li>
          {data.includeRetentionBonus && data.retentionBonusAmount ? (
            <li>
              Furthermore, you are eligible for an annual retention bonus of{" "}
              <strong>{formatSalaryInr(data.retentionBonusAmount)}</strong>
              {data.retentionBonusPayoutNote
                ? ` (${data.retentionBonusPayoutNote})`
                : null}
              .
            </li>
          ) : null}
        </ul>

        <p>
          We request you to treat your remuneration details as{" "}
          <strong>confidential</strong> and not discuss them with colleagues or
          external parties.
        </p>

        <p>
          The terms &amp; conditions of your engagement have changed as outlined
          below.
        </p>

        <p>
          We value your association with {schoolLetterheadDefaults.schoolName}{" "}
          and look forward to your continued contributions during the upcoming
          academic year.
        </p>

        <SignatoryBlock
          signatoryName={data.signatoryName}
          signatoryTitle={data.signatoryTitle}
          compact={isPrint}
        />
      </div>
    </SchoolLetterhead>
  );
});

AnnualIncrementLetterPreview.displayName = "AnnualIncrementLetterPreview";
