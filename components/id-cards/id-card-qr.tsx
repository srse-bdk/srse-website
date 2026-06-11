"use client";

import { ID_CARD_QR_SIZE_MM } from "@/lib/config/id-card";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

interface IdCardQrCodeProps {
  value: string;
  className?: string;
  sizeMm?: number;
}

export function IdCardQrCode({
  value,
  className,
  sizeMm = ID_CARD_QR_SIZE_MM,
}: IdCardQrCodeProps) {
  const trimmed = value.trim().toUpperCase();

  if (!trimmed) {
    return (
      <p className="text-center text-[6px] text-red-600">Missing scan ID</p>
    );
  }

  return (
    <div
      className={cn(
        "id-card-qr flex shrink-0 items-center justify-center",
        className,
      )}
      style={{ width: `${sizeMm}mm`, height: `${sizeMm}mm` }}
    >
      <QRCodeSVG
        value={trimmed}
        size={160}
        level="H"
        includeMargin
        bgColor="#FFFFFF"
        fgColor="#000000"
        className="h-full w-full"
      />
    </div>
  );
}
