export interface ClientDeviceInfo {
  userAgent: string;
  platform: string;
  screen: string;
  language: string;
  timezone: string;
}

export function collectClientDeviceInfo(): ClientDeviceInfo {
  if (typeof window === "undefined") {
    return {
      userAgent: "unknown",
      platform: "unknown",
      screen: "unknown",
      language: "unknown",
      timezone: "unknown",
    };
  }

  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform || "unknown",
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function formatDeviceInfoSummary(device: ClientDeviceInfo): string {
  const parts = [
    device.platform !== "unknown" ? device.platform : null,
    device.screen,
    device.timezone,
  ].filter(Boolean);
  return parts.join(" · ");
}
