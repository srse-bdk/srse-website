import { mutate } from "@atechhub/firebase";

export type StudentGateEvent = "arrival" | "dismissal";

async function recordStudentGateEvent(params: {
  studentId: string;
  studentName: string;
  event: StudentGateEvent;
  timestamp: number;
}): Promise<void> {
  const eventId = `gate_${params.studentId}_${params.timestamp}`;
  await mutate({
    action: "update",
    path: `studentGateEvents/${eventId}`,
    data: {
      studentId: params.studentId,
      studentName: params.studentName,
      event: params.event,
      timestamp: params.timestamp,
      createdAt: new Date(params.timestamp).toISOString(),
    },
    actionBy: "gate-scanner",
  });
}

export async function notifyStudentGateEvent(params: {
  studentId: string;
  studentName: string;
  event: StudentGateEvent;
  timestamp: number;
}): Promise<void> {
  try {
    await recordStudentGateEvent(params);
  } catch (error) {
    console.warn("Student gate event record failed:", error);
    return;
  }

  try {
    await fetch("/api/notifications/student-gate-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.warn("Student gate push notification failed:", error);
  }
}
