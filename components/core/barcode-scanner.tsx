"use client";

import { BrowserQRCodeReader } from "@zxing/browser";
import { DecodeHintType, NotFoundException } from "@zxing/library";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QrCodeScannerProps {
  onDetected: (value: string) => void;
  className?: string;
  /** Start camera as soon as the component mounts (gate kiosks). */
  autoStart?: boolean;
}

function createQrReader() {
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserQRCodeReader(hints);
}

export function QrCodeScanner({
  onDetected,
  className,
  autoStart = false,
}: QrCodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const scannerRef = useRef<BrowserQRCodeReader | null>(null);
  const lastDetectedRef = useRef<{ value: string; timestamp: number } | null>(
    null,
  );

  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopScanner = useCallback(() => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    scannerRef.current = null;
    setIsRunning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!videoRef.current || isRunning) return;

    setIsStarting(true);
    setError(null);

    try {
      const scanner = createQrReader();
      scannerRef.current = scanner;

      const controls = await scanner.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, decodeError) => {
          if (decodeError && !(decodeError instanceof NotFoundException)) {
            console.error("QR scanner decode error:", decodeError);
            return;
          }

          const value = result?.getText()?.trim();
          if (!value) return;

          const now = Date.now();
          const last = lastDetectedRef.current;

          if (last && last.value === value && now - last.timestamp < 1500) {
            return;
          }

          lastDetectedRef.current = { value, timestamp: now };
          onDetected(value);
        },
      );

      controlsRef.current = controls;
      setIsRunning(true);
    } catch (startError) {
      console.error("Failed to start QR scanner:", startError);
      setError("Camera access failed. Check permission and HTTPS.");
    } finally {
      setIsStarting(false);
    }
  }, [isRunning, onDetected]);

  const startScannerRef = useRef(startScanner);
  startScannerRef.current = startScanner;

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  useEffect(() => {
    if (!autoStart) return;
    const frame = requestAnimationFrame(() => {
      void startScannerRef.current();
    });
    return () => cancelAnimationFrame(frame);
  }, [autoStart]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-lg border bg-black/90">
        <video
          ref={videoRef}
          className="aspect-video w-full object-cover"
          muted
          playsInline
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {!isRunning ? (
          <Button type="button" onClick={startScanner} disabled={isStarting}>
            {isStarting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Camera className="mr-2 size-4" />
                Start QR Scanner
              </>
            )}
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={stopScanner}>
            <CameraOff className="mr-2 size-4" />
            Stop Scanner
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Point the camera at the QR code on an ID card.
      </p>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** @deprecated Use QrCodeScanner — ID cards now use QR codes, not barcodes. */
export const BarcodeScanner = QrCodeScanner;
