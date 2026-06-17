import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  LeaveApplicationStatus,
  StaffLeaveApplication,
  StaffLeaveApplicationInput,
  StaffLeaveBalanceSummary,
} from "@/lib/types/leave.type";
import { getAcademicYear, getAcademicYearStartEnd } from "@/lib/utils/academic-year";
import {
  QUARTERLY_LEAVE_ACCRUAL,
  type AccrualLeaveCode,
} from "@/lib/config/leave-accrual";
import { isAccrualLeaveCode } from "@/lib/utils/leave-quarter";
import {
  countDaysInclusive,
  eachDateInRange,
  getHolidayReasonForDate,
  isSchoolHoliday,
} from "@/lib/utils/school-calendar";
import { attendanceService } from "./attendance.service";
import { leaveTypeService } from "./leave-type.service";
import { schoolCalendarService } from "./school-calendar.service";
import { staffLeaveAccrualService } from "./staff-leave-accrual.service";

class StaffLeaveService {
  async getAll(): Promise<StaffLeaveApplication[]> {
    const data = await mutate({ action: "get", path: "staffLeaveApplications" });
    const apps = getArrFromObj(data || {}) as unknown as StaffLeaveApplication[];
    return apps.sort((a, b) => b.appliedAt - a.appliedAt);
  }

  async getByStaffId(staffId: string): Promise<StaffLeaveApplication[]> {
    const all = await this.getAll();
    return all.filter((app) => app.staffId === staffId);
  }

  async getById(id: string): Promise<StaffLeaveApplication | null> {
    const data = await mutate({
      action: "get",
      path: `staffLeaveApplications/${id}`,
    });
    if (!data) return null;
    return { ...(data as StaffLeaveApplication), id };
  }

  async getApprovedDatesInRange(
    staffId: string,
    startDate: string,
    endDate: string,
  ): Promise<Set<string>> {
    const apps = await this.getByStaffId(staffId);
    const dates = new Set<string>();

    for (const app of apps) {
      if (app.status !== "approved") continue;
      if (app.endDate < startDate || app.startDate > endDate) continue;
      for (const date of eachDateInRange(app.startDate, app.endDate)) {
        if (date >= startDate && date <= endDate) {
          dates.add(date);
        }
      }
    }

    return dates;
  }

  async isOnApprovedLeave(staffId: string, dateStr: string): Promise<boolean> {
    const dates = await this.getApprovedDatesInRange(staffId, dateStr, dateStr);
    return dates.has(dateStr);
  }

  private async countWorkingLeaveDays(
    startDate: string,
    endDate: string,
  ): Promise<number> {
    const settings = await schoolCalendarService.getSettings();
    const entries = await schoolCalendarService.getActiveEntries();
    let count = 0;

    for (const date of eachDateInRange(startDate, endDate)) {
      if (!isSchoolHoliday(date, settings, entries)) {
        count += 1;
      }
    }

    return count;
  }

  async getHolidaysInLeaveRange(
    startDate: string,
    endDate: string,
  ): Promise<Array<{ date: string; reason: string }>> {
    if (!startDate || !endDate || endDate < startDate) return [];

    const settings = await schoolCalendarService.getSettings();
    const entries = await schoolCalendarService.getActiveEntries();
    const holidays: Array<{ date: string; reason: string }> = [];

    for (const date of eachDateInRange(startDate, endDate)) {
      const reason = getHolidayReasonForDate(date, settings, entries);
      if (reason) {
        holidays.push({ date, reason });
      }
    }

    return holidays;
  }

  async getLeaveRangePreview(
    startDate: string,
    endDate: string,
  ): Promise<{ workingDays: number; holidays: Array<{ date: string; reason: string }> }> {
    const holidays = await this.getHolidaysInLeaveRange(startDate, endDate);
    const workingDays = await this.countWorkingLeaveDays(startDate, endDate);
    return { workingDays, holidays };
  }

