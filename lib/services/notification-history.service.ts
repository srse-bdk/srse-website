import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  ScannerLoginEvent,
  StudentGateEventRecord,
} from "@/lib/types/notification-history.type";

class NotificationHistoryService {
  async getScannerLoginEvents(): Promise<ScannerLoginEvent[]> {
    const data = await mutate({ action: "get", path: "scannerLoginEvents" });
    const events = getArrFromObj(data || {}) as unknown as ScannerLoginEvent[];
    return events.sort((a, b) => b.loginAt - a.loginAt);
  }

  async getStudentGateEvents(): Promise<StudentGateEventRecord[]> {
    const data = await mutate({ action: "get", path: "studentGateEvents" });
    const events = getArrFromObj(data || {}) as unknown as StudentGateEventRecord[];
    return events.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getStudentGateEventsForStudent(
    studentId: string,
  ): Promise<StudentGateEventRecord[]> {
    const all = await this.getStudentGateEvents();
    return all.filter((event) => event.studentId === studentId);
  }

  async deleteAllScannerLoginEvents(actionBy = "admin"): Promise<number> {
    const events = await this.getScannerLoginEvents();
    for (const event of events) {
      if (!event.id) continue;
      await mutate({
        action: "delete",
        path: `scannerLoginEvents/${event.id}`,
        actionBy,
      });
    }
    return events.length;
  }

  async deleteAllStudentGateEvents(actionBy = "admin"): Promise<number> {
    const events = await this.getStudentGateEvents();
    for (const event of events) {
      if (!event.id) continue;
      await mutate({
        action: "delete",
        path: `studentGateEvents/${event.id}`,
        actionBy,
      });
    }
    return events.length;
  }
}

export const notificationHistoryService = new NotificationHistoryService();
