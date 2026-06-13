"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import { IdCardPrincipalSignature } from "@/components/id-cards/id-card-shared";
import { IdCardQrCode } from "@/components/id-cards/id-card-qr";
import {
  idCardBranding,
  ID_CARD_PORTRAIT_BODY_HEIGHT_MM,
  ID_CARD_PORTRAIT_COL_GAP_MM,
  ID_CARD_PORTRAIT_FOOTER_HEIGHT_MM,
  ID_CARD_PORTRAIT_HEADER_HEIGHT_MM,
  ID_CARD_PORTRAIT_LOGO_SIZE_MM,
  ID_CARD_PORTRAIT_PHOTO_SIZE_MM,
  ID_CARD_PORTRAIT_QR_SIZE_MM,
  ID_CARD_PORTRAIT_ROW_INFO_MM,
  ID_CARD_PORTRAIT_ROW_PHOTO_MM,
  ID_CARD_PORTRAIT_ROW_TOP_MM,
} from "@/lib/config/id-card";
import type { IdCardTheme } from "@/lib/config/id-card-themes";
import { cn } from "@/lib/utils";

function PortraitHeaderPattern({
  theme,
  gradientId,
}: {
  theme: IdCardTheme;
  gradientId: string;
}) {
  const [c1, c2, c3] = theme.headerGradient;
  const [t1, t2, t3, t4] = theme.headerTriangles;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 48"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="45%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
      </defs>
      <rect width="100" height="48" fill={`url(#${gradientId})`} />
      <polygon points="0,0 30,0 12,24 0,18" fill={t1} opacity="0.55" />
      <polygon points="30,0 62,0 48,28 26,22" fill={t2} opacity="0.45" />
      <polygon points="62,0 100,0 100,20 78,24" fill={t3} opacity="0.5" />
      <polygon points="0,18 12,24 28,48 0,48" fill={t2} opacity="0.35" />
      <polygon points="26,22 48,28 62,48 42,46" fill={t3} opacity="0.3" />
      <polygon points="78,24 100,20 100,48 70,48" fill={t4} opacity="0.4" />
    </svg>
  );
}

export function IdCardPortraitHeader({ theme }: { theme: IdCardTheme }) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ height: `${ID_CARD_PORTRAIT_HEADER_HEIGHT_MM}mm` }}
    >
      <PortraitHeaderPattern theme={theme} gradientId={gradientId} />
      <div className="relative z-10 flex h-full flex-col justify-center px-[2mm] py-[0.4mm] leading-none">
        <p
          className="line-clamp-1 w-full text-center font-extrabold"
          style={{
            color: theme.schoolNameColor,
            fontSize: "2.5mm",
          }}
        >
          {idCardBranding.schoolName}
        </p>
        <p
          className="mt-[0.3mm] line-clamp-2 w-full text-center font-semibold leading-tight"
          style={{
            color: theme.schoolNameColor,
            opacity: 0.95,
            fontSize: "1.6mm",
          }}
        >
          {idCardBranding.schoolAddress}
        </p>
      </div>
    </div>
  );
}

function IdCardPortraitSchoolLogo({ theme }: { theme: IdCardTheme }) {
  const size = ID_CARD_PORTRAIT_LOGO_SIZE_MM;

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-sm bg-white p-[0.3mm]"
      style={{
        width: `${size}mm`,
        height: `${size}mm`,
        border: `1px solid ${theme.photoRing}`,
      }}
    >
      <img
        src={idCardBranding.schoolLogo}
        alt=""
        className="h-full w-full object-contain"
      />
    </div>
  );
}

interface IdCardPortraitBodySectionProps {
  theme: IdCardTheme;
  cardTitle: "Student ID Card" | "Staff ID Card";
  academicYear: string;
  photo: ReactNode;
  details: ReactNode;
  scanId: string;
  principalSignatureUrl?: string;
}

/**
 * Row 1: logo+ESTD (left) | card+session (right)
 * Row 2: photo (full width)
 * Row 3: details (left) | signature (center, bottom) | QR (right)
 */
