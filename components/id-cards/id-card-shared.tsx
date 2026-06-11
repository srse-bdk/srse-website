"use client";

import type { IdCardTheme } from "@/lib/config/id-card-themes";
import { cn } from "@/lib/utils";

interface IdCardDetailRowProps {
  theme: IdCardTheme;
  label: string;
  value?: string;
  className?: string;
}

export function IdCardDetailRow({
  theme,
  label,
  value,
  className,
}: IdCardDetailRowProps) {
  if (!value?.trim()) return null;

  return (
    <p className={cn("text-[7.5px] leading-snug", className)}>
      <span className="font-bold" style={{ color: theme.labelColor }}>
        {label}:
      </span>{" "}
      <span className="font-semibold" style={{ color: theme.valueColor }}>
        {value.trim()}
      </span>
    </p>
  );
}

interface IdCardPrincipalSignatureProps {
  principalSignatureUrl?: string;
  theme: IdCardTheme;
  className?: string;
}

export function IdCardPrincipalSignature({
  principalSignatureUrl,
  theme,
  className,
}: IdCardPrincipalSignatureProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-full shrink-0 flex-col items-center",
        className,
      )}
    >
      {principalSignatureUrl ? (
        <img
          src={principalSignatureUrl}
          alt=""
          crossOrigin="anonymous"
          className="h-[7mm] w-[12mm] object-contain object-bottom"
        />
      ) : (
        <div
          className="h-[7mm] w-[12mm] border-b border-dotted"
          style={{ borderColor: theme.labelColor }}
        />
      )}
      <p
        className="mt-0.5 shrink-0 text-center text-[6px] font-bold leading-none"
        style={{ color: theme.labelColor }}
      >
        Principal
      </p>
    </div>
  );
}

export function getPersonInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Split a display name into balanced lines for ID card printing (no ellipsis). */
export function formatNameForIdCard(
  name: string,
  maxLines = 2,
): string[] {
  const normalized = name.trim().replace(/\s+/g, " ");
  if (!normalized) return [""];

  const words = normalized.split(" ").filter(Boolean);
  if (words.length === 1) {
    return [words[0]];
  }

  if (maxLines <= 1 || words.length === 2) {
    return words.slice(0, maxLines);
  }

  if (words.length === 3) {
    return [words.slice(0, 2).join(" "), words[2]];
  }

  const mid = Math.ceil(words.length / 2);
  const lines = [
    words.slice(0, mid).join(" "),
    words.slice(mid).join(" "),
  ].filter(Boolean);

  const longestLine = Math.max(...lines.map((line) => line.length));
  if (longestLine > 22 && words.length > 3 && maxLines >= 3) {
    const third = Math.ceil(words.length / 3);
    return [
      words.slice(0, third).join(" "),
      words.slice(third, third * 2).join(" "),
      words.slice(third * 2).join(" "),
    ].filter(Boolean);
  }

  return lines;
}

function getIdCardNameFontSize(lines: string[]): string {
  const longestLine = Math.max(...lines.map((line) => line.length), 0);

  if (lines.length >= 3) {
    return longestLine > 18 ? "6.5px" : "7px";
  }

  if (lines.length === 2) {
    return longestLine > 18 ? "7.5px" : "8.5px";
  }

  if (longestLine > 24) return "7.5px";
  if (longestLine > 18) return "8.5px";
  return "10px";
}

export function getIdCardNameStyle(lines: string[]): {
  fontSize: string;
  lineHeight: number;
} {
  return {
    fontSize: getIdCardNameFontSize(lines),
    lineHeight: lines.length > 1 ? 1.12 : 1.15,
  };
}

function formatDoB(isoDate?: string): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export { formatDoB };
