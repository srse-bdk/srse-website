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
import { isAccrualLeaveCode } from "@/lib/utils/leave-quarter";
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
    /** When set, skips quarters before the staff joined. */
    dateOfJoining?: string | null,
  ): Promise<number> {
    const year = academicYear || getAcademicYear();
    let joinedOn = dateOfJoining;
    if (joinedOn == null) {
      const staffRaw = await mutate({
        action: "get",
        path: `users/${staffId}`,
      });
      joinedOn = (staffRaw as User | null)?.dateOfJoining ?? null;
    }
    const joinYmd = joinedOn
      ? String(joinedOn).trim().slice(0, 10)
      : "";
    // Drop any pre-join / duplicate rows so leave UI cannot re-inflate balances.
    if (/^\d{4}-\d{2}-\d{2}$/.test(joinYmd)) {
      await this.reconcileAccrualsForJoiningDate(
        staffId,
        joinYmd,
        year,
        actionBy,
      );
    }

    const dueQuarters = getDueQuarters(year, new Date(), joinedOn);
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

  /**
   * Remove accrual rows for quarters before the staff joined, and collapse
   * duplicate quarter/code rows to a single credit.
   */
  async reconcileAccrualsForJoiningDate(
    staffId: string,
    dateOfJoining: string,
    academicYear?: string,
    actionBy = "admin",
  ): Promise<{ deleted: number; kept: number }> {
    const year = academicYear || getAcademicYear();
    const joinYmd = String(dateOfJoining).trim().slice(0, 10);
    const accruals = await this.getByStaffAndYear(staffId, year);
    const dueKeys = new Set(
      getDueQuarters(year, new Date(), joinYmd).map((q) => q.key),
    );

    let deleted = 0;
    const byKey = new Map<string, StaffLeaveAccrual[]>();
    for (const row of accruals) {
      const isManualCredit =
        String(row.quarterKey || "").includes("midjoin") ||
        String(row.quarterKey || "").includes("manual");
      // Drop standard quarters before join; keep manual mid-join grants.
      if (!dueKeys.has(row.quarterKey) && !isManualCredit) {
        if (row.id) {
          await mutate({
            action: "delete",
            path: `staffLeaveAccruals/${row.id}`,
            actionBy,
          });
          deleted += 1;
        }
        continue;
      }
      const key = `${row.quarterKey}:${row.leaveTypeCode}`;
      const list = byKey.get(key) || [];
      list.push(row);
      byKey.set(key, list);
    }

    let kept = 0;
    for (const rows of byKey.values()) {
      rows.sort((a, b) =>
        String(a.createdAt || "").localeCompare(String(b.createdAt || "")),
      );
      const [keeper, ...dupes] = rows;
      if (keeper) kept += 1;
      for (const dup of dupes) {
        if (!dup.id) continue;
        await mutate({
          action: "delete",
          path: `staffLeaveAccruals/${dup.id}`,
          actionBy,
        });
        deleted += 1;
      }
    }

    return { deleted, kept };
  }

  /** Fix accrual rows that still point at an old leave type id after types were recreated. */
  async repairAccrualLeaveTypeIds(
    staffId: string,
    academicYear?: string,
    actionBy = "system",
  ): Promise<number> {
    const year = academicYear || getAcademicYear();
    const leaveTypes = await leaveTypeService.getActive();
    const codeToTypeId = new Map(
      leaveTypes
        .filter((type) => isAccrualLeaveCode(type.code))
        .map((type) => [type.code, type.id]),
    );

    const accruals = await this.getByStaffAndYear(staffId, year);
    let updated = 0;
    const nowISO = new Date().toISOString();

    for (const row of accruals) {
      const expectedTypeId = codeToTypeId.get(row.leaveTypeCode);
      if (!expectedTypeId || row.leaveTypeId === expectedTypeId) continue;

      await mutate({
        action: "update",
        path: `staffLeaveAccruals/${row.id}`,
        data: {
          leaveTypeId: expectedTypeId,
          updatedAt: nowISO,
        },
        actionBy,
      });
      updated += 1;
    }

    return updated;
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
        staff.dateOfJoining,
      );
    }

    return { staffProcessed: staffList.length, accrualsCreated };
  }

  async deleteAll(actionBy = "admin"): Promise<number> {
    const all = await this.getAll();
    for (const row of all) {
      if (!row.id) continue;
      await mutate({
        action: "delete",
        path: `staffLeaveAccruals/${row.id}`,
        actionBy,
      });
    }
    return all.length;
  }

  /** Update credited days on existing accrual rows to match current quarterly policy. */
  async syncAccrualDaysFromPolicy(
    academicYear?: string,
    actionBy = "admin",
  ): Promise<number> {
    const year = academicYear || getAcademicYear();
    const all = await this.getAll();
    let updated = 0;
    const nowISO = new Date().toISOString();

    for (const row of all) {
      if (row.academicYear !== year) continue;
      if (!ACCRUAL_LEAVE_CODES.includes(row.leaveTypeCode as AccrualLeaveCode)) {
        continue;
      }

      const expectedDays =
        QUARTERLY_LEAVE_ACCRUAL[row.leaveTypeCode as AccrualLeaveCode];
      if (row.days === expectedDays) continue;

      await mutate({
        action: "update",
        path: `staffLeaveAccruals/${row.id}`,
        data: {
          days: expectedDays,
          updatedAt: nowISO,
        },
        actionBy,
      });
      updated += 1;
    }

    return updated;
  }

  sumAccruedDays(
    accruals: StaffLeaveAccrual[],
    leaveTypeId: string,
    leaveTypeCode: string,
  ): { total: number; quarters: number } {
    const matching = accruals.filter(
      (row) =>
        row.leaveTypeCode === leaveTypeCode || row.leaveTypeId === leaveTypeId,
    );
    const total = matching.reduce((sum, row) => sum + row.days, 0);
    const quarters = new Set(matching.map((row) => row.quarterKey)).size;
    return { total, quarters };
  }

  /**
   * Remove duplicate quarter credits for one staff member and normalize days to policy.
   * Keeps one row per quarter + leave type code (prefers current leave type id).
   */
  async repairAccrualsForStaff(
    staffId: string,
    academicYear?: string,
    actionBy = "admin",
  ): Promise<{ deleted: number; updated: number }> {
    const year = academicYear || getAcademicYear();
    await leaveTypeService.ensureAccrualTypesPresent(actionBy);

    const leaveTypes = await leaveTypeService.getActive();
    const codeToType = new Map(
      leaveTypes
        .filter((type) =>
          ACCRUAL_LEAVE_CODES.includes(type.code as AccrualLeaveCode),
        )
        .map((type) => [type.code.trim().toUpperCase(), type]),
    );

    const accruals = await this.getByStaffAndYear(staffId, year);
    const groups = new Map<string, StaffLeaveAccrual[]>();

    for (const row of accruals) {
      const key = `${row.quarterKey}:${row.leaveTypeCode.trim().toUpperCase()}`;
      const list = groups.get(key) ?? [];
      list.push(row);
      groups.set(key, list);
    }

    let deleted = 0;
    let updated = 0;
    const nowISO = new Date().toISOString();

    for (const rows of groups.values()) {
      const code = rows[0]?.leaveTypeCode.trim().toUpperCase() ?? "";
      const leaveType = codeToType.get(code);
      const expectedDays = ACCRUAL_LEAVE_CODES.includes(code as AccrualLeaveCode)
        ? QUARTERLY_LEAVE_ACCRUAL[code as AccrualLeaveCode]
        : null;

      const sorted = [...rows].sort((a, b) => {
        const aMatch = leaveType && a.leaveTypeId === leaveType.id ? 1 : 0;
        const bMatch = leaveType && b.leaveTypeId === leaveType.id ? 1 : 0;
        if (bMatch !== aMatch) return bMatch - aMatch;
        const aTime = String(a.updatedAt || a.createdAt || "");
        const bTime = String(b.updatedAt || b.createdAt || "");
        return bTime.localeCompare(aTime);
      });

      const keeper = sorted[0];
      if (!keeper?.id) continue;

      for (const duplicate of sorted.slice(1)) {
        if (!duplicate.id) continue;
        await mutate({
          action: "delete",
          path: `staffLeaveAccruals/${duplicate.id}`,
          actionBy,
        });
        deleted += 1;
      }

      const patch: Record<string, unknown> = {};
      if (leaveType && keeper.leaveTypeId !== leaveType.id) {
        patch.leaveTypeId = leaveType.id;
      }
      if (expectedDays !== null && keeper.days !== expectedDays) {
        patch.days = expectedDays;
      }

      if (Object.keys(patch).length > 0) {
        await mutate({
          action: "update",
          path: `staffLeaveAccruals/${keeper.id}`,
          data: { ...patch, updatedAt: nowISO },
          actionBy,
        });
        updated += 1;
      }
    }

    return { deleted, updated };
  }
}

export const staffLeaveAccrualService = new StaffLeaveAccrualService();
