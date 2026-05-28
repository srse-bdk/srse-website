"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Download, Calendar, Printer, ArrowLeft, Clock, MapPin, Users, BookOpen, ChevronLeft, Layout, Sparkles, Building2, GraduationCap, Loader2 } from "lucide-react";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { TimeTable, DayOfWeek, TimeTableSlot } from "@/lib/types/time-table.type";
import type { User } from "@/lib/types/user.type";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { TimeTablePrintView } from "@/components/time-table/print-view";

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Extending TimeTableSlot to include class info for the staff view
interface StaffTimeTableSlot extends TimeTableSlot {
  className: string;
  section: string;
}

export default function StaffTimeTablePage() {
    const params = useParams();
    const router = useRouter();
    const printRef = useRef<HTMLDivElement>(null);
    const id = params.id as string;
    const role = params.role as string;
    const searchParams = useSearchParams();

    // Fetch the staff details
    const { data: staffData, loading: staffLoading } = useFirebaseRealtime<User>(`users/${id}`, {
        asArray: false
    });
    const staff = staffData as unknown as User | null;

    // Fetch all timetables to extract staff's schedule
    const { data: timeTablesData, loading: ttLoading } = useFirebaseRealtime<TimeTable>("time-tables", {
        asArray: true
    });
    const allTimeTables = (timeTablesData as TimeTable[]) || [];

    const loading = staffLoading || ttLoading;

    // Process and aggregate the timetable for the specific staff
    const staffTimeTable = useMemo(() => {
        if (!allTimeTables.length) return null;

        // Determine max periods across all active timetables based on actual schedule array lengths
        let maxPeriods = 0;
        allTimeTables.forEach(tt => {
            DAYS.forEach(day => {
                if (tt.schedule && tt.schedule[day] && tt.schedule[day].length > maxPeriods) {
                    maxPeriods = tt.schedule[day].length;
                }
            });
        });

        // Initialize with empty arrays of maxPeriods length
        const combinedSchedule: Record<DayOfWeek, StaffTimeTableSlot[][]> = {
            Monday: Array.from({ length: maxPeriods }, () => []),
            Tuesday: Array.from({ length: maxPeriods }, () => []),
            Wednesday: Array.from({ length: maxPeriods }, () => []),
            Thursday: Array.from({ length: maxPeriods }, () => []),
            Friday: Array.from({ length: maxPeriods }, () => []),
            Saturday: Array.from({ length: maxPeriods }, () => []),
            Sunday: Array.from({ length: maxPeriods }, () => [])
        };

        let foundSlots = false;

        allTimeTables.forEach(tt => {
            DAYS.forEach(day => {
                if (tt.schedule && tt.schedule[day]) {
                    tt.schedule[day].forEach((slot, idx) => {
                        // For lunch break, preserve it at the correct index for all schedules
                        if (slot.isLunchBreak) {
                            if (!combinedSchedule[day][idx].some(s => s.isLunchBreak)) {
                                combinedSchedule[day][idx].push({ 
                                    ...slot, 
                                    className: "Lunch Break", 
                                    section: "" 
                                });
                            }
                        } else if (slot.staffId === id) {
                            foundSlots = true;
                            combinedSchedule[day][idx].push({
                                ...slot,
                                className: tt.className,
                                section: tt.section
                            });
                        }
                    });
                }
            });
        });

        if (!foundSlots) return null;

        // We use the first timetable's config as a baseline for the UI components like start/end times if needed, 
        // though staff times might span differently.
        const baseConfig = allTimeTables[0]?.config;

        return {
            schedule: combinedSchedule,
            config: baseConfig,
            numberOfPeriods: maxPeriods
        };
    }, [allTimeTables, id]);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `TimeTable_Staff_${staff?.name || "Unknown"}`,
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!staff) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl font-bold">Staff not found</h2>
                <Button onClick={() => router.push(`/${role}/staffs`)} className="mt-4">
                    Go Back
                </Button>
            </div>
        );
    }

    if (!staffTimeTable) {
        return (
            <div className="container mx-auto p-4 sm:p-8 space-y-8 max-w-[1400px]">
               <div className="flex items-center gap-4 mb-8">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/${role}/staffs`)} className="rounded-full hover:bg-muted">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-extrabold tracking-tight capitalize">
                            {staff.name}'s Timetable
                        </h1>
                    </div>
                </div>
                <Card className="border-dashed h-[400px] flex items-center justify-center">
                    <CardContent className="flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
                            <Calendar className="h-10 w-10 text-primary opacity-20" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">No Classes Assigned</h3>
                            <p className="text-muted-foreground max-w-sm">
                                This staff member is not assigned to any classes in the active timetables.
                            </p>
                        </div>
                        <Button onClick={() => router.push(`/${role}/staffs`)} variant="outline" className="mt-4 gap-2">
                            Go Back
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Determine the maximum number of slots in a day to render rows correctly
    let maxSlots = staffTimeTable.numberOfPeriods || 0;

    return (
        <div className="container mx-auto p-4 sm:p-8 space-y-8 max-w-[1400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push(`/${role}/staffs`)} className="rounded-full hover:bg-muted">
                        <ChevronLeft className="h-6 w-6" />
                    </Button>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors uppercase font-bold tracking-widest text-[10px]">Staff Schedule</Badge>
                        </div>
                        <h1 className="text-3xl font-extrabold tracking-tight capitalize">
                            {staff.name}'s Timetable
                        </h1>
                    </div>
                </div>
                {/* <div className="flex items-center gap-3">
                    <Button onClick={handlePrint} className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
                        <Download className="h-4 w-4" />
                        Download PDF
                    </Button>
                </div> */}
            </div>

            {/* Main Table Preview (Screen View) */}
            <Card className="shadow-2xl border-primary/10 bg-background/50 backdrop-blur-md overflow-hidden ring-1 ring-border/5">
                <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pb-6">
                    <div className="flex flex-wrap items-center gap-6">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold">{staff.email}</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted/30">
                                <th className="p-4 border-r text-left text-xs font-bold uppercase tracking-widest text-muted-foreground w-40">Slot</th>
                                {DAYS.map(day => (
                                    <th key={day} className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[180px]">
                                        {day}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {Array.from({ length: maxSlots }).map((_, rowIdx) => {
                                // Determine if this row index is a lunch break in the base configuration
                                const isLunchRow = staffTimeTable.schedule[DAYS[0]]?.[rowIdx]?.some(s => s.isLunchBreak);
                                // Count how many classes are before this row to calculate the teaching period number
                                let periodNumber = rowIdx + 1;
                                if (isLunchRow) {
                                    // It's a break
                                } else {
                                    // Count non-lunch rows before this one
                                    let nonLunchCount = 0;
                                    for (let i = 0; i <= rowIdx; i++) {
                                        if (!staffTimeTable.schedule[DAYS[0]]?.[i]?.some(s => s.isLunchBreak)) {
                                            nonLunchCount++;
                                        }
                                    }
                                    periodNumber = nonLunchCount;
                                }

                                return (
                                <tr key={rowIdx} className="border-t group transition-colors hover:bg-primary/[0.02]">
                                    <td className="p-4 border-r bg-muted/10">
                                        <div className="flex flex-col gap-1">
                                            {isLunchRow ? (
                                                <span className="text-sm font-bold text-orange-600">Break</span>
                                            ) : (
                                                <span className="text-sm font-bold text-primary">Period {periodNumber}</span>
                                            )}
                                        </div>
                                    </td>
                                    {DAYS.map(day => {
                                        const slotArray = staffTimeTable.schedule[day][rowIdx] || [];
                                        const isLunch = slotArray.some(s => s.isLunchBreak);

                                        return (
                                            <td key={`${day}-${rowIdx}`} className="p-4 align-top">
                                                {slotArray.length > 0 ? (
                                                    isLunch ? (
                                                        <div className="py-3 px-4 rounded-xl bg-orange-100/20 border border-orange-200/30 text-orange-700 font-bold text-[10px] uppercase tracking-widest text-center">
                                                            Lunch Break
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col gap-3 h-full">
                                                            {slotArray.map((slot, sIdx) => (
                                                                <div key={sIdx} className={cn(
                                                                    "p-4 rounded-2xl border transition-all duration-300 flex flex-col justify-center",
                                                                    "bg-card border-primary/10 shadow-sm hover:shadow-md hover:border-primary/20",
                                                                    // slot.isForceAssigned && "border-red-500/30 bg-red-50/30 shadow-red-500/10"
                                                                )}>
                                                                    <div className="space-y-2">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="text-sm font-extrabold leading-tight text-foreground/90">{slot.subjectName}</div>
                                                                            {/* {slot.isForceAssigned && (
                                                                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-red-500/50 text-red-600 font-bold bg-background leading-[14px]">FORCED</Badge>
                                                                            )} */}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/70">
                                                                            <Building2 className="h-2.5 w-2.5" />
                                                                            {slot.className} - {slot.section}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                                                                            <Clock className="h-3 w-3" />
                                                                            {slot.startTime} - {slot.endTime}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )
                                                ) : (
                                                    <div className="p-4 rounded-2xl border transition-all duration-300 h-full flex flex-col justify-center bg-muted/20 border-border/50 border-dashed opacity-40">
                                                        <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase text-center">Free Period</span>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Printable Component (Hidden from screen) */}
            {/* <div className="absolute top-[-9999px] left-[-9999px] pointer-events-none">
                <TimeTablePrintView ref={printRef} timeTable={timeTable} />
            </div> */}
        </div>
    );
}
