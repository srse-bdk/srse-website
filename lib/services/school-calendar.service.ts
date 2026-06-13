import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  SchoolCalendarEntry,
  SchoolCalendarEntryInput,
  SchoolCalendarSettings,
} from "@/lib/types/leave.type";
import {
  getDefaultSchoolCalendarSettings,
  getHolidayReasonForDate,
  isSchoolHoliday,
} from "@/lib/utils/school-calendar";

const SETTINGS_PATH = "schoolCalendarSettings/default";

class SchoolCalendarService {
  async getSettings(): Promise<SchoolCalendarSettings> {
    const data = await mutate({ action: "get", path: SETTINGS_PATH });
    if (!data) return getDefaultSchoolCalendarSettings();
    return { ...getDefaultSchoolCalendarSettings(), ...(data as SchoolCalendarSettings) };
  }

  async updateSettings(
    settings: Partial<SchoolCalendarSettings>,
    actionBy = "admin",
  ): Promise<void> {
    await this.ensureSettings(actionBy);
    const current = await this.getSettings();
    await mutate({
      action: "update",
      path: SETTINGS_PATH,
      data: {
        ...current,
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      actionBy,
    });
  }

  async ensureSettings(actionBy = "admin"): Promise<void> {
    const data = await mutate({ action: "get", path: SETTINGS_PATH });
    if (data) return;
    await mutate({
      action: "create",
      path: SETTINGS_PATH,
      data: {
        ...getDefaultSchoolCalendarSettings(),
        updatedAt: new Date().toISOString(),
      },
      actionBy,
    });
  }

  async getAllEntries(): Promise<SchoolCalendarEntry[]> {
    const data = await mutate({ action: "get", path: "schoolCalendar" });
    const entries = getArrFromObj(data || {}) as unknown as SchoolCalendarEntry[];
    return entries.sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  async getActiveEntries(): Promise<SchoolCalendarEntry[]> {
    const all = await this.getAllEntries();
    return all.filter((entry) => entry.isActive !== false);
  }

  async createEntry(
    data: SchoolCalendarEntryInput,
    actionBy = "admin",
  ): Promise<string> {
    const nowISO = new Date().toISOString();
    return mutate({
      action: "createWithId",
      path: "schoolCalendar",
      data: {
        ...data,
        isActive: data.isActive ?? true,
        createdAt: nowISO,
        updatedAt: nowISO,
      },
      actionBy,
    });
  }

  async updateEntry(
    id: string,
    data: Partial<SchoolCalendarEntryInput>,
    actionBy = "admin",
  ): Promise<void> {
    await mutate({
      action: "update",
      path: `schoolCalendar/${id}`,
      data: { ...data, updatedAt: new Date().toISOString() },
      actionBy,
    });
  }

  async deleteEntry(id: string, actionBy = "admin"): Promise<void> {
    await mutate({
      action: "delete",
      path: `schoolCalendar/${id}`,
      actionBy,
    });
  }

  async isHoliday(dateStr: string): Promise<boolean> {
    const [settings, entries] = await Promise.all([
      this.getSettings(),
      this.getActiveEntries(),
    ]);
    return isSchoolHoliday(dateStr, settings, entries);
  }

  async getHolidayReason(dateStr: string): Promise<string | null> {
    const [settings, entries] = await Promise.all([
      this.getSettings(),
      this.getActiveEntries(),
    ]);
    return getHolidayReasonForDate(dateStr, settings, entries);
  }
}

export const schoolCalendarService = new SchoolCalendarService();
