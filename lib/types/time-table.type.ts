import type { BaseEntity } from "./common.type";

export type DayOfWeek = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";

export interface TimeTableSlot {
    subjectId: string;
    subjectName: string;
    staffId: string;
    staffName: string;
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    isLunchBreak?: boolean;
    isForceAssigned?: boolean;
}

export interface TimeTableConfig {
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    periodDuration: number; // minutes
    lunchBreakStartTime: string; // HH:mm
    lunchBreakDuration: number; // minutes
    daysOfWeek: DayOfWeek[];
    numberOfPeriods: number;
}

export interface TimeTable extends BaseEntity {
    classId: string;
    className: string;
    section: string;
    academicYear: string;
    config: TimeTableConfig;
    schedule: Record<DayOfWeek, TimeTableSlot[]>;
    note?: string;
}

export interface TimeTableInput {
    classId: string;
    className: string;
    section: string;
    academicYear: string;
    config: TimeTableConfig;
    schedule: Record<DayOfWeek, TimeTableSlot[]>;
    note?: string;
}