  async applyLeave(
    input: StaffLeaveApplicationInput,
    actionBy: string,
  ): Promise<string> {
    const leaveType = await leaveTypeService.getById(input.leaveTypeId);
    if (!leaveType || leaveType.isActive === false) {
      throw new Error("Leave type not found or inactive");
    }

    if (!isAccrualLeaveCode(leaveType.code)) {
      throw new Error(
        "Only Casual Leave, Sick Leave, and Emergency Leave can be applied from the staff portal.",
      );
    }

    if (input.endDate < input.startDate) {
      throw new Error("End date must be on or after start date");
    }

    const totalDays = await this.countWorkingLeaveDays(
      input.startDate,
      input.endDate,
    );
    if (totalDays <= 0) {
      throw new Error("Selected dates fall only on approved holidays");
    }

    const overlapping = (await this.getByStaffId(input.staffId)).some(
      (app) =>
        app.status !== "rejected" &&
        app.status !== "cancelled" &&
        app.endDate >= input.startDate &&
        app.startDate <= input.endDate,
    );
    if (overlapping) {
      throw new Error("Leave dates overlap with an existing application");
    }

    const year = getAcademicYear();
    await staffLeaveAccrualService.ensureQuarterlyAccrualsForStaff(
      input.staffId,
      year,
      actionBy,
    );
    const balances = await this.getBalanceSummary(input.staffId, year);
    const typeBalance = balances.find(
      (row) =>
        row.leaveTypeId === leaveType.id || row.code === leaveType.code,
    );
    if (
      typeBalance?.usesQuarterlyAccrual &&
      typeBalance.remainingDays < totalDays
    ) {
      throw new Error(
        `Insufficient ${leaveType.code} balance. Available: ${typeBalance.remainingDays}, requested: ${totalDays}`,
      );
    }

    const now = Date.now();
    const nowISO = new Date().toISOString();

    return mutate({
      action: "createWithId",
      path: "staffLeaveApplications",
      data: {
        staffId: input.staffId,
        staffName: input.staffName,
        leaveTypeId: leaveType.id,
        leaveTypeCode: leaveType.code,
        leaveTypeName: leaveType.name,
        startDate: input.startDate,
        endDate: input.endDate,
        totalDays,
        reason: input.reason.trim(),
        status: leaveType.requiresApproval === false ? "approved" : "pending",
        appliedAt: now,
        source: "application",
        createdAt: nowISO,
        updatedAt: nowISO,
        ...(leaveType.requiresApproval === false && {
          reviewedBy: actionBy,
          reviewedAt: now,
          reviewNotes: "Auto-approved",
        }),
      },
      actionBy,
    });
  }

  async reviewApplication(
    id: string,
    status: Extract<LeaveApplicationStatus, "approved" | "rejected">,
    reviewedBy: string,
    reviewNotes?: string,
  ): Promise<void> {
    const app = await this.getById(id);
    if (!app) throw new Error("Leave application not found");
    if (app.status !== "pending") {
      throw new Error("Only pending applications can be reviewed");
    }

    await mutate({
      action: "update",
      path: `staffLeaveApplications/${id}`,
      data: {
        status,
        reviewedBy,
        reviewedAt: Date.now(),
        reviewNotes: reviewNotes?.trim() || undefined,
        updatedAt: new Date().toISOString(),
      },
      actionBy: reviewedBy,
    });
  }

  async cancelApplication(id: string, staffId: string): Promise<void> {
    const app = await this.getById(id);
    if (!app) throw new Error("Leave application not found");
    if (app.staffId !== staffId) throw new Error("Not authorized");
    if (app.status !== "pending") {
      throw new Error("Only pending applications can be cancelled");
    }

    await mutate({
      action: "update",
      path: `staffLeaveApplications/${id}`,
      data: {
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      },
      actionBy: staffId,
    });
  }

  async getBalanceSummary(
    staffId: string,
    academicYear?: string,
  ): Promise<StaffLeaveBalanceSummary[]> {
    const year = academicYear || getAcademicYear();
    await staffLeaveAccrualService.ensureQuarterlyAccrualsForStaff(
      staffId,
      year,
      staffId,
    );
    await staffLeaveAccrualService.repairAccrualLeaveTypeIds(
      staffId,
      year,
      staffId,
    );

    const { startDate, endDate } = getAcademicYearStartEnd(year);
    const leaveTypes = await leaveTypeService.getActive();
    const applications = await this.getByStaffId(staffId);
    const accruals = await staffLeaveAccrualService.getByStaffAndYear(
      staffId,
      year,
    );

    return leaveTypes.map((type) => {
      const relevant = applications.filter(
        (app) =>
          app.leaveTypeId === type.id &&
          app.endDate >= startDate &&
          app.startDate <= endDate,
      );

      const usedDays = relevant
        .filter((app) => app.status === "approved")
        .reduce((sum, app) => sum + app.totalDays, 0);

      const pendingDays = relevant
        .filter((app) => app.status === "pending")
        .reduce((sum, app) => sum + app.totalDays, 0);

      const usesQuarterlyAccrual = isAccrualLeaveCode(type.code);
      const perQuarterDays = usesQuarterlyAccrual
        ? QUARTERLY_LEAVE_ACCRUAL[type.code as AccrualLeaveCode]
        : 0;
      const { total: accruedDays, quarters: quartersCredited } =
        usesQuarterlyAccrual
          ? staffLeaveAccrualService.sumAccruedDays(
              accruals,
              type.id,
              type.code,
            )
          : { total: type.maxDaysPerYear, quarters: 0 };

      const allocatedDays = usesQuarterlyAccrual
        ? accruedDays
        : type.maxDaysPerYear;

      return {
        leaveTypeId: type.id,
        code: type.code,
        name: type.name,
        maxDaysPerYear: type.maxDaysPerYear,
        accruedDays,
        perQuarterDays,
        quartersCredited,
        usedDays,
        pendingDays,
        remainingDays: Math.max(0, allocatedDays - usedDays - pendingDays),
        usesQuarterlyAccrual,
      };
    });
  }

