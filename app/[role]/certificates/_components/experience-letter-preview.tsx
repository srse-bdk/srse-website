"use client";

import { forwardRef } from "react";
import { SchoolLetterhead, SignatoryBlock } from "./school-letterhead";
import type { OfficialExperienceLetterData } from "./letter-types";
import { formatLetterDate } from "./letter-utils";
import { schoolLetterheadDefaults } from "@/lib/config/school-letterhead";

interface ExperienceLetterPreviewProps {
  data: OfficialExperienceLetterData;
  isPrint?: boolean;
}

export const ExperienceLetterPreview = forwardRef<
  HTMLDivElement,
  ExperienceLetterPreviewProps
>(({ data, isPrint = false }, ref) => {
  const startDate = formatLetterDate(data.startDate, "dd/MM/yyyy");
  const endDate = data.endDate
    ? formatLetterDate(data.endDate, "dd/MM/yyyy")
    : "till date";

  const pronoun =
    data.gender === "male" ? "He" : data.gender === "female" ? "She" : "He/She";
  const possessive =
    data.gender === "male"
      ? "his"
      : data.gender === "female"
        ? "her"
        : "his/her";

  return (
    <SchoolLetterhead
      ref={ref}
      schoolLogo={data.schoolLogo}
      isPrint={isPrint}
      skipLetterhead={data.skipLetterhead}
    >
      <div className="space-y-4">
        <p
          className={`text-center font-bold underline${
            data.skipLetterhead ? " mt-[3em] mb-[3em]" : ""
          }`}
        >
          To Whom It May Concern
        </p>

        <p>
          This is to certify that <strong>{data.personName}</strong> was employed
          at {schoolLetterheadDefaults.schoolName} as{" "}
          <strong>{data.designation}</strong> from <strong>{startDate}</strong> to{" "}
          <strong>{endDate}</strong>. {pronoun} discharged {possessive} duties with sincerity, dedication, and
          professionalism during the period of service.
        </p>

        {data.additionalParagraph ? (
          <p>{data.additionalParagraph}</p>
        ) : (
          <p>
            We found {pronoun.toLowerCase()} conduct and performance satisfactory.
            We wish {pronoun.toLowerCase()} success in all future endeavours.
          </p>
        )}

        <SignatoryBlock
          signatoryName={data.signatoryName}
          signatoryTitle={data.signatoryTitle}
        />
      </div>
    </SchoolLetterhead>
  );
});

ExperienceLetterPreview.displayName = "ExperienceLetterPreview";
