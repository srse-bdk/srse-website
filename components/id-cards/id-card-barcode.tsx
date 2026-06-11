"use client";

import {
  ID_CARD_BARCODE_BAR_HEIGHT_PX,
  ID_CARD_BARCODE_FORMAT,
  ID_CARD_BARCODE_MODULE_WIDTH,
  ID_CARD_BARCODE_QUIET_ZONE_PX,
} from "@/lib/config/id-card-barcode";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface IdCardBarcodeProps {
  value: string;
  className?: string;
  wide?: boolean;
}

/** Render to canvas, then expose as PNG so print/PDF clones stay scannable. */
export function IdCardBarcode({
  value,
  className,
  wide = false,
}: IdCardBarcodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pngSrc, setPngSrc] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setPngSrc(null);
      return;
    }

    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    import("jsbarcode")
      .then((module) => {
        if (cancelled || !canvasRef.current) return;

        module.default(canvasRef.current, trimmed.toUpperCase(), {
          format: ID_CARD_BARCODE_FORMAT,
          displayValue: false,
          flat: true,
          width: ID_CARD_BARCODE_MODULE_WIDTH,
          height: ID_CARD_BARCODE_BAR_HEIGHT_PX,
          margin: ID_CARD_BARCODE_QUIET_ZONE_PX,
        });

        setPngSrc(canvasRef.current.toDataURL("image/png"));
      })
      .catch((error) => {
        console.error("Failed to render barcode:", error);
        setPngSrc(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!value.trim()) {
    return (
      <p className="text-center text-[6px] text-red-600">Missing scan ID</p>
    );
  }

  return (
    <div className={cn("id-card-barcode flex w-full items-end", className)}>
      <canvas ref={canvasRef} className="hidden" aria-hidden />
      {pngSrc ? (
        <img
          src={pngSrc}
          alt=""
          draggable={false}
          className={cn(
            "block h-auto w-full max-w-full object-contain object-left-bottom",
            wide ? "max-h-[12mm]" : "max-h-[8mm]",
          )}
          style={{
            imageRendering: "crisp-edges",
          }}
        />
      ) : (
        <div
          className={cn(
            "w-full animate-pulse bg-neutral-200",
            wide ? "h-[12mm]" : "h-[8mm]",
          )}
        />
      )}
    </div>
  );
}
