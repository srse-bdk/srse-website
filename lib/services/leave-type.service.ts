import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type { LeaveType, LeaveTypeInput } from "@/lib/types/leave.type";
import {
  ACCRUAL_LEAVE_CODES,
  getAnnualAccrualLimit,
  SPECIAL_LEAVE_CODE,
  SPECIAL_LEAVE_MAX_DAYS_PER_YEAR,
  SPECIAL_LEAVE_NAME,
  type AccrualLeaveCode,
} from "@/lib/config/leave-accrual";
import { isAccrualLeaveCode, isSpecialLeaveCode } from "@/lib/utils/leave-quarter";

const ACCRUAL_LEAVE_TYPE_DEFAULTS: LeaveTypeInput[] = [
  {
    code: "CL",
    name: "Casual Leave",
    maxDaysPerYear: getAnnualAccrualLimit("CL"),
    isPaid: true,
  },
  {
    code: "SL",
    name: "Sick Leave",
    maxDaysPerYear: getAnnualAccrualLimit("SL"),
    isPaid: true,
  },
  {
    code: "EL",
    name: "Emergency Leave",
    maxDaysPerYear: getAnnualAccrualLimit("EL"),
    isPaid: true,
  },
];

const DEFAULT_LEAVE_TYPES: LeaveTypeInput[] = [
  ...ACCRUAL_LEAVE_TYPE_DEFAULTS,
  { code: "LWP", name: "Leave Without Pay", maxDaysPerYear: 30, isPaid: false },
];

class LeaveTypeService {
  async getAll(): Promise<LeaveType[]> {
    const data = await mutate({ action: "get", path: "leaveTypes" });
    const types = getArrFromObj(data || {}) as unknown as LeaveType[];
    return types.sort((a, b) => a.code.localeCompare(b.code));
  }

  /** Remove duplicate rows that share the same code (keeps the first). */
  async deduplicateByCode(actionBy = "admin"): Promise<number> {
    const all = await this.getAll();
    const seenCodes = new Set<string>();
    let deleted = 0;

    for (const type of all) {
      const code = type.code.trim().toUpperCase();
      if (seenCodes.has(code)) {
        await this.delete(type.id, actionBy);
        deleted += 1;
        continue;
      }
      seenCodes.add(code);
    }

    return deleted;
  }

  async getActive(): Promise<LeaveType[]> {
    const all = await this.getAll();
    const active = all.filter((type) => type.isActive !== false);
    const byCode = new Map<string, LeaveType>();
    for (const type of active) {
      const code = type.code.trim().toUpperCase();
      if (!byCode.has(code)) {
        byCode.set(code, type);
      }
    }
    return Array.from(byCode.values()).sort((a, b) =>
      a.code.localeCompare(b.code),
    );
  }

  /** CL, SL, EL only — shown in the staff self-service portal. */
  async getStaffSelectable(): Promise<LeaveType[]> {
    const active = await this.getActive();
    return active
      .filter(
        (type) =>
          isAccrualLeaveCode(type.code) && !isSpecialLeaveCode(type.code),
      )
      .sort(
        (a, b) =>
          ACCRUAL_LEAVE_CODES.indexOf(a.code as AccrualLeaveCode) -
          ACCRUAL_LEAVE_CODES.indexOf(b.code as AccrualLeaveCode),
      );
  }

  async getSpecialLeaveType(): Promise<LeaveType | null> {
    const active = await this.getActive();
    return (
      active.find((type) => isSpecialLeaveCode(type.code)) ??
      active.find((type) => type.code === SPECIAL_LEAVE_CODE) ??
      null
    );
  }

