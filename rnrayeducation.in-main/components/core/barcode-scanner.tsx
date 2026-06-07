"use client";

import { BrowserMultiFormatReader } from "@zxing/browser";
import { NotFoundException } from "@zxing/library";
import { Camera, CameraOff, Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BarcodeScannerProps {
  onDetected: (value: string) => void;
  className?: string;
}

export function BarcodeScanner({ onDetected, className }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const scannerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastDetectedRef = useRef<{ value: string; timestamp: number } | null>(null);

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
      const scanner = new BrowserMultiFormatReader();
      scannerRef.current = scanner;

      const controls = await scanner.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, decodeError) => {
          if (decodeError && !(decodeError instanceof NotFoundException)) {
            console.error("Scanner decode error:", decodeError);
            return;
          }

          const value = result?.getText()?.trim();
          if (!value) return;

          const now = Date.now();
          const last = lastDetectedRef.current;

          // Prevent rapid duplicate triggers from the same card.
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
      console.error("Failed to start scanner:", startError);
      setError("Camera access failed. Check permission and HTTPS.");
    } finally {
      setIsStarting(false);
    }
  }, [isRunning, onDetected]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="overflow-hidden rounded-lg border bg-black/90">
        <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
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
                Start Scanner
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

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
