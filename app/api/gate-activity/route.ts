import { NextResponse } from "next/server";
import { getArrFromObj } from "@ashirbad/js-core";
import { isFirebaseAdminConfigured } from "@/lib/env";
import type {
  ScannerLoginEvent,
  StudentGateEventRecord,
} from "@/lib/types/notification-history.type";
import { getRealtimeValue } from "@/lib/utils/firebase-admin-app";

function toScannerEvents(raw: unknown): ScannerLoginEvent[] {
  const data =
    raw && typeof raw === "object"
      ? (raw as Record<string, Record<string, unknown>>)
      : {};
  return (getArrFromObj(data) as unknown as ScannerLoginEvent[]).sort(
    (a, b) => b.loginAt - a.loginAt,
  );
}

function toStudentEvents(raw: unknown): StudentGateEventRecord[] {
  const data =
    raw && typeof raw === "object"
      ? (raw as Record<string, Record<string, unknown>>)
      : {};
  return (getArrFromObj(data) as unknown as StudentGateEventRecord[]).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

export async function GET() {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({
        success: true,
        scannerLogins: [],
        studentGateEvents: [],
        message: "Use client realtime when Firebase Admin is not configured",
      });
    }

    const [scannerRaw, studentRaw] = await Promise.all([
      getRealtimeValue("scannerLoginEvents"),
      getRealtimeValue("studentGateEvents"),
    ]);

    return NextResponse.json({
      success: true,
      scannerLogins: toScannerEvents(scannerRaw),
      studentGateEvents: toStudentEvents(studentRaw),
    });
  } catch (error) {
    console.error("Gate activity fetch error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
