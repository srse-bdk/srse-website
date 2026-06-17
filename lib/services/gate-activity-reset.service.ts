import { notificationHistoryService } from "./notification-history.service";

class GateActivityResetService {
  /** Clear kiosk login log and all student entry/exit scan records. */
  async resetAllGateActivityHistory(actionBy = "admin"): Promise<{
    scannerLoginsDeleted: number;
    studentScansDeleted: number;
  }> {
    const [scannerLoginsDeleted, studentScansDeleted] = await Promise.all([
      notificationHistoryService.deleteAllScannerLoginEvents(actionBy),
      notificationHistoryService.deleteAllStudentGateEvents(actionBy),
    ]);

    return { scannerLoginsDeleted, studentScansDeleted };
  }
}

export const gateActivityResetService = new GateActivityResetService();
