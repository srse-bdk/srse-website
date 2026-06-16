import type { ClientDeviceInfo } from "@/lib/utils/device-info";
import { collectClientDeviceInfo } from "@/lib/utils/device-info";

export async function notifyScannerLogin(params: {
  scannerUserId: string;
  scannerName: string;
  scannerEmail: string;
  device?: ClientDeviceInfo;
}): Promise<boolean> {
  try {
    const response = await fetch("/api/notifications/scanner-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        device: params.device ?? collectClientDeviceInfo(),
        loginAt: Date.now(),
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
      message?: string;
    } | null;

    if (!response.ok || payload?.success === false) {
      console.warn(
        "Scanner login notification failed:",
        payload?.error || payload?.message || response.status,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.warn("Scanner login notification failed:", error);
    return false;
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
