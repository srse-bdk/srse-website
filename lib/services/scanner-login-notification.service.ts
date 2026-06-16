import { mutate } from "@atechhub/firebase";
import type { ClientDeviceInfo } from "@/lib/utils/device-info";
import { collectClientDeviceInfo } from "@/lib/utils/device-info";

async function recordScannerLoginEvent(params: {
  scannerUserId: string;
  scannerName: string;
  scannerEmail: string;
  loginAt: number;
  device: ClientDeviceInfo;
}): Promise<void> {
  const eventId = `login_${params.scannerUserId}_${params.loginAt}`;
  await mutate({
    action: "update",
    path: `scannerLoginEvents/${eventId}`,
    data: {
      scannerUserId: params.scannerUserId,
      scannerName: params.scannerName,
      scannerEmail: params.scannerEmail || "",
      device: params.device,
      ip: "",
      loginAt: params.loginAt,
      createdAt: new Date(params.loginAt).toISOString(),
    },
    actionBy: params.scannerUserId,
  });
}

export async function notifyScannerLogin(params: {
  scannerUserId: string;
  scannerName: string;
  scannerEmail: string;
  device?: ClientDeviceInfo;
}): Promise<boolean> {
  const loginAt = Date.now();
  const device = params.device ?? collectClientDeviceInfo();

  try {
    await recordScannerLoginEvent({
      ...params,
      loginAt,
      device,
    });
  } catch (error) {
    console.warn("Scanner login event record failed:", error);
    return false;
  }

  try {
    const response = await fetch("/api/notifications/scanner-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...params,
        device,
        loginAt,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
      message?: string;
    } | null;

    if (!response.ok || payload?.success === false) {
      console.warn(
        "Scanner login push notification failed:",
        payload?.error || payload?.message || response.status,
      );
    }
  } catch (error) {
    console.warn("Scanner login push notification failed:", error);
  }

  return true;
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
