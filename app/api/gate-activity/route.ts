import { NextResponse } from "next/server";
import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  ScannerLoginEvent,
  StudentGateEventRecord,
} from "@/lib/types/notification-history.type";

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
    const [scannerRaw, studentRaw] = await Promise.all([
      mutate({ action: "get", path: "scannerLoginEvents" }),
      mutate({ action: "get", path: "studentGateEvents" }),
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
