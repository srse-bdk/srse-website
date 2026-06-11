"use client";

import type { ReactNode } from "react";
import { useId } from "react";
import {
  IdCardPrincipalSignature,
  formatNameForIdCard,
  getIdCardNameStyle,
} from "@/components/id-cards/id-card-shared";
import { IdCardQrCode } from "@/components/id-cards/id-card-qr";
import {
  idCardBranding,
  ID_CARD_BODY_HEIGHT_MM,
  ID_CARD_FOOTER_HEIGHT_MM,
  ID_CARD_HEADER_HEIGHT_MM,
  ID_CARD_PHOTO_SIZE_MM,
  ID_CARD_RIGHT_COL_WIDTH_MM,
} from "@/lib/config/id-card";
import type { IdCardTheme } from "@/lib/config/id-card-themes";
import { cn } from "@/lib/utils";

interface HeaderGeometricPatternProps {
  theme: IdCardTheme;
  gradientId: string;
}

function HeaderGeometricPattern({
  theme,
  gradientId,
}: HeaderGeometricPatternProps) {
  const [c1, c2, c3] = theme.headerGradient;
  const [t1, t2, t3, t4] = theme.headerTriangles;

  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 340 100"
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
      <rect width="340" height="100" fill={`url(#${gradientId})`} />
      <polygon points="0,0 55,0 20,50 0,38" fill={t1} opacity="0.55" />
      <polygon points="55,0 120,0 85,55 35,45" fill={t2} opacity="0.45" />
      <polygon points="120,0 190,0 150,60 90,52" fill={t3} opacity="0.5" />
      <polygon points="190,0 260,0 220,48 165,42" fill={t4} opacity="0.4" />
      <polygon points="260,0 340,0 340,32 295,52 240,38" fill={t1} opacity="0.45" />
      <polygon points="0,38 20,50 45,100 0,100" fill={t2} opacity="0.35" />
      <polygon points="35,45 85,55 110,100 60,95" fill={t3} opacity="0.3" />
      <polygon points="90,52 150,60 175,100 125,98" fill={t4} opacity="0.35" />
      <polygon points="165,42 220,48 250,100 200,98" fill={t1} opacity="0.3" />
      <polygon points="240,38 295,52 340,70 340,100 280,100" fill={t2} opacity="0.4" />
    </svg>
  );
}

function FooterGeometricPattern({
  theme,
  gradientId,
}: {
  theme: IdCardTheme;
  gradientId: string;
}) {
  const [c1, c2, c3] = theme.footerGradient;
  const [t1, t2, t3, t4] = theme.headerTriangles;

  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 340 14"
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
      <rect width="340" height="14" fill={`url(#${gradientId})`} />
      <polygon points="0,0 28,0 12,14 0,14" fill={t1} opacity="0.45" />
      <polygon points="28,0 65,0 48,14 18,14" fill={t2} opacity="0.4" />
      <polygon points="65,0 105,0 88,14 55,14" fill={t3} opacity="0.35" />
      <polygon points="105,0 150,0 132,14 98,14" fill={t4} opacity="0.4" />
      <polygon points="150,0 195,0 178,14 142,14" fill={t1} opacity="0.35" />
      <polygon points="195,0 240,0 222,14 188,14" fill={t2} opacity="0.4" />
      <polygon points="240,0 285,0 268,14 232,14" fill={t3} opacity="0.45" />
      <polygon points="285,0 340,0 340,14 310,14" fill={t4} opacity="0.45" />
    </svg>
  );
}

interface IdCardGeometricHeaderProps {
  theme: IdCardTheme;
}

export function IdCardGeometricHeader({ theme }: IdCardGeometricHeaderProps) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div className="relative shrink-0">
      <div
        className="relative overflow-hidden"
        style={{ height: `${ID_CARD_HEADER_HEIGHT_MM}mm` }}
      >
        <HeaderGeometricPattern theme={theme} gradientId={gradientId} />
        <div className="relative z-10 h-full px-2">
          <div className="flex h-full items-center gap-2 pr-[20mm]">
            <div className="flex h-[12mm] w-[12mm] shrink-0 items-center justify-center rounded-md bg-white p-0.5 shadow-sm ring-1 ring-white/80">
              <img
                src={idCardBranding.schoolLogo}
                alt=""
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-[2px]">
              <p
                className="w-full whitespace-nowrap font-extrabold leading-none"
                style={{
                  color: theme.schoolNameColor,
                  fontSize: "4.8mm",
                  letterSpacing: "0.03em",
                }}
              >
                {idCardBranding.schoolName}
              </p>
              <p
                className="w-full whitespace-nowrap font-semibold leading-none"
                style={{
                  color: theme.schoolNameColor,
                  opacity: 0.95,
                  fontSize: "2.3mm",
                }}
              >
                {idCardBranding.schoolAddress}
              </p>
            </div>
          </div>
          <p
            className="absolute bottom-[1mm] right-2 whitespace-nowrap font-bold leading-none"
            style={{
              color: theme.schoolNameColor,
              opacity: 0.9,
              fontSize: "2.2mm",
            }}
          >
            {idCardBranding.schoolEstablished}
          </p>
        </div>
      </div>
    </div>
  );
}

