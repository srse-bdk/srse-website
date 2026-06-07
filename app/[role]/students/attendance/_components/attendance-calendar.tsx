"use client";

import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Autocomplete, type AutocompleteOption } from "@/components/core/autocomplete";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { studentAttendanceService } from "@/lib/services";
import type { StudentAttendance } from "@/lib/types/student-attendance.type";
import type { Class } from "@/lib/types/class.type";
import type { Enrollment } from "@/lib/types/enrollment.type";
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

interface CalendarDay {
  date: Date;
  present: number;
  absent: number;
  late: number;
  total: number;
}

export function AttendanceCalendar() {
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [calendarData, setCalendarData] = useState<Map<string, CalendarDay>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch data
  const { data: classesData } = useFirebaseRealtime<Class>("classes", {
    asArray: true,
  });
  const { data: enrollmentsData } = useFirebaseRealtime<Enrollment>("enrollments", {
    asArray: true,
  });

  const classes = (classesData as Class[]) || [];
  const enrollments = (enrollmentsData as Enrollment[]) || [];

  // Get students for selected class/section
  const studentsInClass = enrollments
    .filter(
      (e) =>
        e.classId === selectedClassId &&
        e.section === selectedSection &&
        e.status === "active",
    )
    .map((e) => e.studentId);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = selectedClass?.sections || [];

  // Prepare options for autocomplete
  const classOptions: AutocompleteOption[] = classes
    .filter((c) => c.status === "active")
    .map((c) => ({
      value: c.id,
      label: c.name,
    }));

  const sectionOptions: AutocompleteOption[] = useMemo(
    () =>
      availableSections.map((section) => ({
        value: section,
        label: `Section ${section}`,
      })),
    [availableSections],
  );

  const studentOptions: AutocompleteOption[] = useMemo(
    () =>
      studentsInClass.map((studentId) => {
        const enrollment = enrollments.find(
          (e) => e.studentId === studentId && e.classId === selectedClassId,
        );
        return {
          value: studentId,
          label: enrollment?.rollNumber || studentId,
        };
      }),
    [studentsInClass, enrollments, selectedClassId],
  );

  // Load calendar data
  useEffect(() => {
    async function loadCalendarData() {
      if (!selectedClassId || !selectedSection) {
        setCalendarData(new Map());
        return;
      }

      setIsLoading(true);
      try {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(end, "yyyy-MM-dd");

        let attendance: StudentAttendance[] = [];

        if (selectedStudentId) {
          attendance = await studentAttendanceService.getByStudentId(
            selectedStudentId,
            startStr,
            endStr,
          );
        } else {
          attendance = await studentAttendanceService.getByDateRange(
            startStr,
            endStr,
            selectedClassId,
            selectedSection,
          );
        }

        // Group by date
        const dataMap = new Map<string, CalendarDay>();
        const days = eachDayOfInterval({ start, end });

        days.forEach((day) => {
          const dayStr = format(day, "yyyy-MM-dd");
          dataMap.set(dayStr, {
            date: day,
            present: 0,
            absent: 0,
            late: 0,
            total: 0,
          });
        });

        attendance.forEach((a) => {
          const day = dataMap.get(a.date);
          if (day) {
            if (a.status === "present") day.present++;
            if (a.status === "absent") day.absent++;
            if (a.status === "late") day.late++;
            day.total++;
          }
        });

        setCalendarData(dataMap);
      } catch (error) {
        console.error("Error loading calendar data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadCalendarData();
  }, [selectedMonth, selectedClassId, selectedSection, selectedStudentId]);

  const getDayClassName = (date: Date) => {
    const dayStr = format(date, "yyyy-MM-dd");
    const day = calendarData.get(dayStr);

    if (!day || day.total === 0) {
      return "";
    }

    // Calculate percentage
    const total = day.present + day.absent + day.late;
    if (total === 0) return "";

    const presentPercentage = (day.present / total) * 100;

    if (presentPercentage >= 80) {
      return "bg-green-100 hover:bg-green-200 text-green-900";
    } else if (presentPercentage >= 50) {
      return "bg-orange-100 hover:bg-orange-200 text-orange-900";
    } else {
      return "bg-red-100 hover:bg-red-200 text-red-900";
    }
  };

  const getDayModifiers = () => {
    const modifiers: Record<string, (date: Date) => boolean> = {};

    calendarData.forEach((day, dateStr) => {
      modifiers[dateStr] = (date: Date) => isSameDay(date, day.date);
    });

    return modifiers;
  };

  const getDayModifiersClassNames = () => {
    const classNames: Record<string, string> = {};

    calendarData.forEach((day, dateStr) => {
      classNames[dateStr] = getDayClassName(day.date);
    });

    return classNames;
  };

  const selectedDayData = selectedDate
    ? calendarData.get(format(selectedDate, "yyyy-MM-dd"))
    : null;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Select class, section, and optionally a specific student
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Autocomplete
                options={classOptions}
                value={selectedClassId}
                onChange={setSelectedClassId}
                placeholder="Select class"
                emptyMessage="No classes found"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Autocomplete
                options={sectionOptions}
                value={selectedSection}
                onChange={setSelectedSection}
                placeholder="Select section"
                emptyMessage="No sections found"
                disabled={!selectedClassId}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Student (Optional)</label>
              <Autocomplete
                options={[
                  { value: "all", label: "All students" },
                  ...studentOptions,
                ]}
                value={selectedStudentId || "all"}
                onChange={(value) => setSelectedStudentId(value === "all" ? "" : value)}
                placeholder="All students"
                emptyMessage="No students found"
                disabled={!selectedClassId || !selectedSection}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Calendar</CardTitle>
            <CardDescription>
              {format(selectedMonth, "MMMM yyyy")} - Click on a date to view details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                className="rounded-md border"
                modifiers={getDayModifiers()}
                modifiersClassNames={{
                  selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                  ...getDayModifiersClassNames(),
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Selected Date Details */}
        <Card>
          <CardHeader>
            <CardTitle>Date Details</CardTitle>
            <CardDescription>
              {selectedDate
                ? format(selectedDate, "EEEE, MMMM d, yyyy")
                : "Select a date to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDayData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {selectedDayData.present}
                    </div>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {selectedDayData.absent}
                    </div>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedDayData.late}
                    </div>
                    <p className="text-xs text-muted-foreground">Late</p>
                  </div>
                </div>

                {selectedDayData.total > 0 && (
                  <div className="pt-4 border-t">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Total Students</span>
                        <span className="font-medium">{selectedDayData.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Attendance Rate</span>
                        <span className="font-medium">
                          {Math.round(
                            ((selectedDayData.present + selectedDayData.late) /
                              selectedDayData.total) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedDayData.total === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance data for this date
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a date from the calendar to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-100" />
              <span className="text-sm">80%+ Present (Good)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-orange-100" />
              <span className="text-sm">50-79% Present (Moderate)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-100" />
              <span className="text-sm">Below 50% Present (Low)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded border" />
              <span className="text-sm">No Data</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

