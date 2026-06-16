import type { ClientDeviceInfo } from "@/lib/utils/device-info";

export interface ScannerLoginEvent {
  id: string;
  scannerUserId: string;
  scannerName: string;
  scannerEmail: string;
  device: ClientDeviceInfo;
  ip: string;
  loginAt: number;
  createdAt: string;
}

export type StudentGateEventType = "arrival" | "dismissal";

export interface StudentGateEventRecord {
  id: string;
  studentId: string;
  studentName: string;
  event: StudentGateEventType;
  timestamp: number;
  createdAt: string;
}
