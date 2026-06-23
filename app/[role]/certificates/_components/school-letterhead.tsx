"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { schoolLetterheadDefaults } from "@/lib/config/school-letterhead";

interface SchoolLetterheadProps {
  children: React.ReactNode;
  schoolLogo?: string;
  isPrint?: boolean;
  skipLetterhead?: boolean;
  className?: string;
}

export const SchoolLetterhead = forwardRef<HTMLDivElement, SchoolLetterheadProps>(
  (
    {
      children,
      schoolLogo,
      isPrint = false,
      skipLetterhead = false,
      className = "",
    },
    ref,
  ) => {
    const logo = schoolLogo || schoolLetterheadDefaults.schoolLogo;

    return (
      <div
        ref={ref}
        className={`letter-print-page relative flex flex-col bg-white text-black ${
          isPrint ? "letter-print-sheet" : "shadow-lg border rounded-lg"
        } ${className}`}
        style={{
          width: isPrint ? "210mm" : "100%",
          height: isPrint ? "297mm" : undefined,
          minHeight: "297mm",
          maxHeight: isPrint ? "297mm" : undefined,
          overflow: isPrint ? "hidden" : undefined,
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "11pt",
          lineHeight: 1.45,
          boxSizing: "border-box",
        }}
      >
        {logo ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]"
            aria-hidden
          >
            <div className="relative h-[65%] w-[65%]">
              <Image
                src={logo}
                alt=""
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
        ) : null}

        <div
          className={`letter-print-inner relative z-10 flex flex-1 flex-col ${
            isPrint
              ? "h-full min-h-0 px-[12mm] pb-[10mm] pt-[12mm]"
              : "min-h-[297mm] px-10 py-8 sm:px-12 sm:py-10"
          }`}
        >
          <header
            className={`shrink-0 text-center ${skipLetterhead ? "invisible" : ""}`}
            aria-hidden={skipLetterhead}
          >
            <h1
              className="text-[22pt] font-bold tracking-wide text-[#1a4a8a]"
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {schoolLetterheadDefaults.schoolName}
            </h1>
            <p className="mt-1 text-[10pt] italic text-gray-700">
              {schoolLetterheadDefaults.schoolTagline}
            </p>
            <div className="mx-auto mt-3 h-[2px] w-full max-w-4xl bg-[#c45c26]" />
          </header>

          <main className="letter-print-main my-4 shrink-0 text-justify text-[11pt] text-gray-900">
            {children}
          </main>

          <footer
            className={`letter-print-footer mt-auto shrink-0 border-t border-[#c45c26] pt-3 text-center text-[9pt] leading-relaxed text-gray-700 ${
              skipLetterhead ? "invisible" : ""
            }`}
            aria-hidden={skipLetterhead}
          >
            <p>
              <strong>Address:</strong> {schoolLetterheadDefaults.schoolAddress}
            </p>
            <p>
              <strong>Email:</strong> {schoolLetterheadDefaults.schoolEmail}
              {" · "}
              <strong>Website:</strong> {schoolLetterheadDefaults.schoolWebsite}
            </p>
          </footer>
        </div>
      </div>
    );
  },
);

SchoolLetterhead.displayName = "SchoolLetterhead";

interface SignatoryBlockProps {
  signatoryName: string;
  signatoryTitle: string;
}

export function SignatoryBlock({
  signatoryName,
  signatoryTitle,
}: SignatoryBlockProps) {
  return (
    <div className="letter-signature-block mt-8 space-y-1 not-italic">
      <p>Yours sincerely,</p>
      <p className="mt-6 font-semibold">{signatoryName}</p>
      <p>{signatoryTitle}</p>
    </div>
  );
}