export function IdCardPortraitBodySection({
  theme,
  cardTitle,
  academicYear,
  photo,
  details,
  scanId,
  principalSignatureUrl,
}: IdCardPortraitBodySectionProps) {
  const rowTop = ID_CARD_PORTRAIT_ROW_TOP_MM;
  const rowPhoto = ID_CARD_PORTRAIT_ROW_PHOTO_MM;
  const rowInfo = ID_CARD_PORTRAIT_ROW_INFO_MM;

  return (
    <div
      className="grid shrink-0 overflow-hidden"
      style={{
        height: `${ID_CARD_PORTRAIT_BODY_HEIGHT_MM}mm`,
        padding: "1mm 2mm",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: `${rowTop}mm ${rowPhoto}mm ${rowInfo}mm`,
        columnGap: `${ID_CARD_PORTRAIT_COL_GAP_MM}mm`,
        rowGap: "0.5mm",
      }}
    >
      {/* Row 1 — left: logo + ESTD */}
      <div className="flex min-w-0 items-center gap-[1mm] overflow-hidden">
        <IdCardPortraitSchoolLogo theme={theme} />
        <p
          className="min-w-0 font-bold leading-none"
          style={{ color: theme.labelColor, fontSize: "1.55mm" }}
        >
          {idCardBranding.schoolEstablished}
        </p>
      </div>

      {/* Row 1 — right: card type + session */}
      <div className="flex min-w-0 flex-col items-end justify-start overflow-hidden text-right">
        <p
          className="font-extrabold leading-none"
          style={{ color: theme.labelColor, fontSize: "1.75mm" }}
        >
          {cardTitle}
        </p>
        <p
          className="mt-[0.4mm] rounded-sm px-[0.8mm] py-[0.25mm] font-bold leading-none"
          style={{
            color: theme.sessionBadge.text,
            backgroundColor: theme.sessionBadge.bg,
            fontSize: "1.55mm",
          }}
        >
          Session {academicYear}
        </p>
      </div>

      {/* Row 2 — photo spans both columns */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{ gridColumn: "1 / -1" }}
      >
        {photo}
      </div>

      {/* Row 3 — details | signature | QR in one row */}
      <div
        className="grid min-h-0 overflow-hidden"
        style={{
          gridColumn: "1 / -1",
          height: `${rowInfo}mm`,
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          columnGap: `${ID_CARD_PORTRAIT_COL_GAP_MM}mm`,
        }}
      >
        <div className="flex min-w-0 flex-col items-start overflow-hidden">
          {details}
        </div>

        <div className="flex min-h-0 flex-col items-center justify-end self-stretch overflow-hidden">
          <IdCardPrincipalSignature
            theme={theme}
            principalSignatureUrl={principalSignatureUrl}
            compact
            align="center"
            className="shrink-0"
          />
        </div>

        <div className="flex items-start justify-end overflow-hidden">
          <IdCardQrCode value={scanId} sizeMm={ID_CARD_PORTRAIT_QR_SIZE_MM} />
        </div>
      </div>
    </div>
  );
}

export function IdCardPortraitSquarePhoto({
  theme,
  src,
  alt,
  initials,
  className,
}: {
  theme: IdCardTheme;
  src?: string;
  alt: string;
  initials: string;
  className?: string;
}) {
  const size = ID_CARD_PORTRAIT_PHOTO_SIZE_MM;

  return (
    <div
      className={cn("shrink-0", className)}
      style={{ width: `${size}mm`, height: `${size}mm` }}
    >
      <div
        className="h-full w-full overflow-hidden rounded-sm border-2 bg-white"
        style={{ borderColor: theme.photoRing }}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            crossOrigin="anonymous"
            className="h-full w-full object-cover object-[center_15%]"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-bold"
            style={{
              color: theme.labelColor,
              background: `linear-gradient(135deg, ${theme.photoFallbackFrom}, ${theme.photoFallbackTo})`,
              fontSize: "4mm",
            }}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

export function IdCardPortraitFooterStrip({
  theme,
  className,
}: {
  theme: IdCardTheme;
  className?: string;
}) {
  const gradientId = useId().replace(/:/g, "");
  const [c1, c2, c3] = theme.footerGradient;
  const [t1, t2, t3, t4] = theme.headerTriangles;

  return (
    <div
      className={cn("w-full shrink-0 overflow-hidden", className)}
      style={{ height: `${ID_CARD_PORTRAIT_FOOTER_HEIGHT_MM}mm` }}
    >
      <svg
        className="h-full w-full"
        viewBox="0 0 100 14"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="50%" stopColor={c2} />
            <stop offset="100%" stopColor={c3} />
          </linearGradient>
        </defs>
        <rect width="100" height="14" fill={`url(#${gradientId})`} />
        <polygon points="0,0 12,0 6,14 0,14" fill={t1} opacity="0.45" />
        <polygon points="12,0 28,0 22,14 18,14" fill={t2} opacity="0.4" />
        <polygon points="28,0 45,0 38,14 35,14" fill={t3} opacity="0.35" />
        <polygon points="45,0 62,0 55,14 52,14" fill={t4} opacity="0.4" />
        <polygon points="62,0 78,0 72,14 68,14" fill={t1} opacity="0.35" />
        <polygon points="78,0 100,0 100,14 92,14" fill={t2} opacity="0.45" />
      </svg>
    </div>
  );
}
