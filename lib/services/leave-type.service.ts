import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type { LeaveType, LeaveTypeInput } from "@/lib/types/leave.type";
import {
  ACCRUAL_LEAVE_CODES,
  getAnnualAccrualLimit,
  type AccrualLeaveCode,
} from "@/lib/config/leave-accrual";

const DEFAULT_LEAVE_TYPES: LeaveTypeInput[] = [
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
    name: "Earned Leave",
    maxDaysPerYear: getAnnualAccrualLimit("EL"),
    isPaid: true,
  },
  { code: "LWP", name: "Leave Without Pay", maxDaysPerYear: 30, isPaid: false },
];

class LeaveTypeService {
  async getAll(): Promise<LeaveType[]> {
    const data = await mutate({ action: "get", path: "leaveTypes" });
    const types = getArrFromObj(data || {}) as unknown as LeaveType[];
    return types.sort((a, b) => a.code.localeCompare(b.code));
  }

  async getActive(): Promise<LeaveType[]> {
    const all = await this.getAll();
    return all.filter((type) => type.isActive !== false);
  }

  async getById(id: string): Promise<LeaveType | null> {
    const data = await mutate({ action: "get", path: `leaveTypes/${id}` });
    if (!data) return null;
    return { ...(data as LeaveType), id };
  }

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

  /** Align CL/SL/EL annual caps with quarterly accrual policy (2+2+1 per quarter). */
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
