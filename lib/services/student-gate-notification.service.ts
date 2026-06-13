export type StudentGateEvent = "arrival" | "dismissal";

export async function notifyStudentGateEvent(params: {
  studentId: string;
  studentName: string;
  event: StudentGateEvent;
  timestamp: number;
}): Promise<void> {
  try {
    await fetch("/api/notifications/student-gate-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.warn("Student gate notification failed:", error);
  }
}