interface IdCardTypeRowProps {
  theme: IdCardTheme;
  cardTitle: "Student ID Card" | "Staff ID Card";
  academicYear: string;
}

export function IdCardTypeRow({
  theme,
  cardTitle,
  academicYear,
}: IdCardTypeRowProps) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center gap-0.5 text-center">
      <p
        className="w-full whitespace-nowrap text-[7.5px] font-extrabold leading-none"
        style={{ color: theme.labelColor }}
      >
        {cardTitle}
      </p>
      <p
        className="whitespace-nowrap text-[7px] font-bold leading-none"
        style={{
          color: theme.sessionBadge.text,
          backgroundColor: theme.sessionBadge.bg,
          padding: "2px 4px",
          borderRadius: "3px",
        }}
      >
        Session {academicYear}
      </p>
    </div>
  );
}

interface IdCardBodySectionProps {
  theme: IdCardTheme;
  cardTitle: "Student ID Card" | "Staff ID Card";
  academicYear: string;
  photo: ReactNode;
  details: ReactNode;
  scanId: string;
  principalSignatureUrl?: string;
}

/**
 * Single-row, 3 columns:
 * [photo] | [details → principal] | [card type + session → QR code]
 */
export function IdCardBodySection({
  theme,
  cardTitle,
  academicYear,
  photo,
  details,
  scanId,
  principalSignatureUrl,
}: IdCardBodySectionProps) {
  return (
    <div
      className="flex shrink-0 items-start gap-2 px-2"
      style={{
        height: `${ID_CARD_BODY_HEIGHT_MM}mm`,
        paddingTop: "1mm",
        paddingBottom: "1mm",
      }}
    >
      <div
        className="shrink-0 overflow-hidden"
        style={{
          width: `${ID_CARD_PHOTO_SIZE_MM}mm`,
          height: `${ID_CARD_PHOTO_SIZE_MM}mm`,
        }}
      >
        {photo}
      </div>

      <div
        className="flex min-w-0 flex-1 flex-col justify-between"
        style={{ height: `${ID_CARD_PHOTO_SIZE_MM}mm` }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-visible">
          {details}
        </div>
        <IdCardPrincipalSignature
          theme={theme}
          principalSignatureUrl={principalSignatureUrl}
          className="shrink-0"
        />
      </div>

      <div
        className="flex shrink-0 flex-col items-center justify-between"
        style={{
          width: `${ID_CARD_RIGHT_COL_WIDTH_MM}mm`,
          height: `${ID_CARD_PHOTO_SIZE_MM}mm`,
        }}
      >
        <IdCardTypeRow
          theme={theme}
          cardTitle={cardTitle}
          academicYear={academicYear}
        />
        <IdCardQrCode value={scanId} />
      </div>
    </div>
  );
}

interface IdCardSquarePhotoProps {
  theme: IdCardTheme;
  src?: string;
  alt: string;
  initials: string;
  className?: string;
}

export function IdCardSquarePhoto({
  theme,
  src,
  alt,
  initials,
  className,
}: IdCardSquarePhotoProps) {
  return (
    <div
      className={cn("h-full w-full", className)}
      style={{
        width: `${ID_CARD_PHOTO_SIZE_MM}mm`,
        height: `${ID_CARD_PHOTO_SIZE_MM}mm`,
      }}
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
            className="flex h-full w-full items-center justify-center text-base font-bold"
            style={{
              color: theme.labelColor,
              background: `linear-gradient(135deg, ${theme.photoFallbackFrom}, ${theme.photoFallbackTo})`,
            }}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}

export function IdCardPersonName({
  name,
  theme,
}: {
  name: string;
  theme: IdCardTheme;
}) {
  const lines = formatNameForIdCard(name, 3);
  const { fontSize, lineHeight } = getIdCardNameStyle(lines);

  return (
    <div
      className="mb-0.5 w-full min-w-0 shrink-0"
      style={{ color: theme.labelColor }}
    >
      {lines.map((line, index) => (
        <p
          key={`${index}-${line}`}
          className="break-words font-extrabold uppercase"
          style={{
            fontSize,
            lineHeight,
            wordBreak: "break-word",
            overflowWrap: "anywhere",
          }}
        >
          {line}
        </p>
      ))}
    </div>
  );
}

export function IdCardGeometricFooterStrip({
  theme,
  className,
}: {
  theme: IdCardTheme;
  className?: string;
}) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <div
      className={cn("w-full shrink-0 overflow-hidden", className)}
      style={{ height: `${ID_CARD_FOOTER_HEIGHT_MM}mm` }}
    >
      <FooterGeometricPattern theme={theme} gradientId={gradientId} />
    </div>
  );
}
