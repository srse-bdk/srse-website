"use client";

import { ID_CARD_QR_SIZE_MM } from "@/lib/config/id-card";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface IdCardQrCodeProps {
  value: string;
  className?: string;
  sizeMm?: number;
}

/** Convert mm to CSS pixels at 96 DPI. */
function mmToPx(mm: number): number {
  return Math.round(mm * 3.7795275591);
}

export function IdCardQrCode({
  value,
  className,
  sizeMm = ID_CARD_QR_SIZE_MM,
}: IdCardQrCodeProps) {
  const trimmed = value.trim().toUpperCase();
  const qrPixelSize = Math.max(28, mmToPx(sizeMm * 0.9));

  if (!trimmed) {
    return (
      <p className="text-center text-[6px] text-red-600">Missing scan ID</p>
    );
  }

  return (
    <div
      className={cn(
        "id-card-qr flex shrink-0 items-center justify-center overflow-hidden",
        className,
      )}
      style={{ width: `${sizeMm}mm`, height: `${sizeMm}mm` }}
    >
      <QRCodeSVG
        value={trimmed}
        size={qrPixelSize}
        level="H"
        includeMargin={false}
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    </div>
  );
}
