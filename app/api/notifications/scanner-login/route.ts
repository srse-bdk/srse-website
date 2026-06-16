import { NextResponse } from "next/server";
import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import { ensureFirebaseClient } from "@/lib/firebase";
import { z } from "zod";
import { isFirebaseAdminConfigured } from "@/lib/env";
import { notificationService } from "@/lib/services/notification.service";
import type { User } from "@/lib/types/user.type";
import { formatDeviceInfoSummary } from "@/lib/utils/device-info";
import { formatDateTime } from "@/lib/utils/date";
import { getFirebaseAdminMessaging } from "@/lib/utils/firebase-admin-app";

const bodySchema = z.object({
  scannerUserId: z.string().min(1),
  scannerName: z.string().min(1),
  scannerEmail: z.string().optional().default(""),
  loginAt: z.number(),
  device: z.object({
    userAgent: z.string(),
    platform: z.string(),
    screen: z.string(),
    language: z.string(),
    timezone: z.string(),
  }),
});

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

async function getAdminUserIds(): Promise<string[]> {
  const data = await mutate({ action: "get", path: "users" });
  const users = getArrFromObj(data || {}) as unknown as User[];
  return users
    .filter((user) => user.role === "admin" && user.status !== "inactive")
    .map((user) => user.uid)
    .filter(Boolean);
}

export async function POST(request: Request) {
  try {
    ensureFirebaseClient();
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { scannerUserId, scannerName, scannerEmail, loginAt, device } =
      parsed.data;
    const ip = getClientIp(request);
    const eventId = `login_${scannerUserId}_${loginAt}`;

    await mutate({
      action: "update",
      path: `scannerLoginEvents/${eventId}`,
      data: {
        scannerUserId,
        scannerName,
        scannerEmail: scannerEmail || "",
        device,
        ip,
        loginAt,
        createdAt: new Date(loginAt).toISOString(),
      },
      actionBy: scannerUserId,
    });

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({
        success: true,
        message: "Login recorded; push notifications not configured",
        eventId,
      });
    }

    const adminIds = await getAdminUserIds();
    if (adminIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Login recorded; no admin users for push",
        eventId,
      });
    }

    const messaging = await getFirebaseAdminMessaging();
    if (!messaging) {
      return NextResponse.json({
        success: true,
        message: "Login recorded; messaging unavailable",
        eventId,
      });
    }

    const when = formatDateTime(loginAt);
    const deviceSummary = formatDeviceInfoSummary(device);
    const title = "Gate scanner login";
    const bodyText = `${scannerName} signed in at ${when}. Device: ${deviceSummary}. IP: ${ip}`;

    const results = await notificationService.sendNotification(
      messaging,
      adminIds,
      {
        title,
        body: bodyText,
        priority: "high",
        tag: eventId,
        clickAction: "/gate/activity",
        data: {
          type: "scanner_login",
          scannerUserId,
          loginAt: String(loginAt),
        },
      },
    );

    const sent = results.some((result) => result.success);

    return NextResponse.json({
      success: true,
      pushSent: sent,
      results,
      eventId,
      message: sent
        ? "Admins notified of scanner login"
        : "Login recorded; push delivery failed",
    });
  } catch (error) {
    console.error("Scanner login notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
