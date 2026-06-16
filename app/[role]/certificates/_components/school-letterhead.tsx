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
        className={`letter-print-page relative bg-white text-black flex flex-col ${
          isPrint ? "" : "shadow-lg border rounded-lg"
        } ${className}`}
        style={{
          width: "100%",
          minHeight: "297mm",
          fontFamily: "'Times New Roman', Times, serif",
          fontSize: "11pt",
          lineHeight: 1.45,
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

        <div className="relative z-10 flex min-h-[297mm] flex-col px-10 py-8 sm:px-12 sm:py-10">
          <header className="text-center">
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

          <main className="mt-6 flex-grow text-justify text-[11pt] text-gray-900">
            {children}
          </main>

          <footer className="mt-8 border-t border-[#c45c26] pt-3 text-center text-[9pt] leading-relaxed text-gray-700">
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
    <div className="mt-8 space-y-1 not-italic">
      <p>Yours sincerely,</p>
      <p className="mt-6 font-semibold">{signatoryName}</p>
      <p>{signatoryTitle}</p>
    </div>
  );
}
