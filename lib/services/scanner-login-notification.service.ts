import type { ClientDeviceInfo } from "@/lib/utils/device-info";
import { collectClientDeviceInfo } from "@/lib/utils/device-info";

export async function notifyScannerLogin(params: {
  scannerUserId: string;
  scannerName: string;
  scannerEmail: string;
  device?: ClientDeviceInfo;
}): Promise<void> {
  try {
    await fetch("/api/notifications/scanner-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        device: params.device ?? collectClientDeviceInfo(),
        loginAt: Date.now(),
      }),
    });
  } catch (error) {
    console.warn("Scanner login notification failed:", error);
  }
}

export function clearScannerLoginSessionFlag(scannerUserId: string): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(`scanner-login-notified-${scannerUserId}`);
}

export function markScannerLoginNotified(scannerUserId: string): boolean {
  if (typeof window === "undefined") return false;
  const key = `scanner-login-notified-${scannerUserId}`;
  if (sessionStorage.getItem(key)) return false;
  sessionStorage.setItem(key, String(Date.now()));
  return true;
}
