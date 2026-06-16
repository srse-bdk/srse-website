"use client";

import { forwardRef } from "react";
import { SchoolLetterhead, SignatoryBlock } from "./school-letterhead";
import type { OfficialAppointmentLetterData } from "./letter-types";
import {
  formatLetterDate,
  formatSalaryInr,
  getDearName,
} from "./letter-utils";
import { schoolLetterheadDefaults } from "@/lib/config/school-letterhead";

interface AppointmentLetterPreviewProps {
  data: OfficialAppointmentLetterData;
  isPrint?: boolean;
}

export const AppointmentLetterPreview = forwardRef<
  HTMLDivElement,
  AppointmentLetterPreviewProps
>(({ data, isPrint = false }, ref) => {
  const letterDate = formatLetterDate(data.letterDate);
  const startDate = formatLetterDate(data.startDate, "d-MMM-yyyy");

  return (
    <SchoolLetterhead
      ref={ref}
      schoolLogo={data.schoolLogo}
      isPrint={isPrint}
    >
      <div className="space-y-4">
        <p>{letterDate}</p>

        <div className="space-y-0.5">
          {data.employeeId ? <p>Emp ID - {data.employeeId}</p> : null}
          <p>{data.employeeName}</p>
          {data.location ? <p>{data.location}</p> : null}
        </div>

        <p className="font-bold underline">Sub: Appointment Letter</p>

        <p>{getDearName(data.employeeName, data.gender)},</p>

        <p>
          We are pleased to offer you the position of{" "}
          <strong>{data.positionTitle}</strong> at{" "}
          {schoolLetterheadDefaults.schoolName}. You will report to{" "}
          <strong>{data.reportingTo}</strong>.
        </p>

        <ul className="list-disc space-y-2 pl-6">
          <li>
            Your appointment will commence on <strong>{startDate}</strong>.
          </li>
          {data.monthlySalary ? (
            <li>
              Your monthly consolidated salary will be{" "}
              <strong>{formatSalaryInr(data.monthlySalary)}</strong>.
            </li>
          ) : null}
          {data.probationMonths > 0 ? (
            <li>
              You will be on probation for <strong>{data.probationMonths}</strong>{" "}
              months from the date of joining. Confirmation will be subject to
              satisfactory performance.
            </li>
          ) : null}
        </ul>

        <p>
          Please sign and return the enclosed terms &amp; conditions to confirm
          your acceptance. We look forward to a fruitful association with you.
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

AppointmentLetterPreview.displayName = "AppointmentLetterPreview";
