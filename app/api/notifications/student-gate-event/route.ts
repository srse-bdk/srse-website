import { NextResponse } from "next/server";
import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import { z } from "zod";
import { isFirebaseAdminConfigured } from "@/lib/env";
import { notificationService } from "@/lib/services/notification.service";
import type { User } from "@/lib/types/user.type";
import { getFirebaseAdminMessaging } from "@/lib/utils/firebase-admin-app";
import { formatDateTime } from "@/lib/utils/date";

const bodySchema = z.object({
  studentId: z.string().min(1),
  studentName: z.string().min(1),
  event: z.enum(["arrival", "dismissal"]),
  timestamp: z.number().optional(),
});

async function findStudentUserUid(studentId: string): Promise<string | null> {
  const data = await mutate({ action: "get", path: "users" });
  const users = getArrFromObj(data || {}) as unknown as User[];
  const match = users.find(
    (user) => user.role === "student" && user.studentId === studentId,
  );
  return match?.uid || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { studentId, studentName, event, timestamp } = parsed.data;
    const eventTime = timestamp ?? Date.now();
    const eventId = `gate_${studentId}_${eventTime}`;

    await mutate({
      action: "update",
      path: `studentGateEvents/${eventId}`,
      data: {
        studentId,
        studentName,
        event,
        timestamp: eventTime,
        createdAt: new Date(eventTime).toISOString(),
      },
      actionBy: "gate-scanner",
    });

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({
        success: true,
        recorded: true,
        message: "Event recorded; push notifications not configured",
      });
    }

    const studentUid = await findStudentUserUid(studentId);

    if (!studentUid) {
      return NextResponse.json({
        success: true,
        recorded: true,
        message: "Event recorded; no student login linked for push",
      });
    }

    const messaging = await getFirebaseAdminMessaging();
    if (!messaging) {
      return NextResponse.json({
        success: true,
        recorded: true,
        message: "Event recorded; messaging unavailable",
      });
    }

    const whenLabel = formatDateTime(eventTime);
    const title =
      event === "arrival" ? "School arrival recorded" : "School dismissal recorded";
    const bodyText =
      event === "arrival"
        ? `${studentName}, your arrival was recorded at ${whenLabel}. Have a great day!`
        : `${studentName}, your dismissal was recorded at ${whenLabel}. See you tomorrow!`;

    const results = await notificationService.sendNotification(
      messaging,
      [studentUid],
      {
        title,
        body: bodyText,
        priority: "high",
        tag: `student-gate-${event}-${studentId}`,
        clickAction: `/student/gate-activity`,
        data: {
          type: "student_gate_event",
          event,
          studentId,
        },
      },
    );

    const sent = results.some((result) => result.success);

    return NextResponse.json({
      success: true,
      recorded: true,
      pushSent: sent,
      results,
      message: sent
        ? "Event recorded and notification sent"
        : "Event recorded; push delivery failed",
    });
  } catch (error) {
    console.error("Student gate notification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
