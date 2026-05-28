import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type { TimeTable, TimeTableInput } from "@/lib/types/time-table.type";

class TimeTableService {
    /**
     * Create a new time table
     */
    async create(data: TimeTableInput): Promise<string> {
        const nowISO = new Date().toISOString();

        const timeTableData = {
            ...data,
            createdAt: nowISO,
            updatedAt: nowISO,
        };

        const timeTableId = await mutate({
            action: "createWithId",
            path: "time-tables",
            data: timeTableData,
            actionBy: "admin",
        });

        return timeTableId;
    }

    /**
     * Update an existing time table
     */
    async update(id: string, data: TimeTableInput): Promise<void> {
        const nowISO = new Date().toISOString();

        const updateData = {
            ...data,
            updatedAt: nowISO,
        };

        await mutate({
            action: "update",
            path: `time-tables/${id}`,
            data: updateData,
            actionBy: "admin",
        });
    }

    /**
     * Get all time tables
     */
    async getAll(): Promise<TimeTable[]> {
        const data = await mutate({
            action: "get",
            path: "time-tables",
            actionBy: "admin",
        });

        return getArrFromObj<TimeTable & Record<string, unknown>>(
            (data || {}) as Record<string, TimeTable & Record<string, unknown>>
        );
    }

    /**
     * Get time table by ID
     */
    async getById(id: string): Promise<TimeTable | null> {
        const data = await mutate({
            action: "get",
            path: `time-tables/${id}`,
            actionBy: "admin",
        });

        return data ? { ...data, id } : null;
    }

    /**
     * Delete time table
     */
    async delete(id: string): Promise<void> {
        await mutate({
            action: "delete",
            path: `time-tables/${id}`,
            actionBy: "admin",
        });
    }

    /**
     * Get time tables by class ID
     */
    async getByClassId(classId: string): Promise<TimeTable[]> {
        const all = await this.getAll();
        return all.filter((tt) => tt.classId === classId);
    }

    /**
     * Get time table by class ID and section
     */
    async getByClassAndSection(classId: string, section: string): Promise<TimeTable | null> {
        const all = await this.getAll();
        return all.find((tt) => tt.classId === classId && tt.section === section) || null;
    }
}

export const timeTableService = new TimeTableService();
