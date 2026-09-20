import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type { CashBookDay, CashBookEntry } from "@/lib/types/cash-book.type";

export type CashBookEntryInput = Omit<
  CashBookEntry,
  "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;

class CashBookService {
  async getEntries(): Promise<CashBookEntry[]> {
    const data = await mutate({ action: "get", path: "cashBookEntries" });
    return getArrFromObj(data || {}) as unknown as CashBookEntry[];
  }

  async getEntriesForDate(date: string): Promise<CashBookEntry[]> {
    const all = await this.getEntries();
    return all.filter((e) => e.date === date);
  }

  async createEntry(
    data: CashBookEntryInput,
    actionBy = "admin",
  ): Promise<string> {
    const nowISO = new Date().toISOString();
    return mutate({
      action: "createWithId",
      path: "cashBookEntries",
      data: {
        ...data,
        createdAt: nowISO,
        updatedAt: nowISO,
      },
      actionBy,
    });
  }

  async updateEntry(
    id: string,
    data: Partial<CashBookEntry>,
    actionBy = "admin",
  ): Promise<void> {
    const nowISO = new Date().toISOString();
    await mutate({
      action: "update",
      path: `cashBookEntries/${id}`,
      data: {
        ...data,
        updatedAt: nowISO,
      },
      actionBy,
    });
  }

  async voidEntry(id: string, actionBy = "admin"): Promise<void> {
    await this.updateEntry(id, { voided: true }, actionBy);
  }

  async deleteEntry(id: string, actionBy = "admin"): Promise<void> {
    await mutate({
      action: "delete",
      path: `cashBookEntries/${id}`,
      actionBy,
    });
  }

  async getDay(date: string): Promise<CashBookDay | null> {
    const data = await mutate({
      action: "get",
      path: `cashBookDays/${date}`,
    });
    if (!data) return null;
    return { ...(data as CashBookDay), id: date, date };
  }

  async getAllDays(): Promise<CashBookDay[]> {
    const data = await mutate({ action: "get", path: "cashBookDays" });
    const rows = getArrFromObj(data || {}) as unknown as CashBookDay[];
    return rows.map((d) => ({
      ...d,
      id: d.id || d.date,
      date: d.date || d.id,
    }));
  }

  async upsertDay(
    date: string,
    data: Partial<
      Omit<CashBookDay, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy">
    >,
    actionBy = "admin",
  ): Promise<void> {
    const nowISO = new Date().toISOString();
    const existing = await this.getDay(date);

    if (existing) {
      await mutate({
        action: "update",
        path: `cashBookDays/${date}`,
        data: {
          ...data,
          date,
          updatedAt: nowISO,
        },
        actionBy,
      });
      return;
    }

    await mutate({
      action: "create",
      path: `cashBookDays/${date}`,
      data: {
        date,
        openingCash: data.openingCash ?? 0,
        physicalCashCount: data.physicalCashCount ?? null,
        locked: data.locked ?? false,
        notes: data.notes ?? "",
        createdAt: nowISO,
        updatedAt: nowISO,
        ...data,
      },
      actionBy,
    });
  }

  async lockDay(
    date: string,
    lockedByUid: string,
    lockedByName: string,
    actionBy = "admin",
  ): Promise<void> {
    await this.upsertDay(
      date,
      {
        locked: true,
        lockedAt: new Date().toISOString(),
        lockedByUid,
        lockedByName,
      },
      actionBy,
    );
  }

  async unlockDay(date: string, actionBy = "admin"): Promise<void> {
    await this.upsertDay(
      date,
      {
        locked: false,
        lockedAt: "",
        lockedByUid: "",
        lockedByName: "",
      },
      actionBy,
    );
  }
}

export const cashBookService = new CashBookService();
