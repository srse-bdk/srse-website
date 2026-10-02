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
  subjectLine?: string;
}

const DEFAULT_SUBJECT = "Annual Increment Letter";
export const COMPENSATION_PACKAGE_SUBJECT = DEFAULT_SUBJECT;

export const AnnualIncrementLetterPreview = forwardRef<
  HTMLDivElement,
  AnnualIncrementLetterPreviewProps
>(({ data, isPrint = false, subjectLine = DEFAULT_SUBJECT }, ref) => {
  const letterDate = formatLetterDate(data.letterDate);
  const effectiveDate = formatLetterDate(data.effectiveDate, "d-MMM-yyyy");

  return (
    <SchoolLetterhead
      ref={ref}
      schoolLogo={data.schoolLogo}
      isPrint={isPrint}
    >
      <div className="letter-body-content space-y-4">
        <p>{letterDate}</p>

        <div className="space-y-0.5">
          <p>Emp ID - {data.employeeId}</p>
          <p>{data.employeeName}</p>
          {data.location ? <p>{data.location}</p> : null}
        </div>

        <p className="font-bold underline">Sub: {subjectLine}</p>

        <p>{getDearName(data.employeeName, data.gender)},</p>

        <p>
          We are pleased to inform you that, following your performance review,
          your salary has been adjusted as part of our annual increment process.
        </p>

        <p>
          You will receive a monthly consolidated salary of{" "}
          {formatSalaryInr(data.revisedSalary)} effective from{" "}
          {effectiveDate || "________"}.
        </p>

        {data.includeRetentionBonus && data.retentionBonusAmount ? (
          <p>
            Furthermore, you are eligible for an annual retention bonus of{" "}
            {formatSalaryInr(data.retentionBonusAmount)}
            {data.retentionBonusPayoutNote
              ? ` (${data.retentionBonusPayoutNote})`
              : null}
            . This retention amount shall be applicable only after completion
            of the period mentioned herein.
          </p>
        ) : null}

        <p>
          We request you to treat your remuneration details as confidential and
          not discuss them with colleagues or external parties.
        </p>

        <p>
          All other terms and conditions of your engagement remain unchanged.
        </p>

        <p>
          We value your association with {schoolLetterheadDefaults.schoolName}{" "}
          and look forward to your continued contributions during the upcoming
          academic year.
        </p>

        <SignatoryBlock
          signatoryName={data.signatoryName}
          signatoryTitle={data.signatoryTitle}
        />
      </div>
    </SchoolLetterhead>
  );
});

AnnualIncrementLetterPreview.displayName = "AnnualIncrementLetterPreview";