  /** Ensures SPL exists (admin-granted exam / medical leave, max 5 days/year). */
  async ensureSpecialLeaveTypePresent(actionBy = "admin"): Promise<number> {
    const existing = await this.getAll();
    const hasSpl = existing.some((type) => isSpecialLeaveCode(type.code));
    if (hasSpl) return 0;

    await this.create(
      {
        code: SPECIAL_LEAVE_CODE,
        name: SPECIAL_LEAVE_NAME,
        maxDaysPerYear: SPECIAL_LEAVE_MAX_DAYS_PER_YEAR,
        isPaid: true,
        requiresApproval: true,
        isActive: true,
      },
      actionBy,
    );
    return 1;
  }

  async getById(id: string): Promise<LeaveType | null> {
    const data = await mutate({ action: "get", path: `leaveTypes/${id}` });
    if (!data) return null;
    return { ...(data as LeaveType), id };
  }

  /** Seed all leave types only when the collection is empty. */
  async ensureDefaults(actionBy = "admin"): Promise<number> {
    const existing = await this.getAll();
    if (existing.length > 0) return 0;

    const nowISO = new Date().toISOString();
    for (const type of DEFAULT_LEAVE_TYPES) {
      await mutate({
        action: "createWithId",
        path: "leaveTypes",
        data: {
          ...type,
          requiresApproval: true,
          isActive: true,
          createdAt: nowISO,
          updatedAt: nowISO,
        },
        actionBy,
      });
    }
    return DEFAULT_LEAVE_TYPES.length;
  }

  /** Create any default leave type that is missing by code (does not overwrite existing rows). */
  async ensureAccrualTypesPresent(actionBy = "admin"): Promise<number> {
    const existing = await this.getAll();
    const existingCodes = new Set(existing.map((type) => type.code));
    let created = 0;

    for (const type of ACCRUAL_LEAVE_TYPE_DEFAULTS) {
      if (existingCodes.has(type.code)) continue;
      await this.create(type, actionBy);
      created += 1;
    }

    return created;
  }

  /**
   * Apply configured policy caps to CL/SL/EL maxDaysPerYear.
   * Call explicitly (e.g. policy reset) — not on every page load.
   */
  async syncAccrualAnnualLimits(actionBy = "admin"): Promise<number> {
    const types = await this.getAll();
    let updated = 0;

    for (const code of ACCRUAL_LEAVE_CODES) {
      const type = types.find((row) => row.code === code);
      if (!type) continue;
      const limit = getAnnualAccrualLimit(code as AccrualLeaveCode);
      if (type.maxDaysPerYear === limit) continue;
      await this.update(type.id, { maxDaysPerYear: limit }, actionBy);
      updated += 1;
    }

    const spl = types.find((row) => isSpecialLeaveCode(row.code));
    if (spl && spl.maxDaysPerYear !== SPECIAL_LEAVE_MAX_DAYS_PER_YEAR) {
      await this.update(
        spl.id,
        { maxDaysPerYear: SPECIAL_LEAVE_MAX_DAYS_PER_YEAR },
        actionBy,
      );
      updated += 1;
    }

    return updated;
  }

  async create(data: LeaveTypeInput, actionBy = "admin"): Promise<string> {
    const nowISO = new Date().toISOString();
    return mutate({
      action: "createWithId",
      path: "leaveTypes",
      data: {
        ...data,
        requiresApproval: data.requiresApproval ?? true,
        isPaid: data.isPaid ?? true,
        isActive: data.isActive ?? true,
        createdAt: nowISO,
        updatedAt: nowISO,
      },
      actionBy,
    });
  }

  async update(
    id: string,
    data: Partial<LeaveTypeInput>,
    actionBy = "admin",
  ): Promise<void> {
    await mutate({
      action: "update",
      path: `leaveTypes/${id}`,
      data: { ...data, updatedAt: new Date().toISOString() },
      actionBy,
    });
  }

  async delete(id: string, actionBy = "admin"): Promise<void> {
    await mutate({
      action: "delete",
      path: `leaveTypes/${id}`,
      actionBy,
    });
  }
}

export const leaveTypeService = new LeaveTypeService();
