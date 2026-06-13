import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import {
  ACCRUAL_LEAVE_CODES,
  QUARTERLY_LEAVE_ACCRUAL,
  type AccrualLeaveCode,
} from "@/lib/config/leave-accrual";
import type { StaffLeaveAccrual } from "@/lib/types/leave.type";
import type { User } from "@/lib/types/user.type";
import { getAcademicYear } from "@/lib/utils/academic-year";
import { getDueQuarters } from "@/lib/utils/leave-quarter";
import { leaveTypeService } from "./leave-type.service";

class StaffLeaveAccrualService {
  async getAll(): Promise<StaffLeaveAccrual[]> {
    const data = await mutate({ action: "get", path: "staffLeaveAccruals" });
    return getArrFromObj(data || {}) as unknown as StaffLeaveAccrual[];
  }

  async getByStaffAndYear(
    staffId: string,
    academicYear: string,
  ): Promise<StaffLeaveAccrual[]> {
    const all = await this.getAll();
    return all.filter(
      (row) => row.staffId === staffId && row.academicYear === academicYear,
    );
  }

  private async getActiveStaff(): Promise<User[]> {
    const data = await mutate({ action: "get", path: "users" });
    const users = getArrFromObj(data || {}) as unknown as User[];
    return users.filter(
      (user) => user.role === "staff" && user.status !== "inactive" && user.uid,
    );
  }

  /** Credit elapsed quarters for one staff member (idempotent). */
  async ensureQuarterlyAccrualsForStaff(
    staffId: string,
    academicYear?: string,
    actionBy = "system",
  ): Promise<number> {
    const year = academicYear || getAcademicYear();
    const dueQuarters = getDueQuarters(year);
    if (dueQuarters.length === 0) return 0;

    const leaveTypes = await leaveTypeService.getActive();
    const codeToType = new Map(
      leaveTypes
        .filter((type) => ACCRUAL_LEAVE_CODES.includes(type.code as AccrualLeaveCode))
        .map((type) => [type.code, type]),
    );

    const existing = await this.getByStaffAndYear(staffId, year);
    const existingKeys = new Set(
      existing.map((row) => `${row.quarterKey}:${row.leaveTypeCode}`),
    );

    let created = 0;
    const nowISO = new Date().toISOString();

    for (const quarter of dueQuarters) {
      for (const code of ACCRUAL_LEAVE_CODES) {
        const leaveType = codeToType.get(code);
        if (!leaveType) continue;

        const dedupeKey = `${quarter.key}:${code}`;
        if (existingKeys.has(dedupeKey)) continue;

        const days = QUARTERLY_LEAVE_ACCRUAL[code];
        await mutate({
          action: "createWithId",
          path: "staffLeaveAccruals",
          data: {
            staffId,
            leaveTypeId: leaveType.id,
            leaveTypeCode: code,
            academicYear: year,
            quarterKey: quarter.key,
            quarter: quarter.quarter,
            accrualDate: quarter.accrualDate,
            days,
            createdAt: nowISO,
            updatedAt: nowISO,
          },
          actionBy,
        });
        existingKeys.add(dedupeKey);
        created += 1;
      }
    }

    return created;
  }

  async ensureQuarterlyAccrualsForAllStaff(
    academicYear?: string,
    actionBy = "admin",
  ): Promise<{ staffProcessed: number; accrualsCreated: number }> {
    const staffList = await this.getActiveStaff();
    let accrualsCreated = 0;

    for (const staff of staffList) {
      if (!staff.uid) continue;
      accrualsCreated += await this.ensureQuarterlyAccrualsForStaff(
        staff.uid,
        academicYear,
        actionBy,
      );
    }

    return { staffProcessed: staffList.length, accrualsCreated };
  }

  sumAccruedDays(
    accruals: StaffLeaveAccrual[],
    leaveTypeId: string,
  ): { total: number; quarters: number } {
    const matching = accruals.filter((row) => row.leaveTypeId === leaveTypeId);
    const total = matching.reduce((sum, row) => sum + row.days, 0);
    const quarters = new Set(matching.map((row) => row.quarterKey)).size;
    return { total, quarters };
  }
}

export const staffLeaveAccrualService = new StaffLeaveAccrualService();
