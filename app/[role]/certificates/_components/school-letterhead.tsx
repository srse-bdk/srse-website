"use client";

import { forwardRef } from "react";
import Image from "next/image";
import { schoolLetterheadDefaults } from "@/lib/config/school-letterhead";

interface SchoolLetterheadProps {
  children: React.ReactNode;
  schoolLogo?: string;
  isPrint?: boolean;
  className?: string;
}

export const SchoolLetterhead = forwardRef<HTMLDivElement, SchoolLetterheadProps>(
  ({ children, schoolLogo, isPrint = false, className = "" }, ref) => {
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
          minHeight: isPrint ? "297mm" : "297mm",
          maxHeight: isPrint ? "297mm" : undefined,
          overflow: isPrint ? "hidden" : undefined,
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: isPrint ? "10.5pt" : "11pt",
          lineHeight: isPrint ? 1.35 : 1.45,
          boxSizing: "border-box",
        }}
      >
        {logo ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.06]"
            aria-hidden
          >
            <div className="relative h-[60%] w-[60%]">
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
          className={`letter-print-inner relative z-10 flex flex-col ${
            isPrint
              ? "h-full px-[12mm] pb-[8mm] pt-[10mm]"
              : "min-h-[297mm] px-10 py-8 sm:px-12 sm:py-10"
          }`}
        >
          <header className={`shrink-0 text-center ${isPrint ? "mb-3" : ""}`}>
            <h1
              className={`font-bold tracking-wide text-[#1a4a8a] ${
                isPrint ? "text-[20pt]" : "text-[22pt]"
              }`}
              style={{ fontFamily: "'Times New Roman', Times, serif" }}
            >
              {schoolLetterheadDefaults.schoolName}
            </h1>
            <p
              className={`italic text-gray-700 ${
                isPrint ? "mt-0.5 text-[9pt]" : "mt-1 text-[10pt]"
              }`}
            >
              {schoolLetterheadDefaults.schoolTagline}
            </p>
            <div className="mx-auto mt-2 h-[2px] w-full max-w-4xl bg-[#c45c26]" />
          </header>

          <main
            className={`letter-print-main text-justify text-gray-900 ${
              isPrint
                ? "mt-3 flex-1 text-[10.5pt] leading-snug"
                : "mt-6 flex-grow text-[11pt]"
            }`}
          >
            {children}
          </main>

          <footer
            className={`letter-print-footer border-t border-[#c45c26] text-center text-gray-700 ${
              isPrint
                ? "mt-auto shrink-0 pt-2 text-[8pt] leading-tight"
                : "mt-8 pt-3 text-[9pt] leading-relaxed"
            }`}
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
  compact?: boolean;
}

export function SignatoryBlock({
  signatoryName,
  signatoryTitle,
  compact = false,
}: SignatoryBlockProps) {
  return (
    <div
      className={`space-y-0.5 not-italic ${
        compact ? "mt-4" : "mt-8 space-y-1"
      }`}
    >
      <p>Yours sincerely,</p>
      <p className={compact ? "mt-3 font-semibold" : "mt-6 font-semibold"}>
        {signatoryName}
      </p>
      <p>{signatoryTitle}</p>
    </div>
  );
}