  /** Staff portal: CL, SL, EL balances only (no LWP), in policy order. */
  async getStaffPortalBalanceSummary(
    staffId: string,
    academicYear?: string,
  ): Promise<StaffLeaveBalanceSummary[]> {
    const summary = await this.getBalanceSummary(staffId, academicYear);
    const order = { CL: 0, SL: 1, EL: 2 } as const;
    return summary
      .filter((item) => item.usesQuarterlyAccrual)
      .sort(
        (a, b) =>
          (order[a.code as keyof typeof order] ?? 99) -
          (order[b.code as keyof typeof order] ?? 99),
      );
  }

  async findAbsentWorkingDays(
    staffId: string,
    startDate: string,
    endDate: string,
  ): Promise<string[]> {
    const settings = await schoolCalendarService.getSettings();
    const entries = await schoolCalendarService.getActiveEntries();
    const approvedLeave = await this.getApprovedDatesInRange(
      staffId,
      startDate,
      endDate,
    );
    const attendance = await attendanceService.getByStaffId(
      staffId,
      startDate,
      endDate,
    );
    const presentDates = new Set(attendance.map((record) => record.date));

    const absent: string[] = [];
    for (const date of eachDateInRange(startDate, endDate)) {
      if (date > new Date().toISOString().split("T")[0]) continue;
      if (isSchoolHoliday(date, settings, entries)) continue;
      if (approvedLeave.has(date)) continue;
      if (presentDates.has(date)) continue;
      absent.push(date);
    }

    return absent;
  }

  async convertAbsencesToLeave(
    staffId: string,
    staffName: string,
    leaveTypeId: string,
    dates: string[],
    reviewedBy: string,
    reason = "Converted from absence",
  ): Promise<string[]> {
    if (dates.length === 0) return [];

    const leaveType = await leaveTypeService.getById(leaveTypeId);
    if (!leaveType) throw new Error("Leave type not found");

    const sorted = [...dates].sort();
    const createdIds: string[] = [];
    let groupStart = sorted[0];
    let groupEnd = sorted[0];

    const flushGroup = async () => {
      const totalDays = await this.countWorkingLeaveDays(groupStart, groupEnd);
      const now = Date.now();
      const nowISO = new Date().toISOString();
      const id = await mutate({
        action: "createWithId",
        path: "staffLeaveApplications",
        data: {
          staffId,
          staffName,
          leaveTypeId: leaveType.id,
          leaveTypeCode: leaveType.code,
          leaveTypeName: leaveType.name,
          startDate: groupStart,
          endDate: groupEnd,
          totalDays,
          reason,
          status: "approved",
          appliedAt: now,
          reviewedBy,
          reviewedAt: now,
          reviewNotes: "Converted from recorded absences",
          source: "absent_conversion",
          createdAt: nowISO,
          updatedAt: nowISO,
        },
        actionBy: reviewedBy,
      });
      createdIds.push(id);
    };

    for (let i = 1; i < sorted.length; i += 1) {
      const prev = new Date(`${sorted[i - 1]}T12:00:00`);
      prev.setDate(prev.getDate() + 1);
      const expectedNext = prev.toISOString().split("T")[0];

      if (sorted[i] === expectedNext) {
        groupEnd = sorted[i];
      } else {
        await flushGroup();
        groupStart = sorted[i];
        groupEnd = sorted[i];
      }
    }

    await flushGroup();
    return createdIds;
  }

  async deleteAllApplications(actionBy = "admin"): Promise<number> {
    const all = await this.getAll();
    for (const app of all) {
      if (!app.id) continue;
      await mutate({
        action: "delete",
        path: `staffLeaveApplications/${app.id}`,
        actionBy,
      });
    }
    return all.length;
  }

  /**
   * Wipe all leave applications and accruals, apply policy caps (CL 4, SL 4, EL 4),
   * and credit elapsed quarters (1 CL + 1 SL + 1 EL per quarter) for active staff.
   */
  async resetAllLeaveData(actionBy = "admin"): Promise<{
    applicationsDeleted: number;
    accrualsDeleted: number;
    leaveTypesUpdated: number;
    accrualsCreated: number;
    accrualsUpdated: number;
    staffProcessed: number;
  }> {
    const applicationsDeleted = await this.deleteAllApplications(actionBy);
    const accrualsDeleted =
      await staffLeaveAccrualService.deleteAll(actionBy);

    await leaveTypeService.ensureAccrualTypesPresent(actionBy);
    const leaveTypesUpdated =
      await leaveTypeService.syncAccrualAnnualLimits(actionBy);

    const { staffProcessed, accrualsCreated } =
      await staffLeaveAccrualService.ensureQuarterlyAccrualsForAllStaff(
        undefined,
        actionBy,
      );

    const accrualsUpdated =
      await staffLeaveAccrualService.syncAccrualDaysFromPolicy(
        undefined,
        actionBy,
      );

    return {
      applicationsDeleted,
      accrualsDeleted,
      leaveTypesUpdated,
      accrualsCreated,
      accrualsUpdated,
      staffProcessed,
    };
  }
}

export const staffLeaveService = new StaffLeaveService();

export { countDaysInclusive };
