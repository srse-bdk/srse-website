import { attendanceService } from "./attendance.service";
import { studentAttendanceService } from "./student-attendance.service";

class AttendanceResetService {
  /** Permanently delete all staff punch records and all student attendance rows. */
  async resetAllAttendanceHistory(actionBy = "admin"): Promise<{
    staffRecordsDeleted: number;
    studentRecordsDeleted: number;
  }> {
    const [staffRecordsDeleted, studentRecordsDeleted] = await Promise.all([
      attendanceService.deleteAll(actionBy),
      studentAttendanceService.deleteAll(actionBy),
    ]);

    return { staffRecordsDeleted, studentRecordsDeleted };
  }
}

export const attendanceResetService = new AttendanceResetService();
