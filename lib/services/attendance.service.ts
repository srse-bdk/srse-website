import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  Attendance,
  AttendanceInput,
  AttendanceLocation,
  AttendanceAnalytics,
  AdminAnalytics,
} from "@/lib/types/attendance.type";

class AttendanceService {
  /**
   * Punch in - Create new attendance record
   */
  async punchIn(data: AttendanceInput): Promise<string> {
    const now = Date.now();
    const nowISO = new Date().toISOString();
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

    if (!data.staffId || !data.staffName) {
      throw new Error("Missing required fields for punch in");
    }

    const recordData: Record<string, unknown> = {
      staffId: data.staffId,
      staffName: data.staffName,
      date: today,
      punchInTime: now,
      status: "present" as const,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    if (data.source) {
      recordData.punchInSource = data.source;
    }

    if (data.location) {
      recordData.punchInLocation = {
        lat: data.location.lat,
        lng: data.location.lng,
        address: data.location.address,
        ...(data.location.locationId && {
          locationId: data.location.locationId,
        }),
      };
    }

    const recordId = await mutate({
      action: "createWithId",
      path: "attendance",
      data: recordData,
      actionBy: data.staffId,
    });

    return recordId;
  }

  /**
   * Punch out - Update existing record with punch out time and optional location
   */
  async punchOut(
    recordId: string,
    options?: { location?: AttendanceLocation; source?: AttendanceInput["source"] },
  ): Promise<void> {
    const record = await this.getById(recordId);
    if (!record) {
      throw new Error("Attendance record not found");
    }

    const punchOutTime = Date.now();
    const nowISO = new Date().toISOString();
    const totalHours =
      Math.round(
        ((punchOutTime - record.punchInTime) / (1000 * 60 * 60)) * 100,
      ) / 100;

    const updateData: Record<string, unknown> = {
      punchOutTime,
      totalHours,
      updatedAt: nowISO,
    };

    if (options?.source) {
      updateData.punchOutSource = options.source;
    }

    if (options?.location) {
      updateData.punchOutLocation = options.location;
    }

    await mutate({
      action: "update",
      path: `attendance/${recordId}`,
      data: updateData,
      actionBy: record.staffId,
    });
  }

  /**
   * Get today's open session (punched in, not yet out).
   */
  async getTodayOpenSession(staffId: string): Promise<Attendance | null> {
    const sessions = await this.getTodaySessions(staffId);
    return sessions.find((record) => !record.punchOutTime) || null;
  }

  /**
   * All attendance sessions for today, earliest first.
   */
  async getTodaySessions(staffId: string): Promise<Attendance[]> {
    const today = new Date().toISOString().split("T")[0];
    const records = await this.getByStaffId(staffId);
    return records
      .filter((record) => record.date === today)
      .sort((a, b) => a.punchInTime - b.punchInTime);
  }

  /**
   * @deprecated Prefer getTodayOpenSession for gate/punch flows.
   * Returns the most recent attendance row for today (open or completed).
   */
  async getTodayPunchIn(staffId: string): Promise<Attendance | null> {
    const sessions = await this.getTodaySessions(staffId);
    return sessions.length > 0 ? sessions[sessions.length - 1] : null;
  }

  /**
   * Get attendance record by ID
   */
  async getById(recordId: string): Promise<Attendance | null> {
    const data = await mutate({
      action: "get",
      path: `attendance/${recordId}`,
    });
    if (!data) return null;
    return {
      ...data,
      id: recordId,
    } as Attendance;
  }

  /**
   * Get all attendance records for a staff member
   */
  async getByStaffId(
    staffId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Attendance[]> {
    const data = await mutate({
      action: "get",
      path: "attendance",
    });

    const allRecords = getArrFromObj(data || {}) as unknown as Attendance[];
    let filtered = allRecords.filter((record) => record.staffId === staffId);

    if (startDate) {
      filtered = filtered.filter((record) => record.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((record) => record.date <= endDate);
    }

    // Sort by date descending
    return filtered.sort((a, b) => {
      if (a.date === b.date) {
        return b.punchInTime - a.punchInTime;
      }
      return b.date.localeCompare(a.date);
    });
  }

  /**
   * Get all attendance records for a specific date
   */
  async getByDate(date: string): Promise<Attendance[]> {
    const data = await mutate({
      action: "get",
      path: "attendance",
    });

    const allRecords = getArrFromObj(data || {}) as unknown as Attendance[];
    return allRecords
      .filter((record) => record.date === date)
      .sort((a, b) => a.punchInTime - b.punchInTime);
  }

  /**
   * Get all attendance records (admin view)
   */
  async getAll(startDate?: string, endDate?: string): Promise<Attendance[]> {
    const data = await mutate({
      action: "get",
      path: "attendance",
    });

    let allRecords = getArrFromObj(data || {}) as unknown as Attendance[];

    if (startDate) {
      allRecords = allRecords.filter((record) => record.date >= startDate);
    }

    if (endDate) {
      allRecords = allRecords.filter((record) => record.date <= endDate);
    }

    // Sort by date descending, then by punch in time
    return allRecords.sort((a, b) => {
      if (a.date === b.date) {
        return b.punchInTime - a.punchInTime;
      }
      return b.date.localeCompare(a.date);
    });
  }

  /**
   * Get staff analytics for a period
   */
  async getStaffAnalytics(
    staffId: string,
    period: "week" | "month",
  ): Promise<AttendanceAnalytics> {
    const now = new Date();
    const startDate = new Date();
    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const startDateStr = startDate.toISOString().split("T")[0];
    const records = await this.getByStaffId(staffId, startDateStr);

    const completedRecords = records.filter(
      (record) => record.punchOutTime && record.totalHours,
    );
    const totalHours = completedRecords.reduce(
      (sum, record) => sum + (record.totalHours || 0),
      0,
    );
    const presentDays = new Set(records.map((r) => r.date)).size;
    const totalDays = Math.ceil(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const absentDays = totalDays - presentDays;
    const averageHoursPerDay =
      presentDays > 0 ? Math.round((totalHours / presentDays) * 100) / 100 : 0;

    return {
      totalHours: Math.round(totalHours * 100) / 100,
      totalDays,
      presentDays,
      absentDays,
      averageHoursPerDay,
    };
  }

  /**
   * Get admin analytics for a period
   */
  async getAdminAnalytics(period: "week" | "month"): Promise<AdminAnalytics> {
    const now = new Date();
    const startDate = new Date();
    if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate.setMonth(now.getMonth() - 1);
    }

    const startDateStr = startDate.toISOString().split("T")[0];
    const records = await this.getAll(startDateStr);

    const today = now.toISOString().split("T")[0];
    const todayRecords = records.filter((record) => record.date === today);
    const uniqueStaffIds = new Set(records.map((r) => r.staffId));
    const presentStaffIds = new Set(
      todayRecords.filter((r) => r.status === "present").map((r) => r.staffId),
    );

    const completedRecords = records.filter(
      (record) => record.punchOutTime && record.totalHours,
    );
    const totalHours = completedRecords.reduce(
      (sum, record) => sum + (record.totalHours || 0),
      0,
    );

    const averageHoursPerStaff =
      uniqueStaffIds.size > 0
        ? Math.round((totalHours / uniqueStaffIds.size) * 100) / 100
        : 0;

    return {
      totalStaff: uniqueStaffIds.size,
      presentStaff: presentStaffIds.size,
      absentStaff: uniqueStaffIds.size - presentStaffIds.size,
      averageHoursPerStaff,
      totalHours: Math.round(totalHours * 100) / 100,
    };
  }
}

export const attendanceService = new AttendanceService();
