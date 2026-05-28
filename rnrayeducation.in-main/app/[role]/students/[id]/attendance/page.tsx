"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { studentAttendanceService, studentService } from "@/lib/services";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { Loader2, CheckCircle, XCircle, Clock, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudentAttendance } from "@/lib/types/student-attendance.type";
import type { Student } from "@/lib/types/student.type";
import type { StudentAttendanceAnalytics } from "@/lib/types/student-attendance.type";

const attendanceChartConfig = {
  percentage: {
    label: "Attendance %",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

export default function StudentAttendancePage() {
  const params = useParams();
  const studentId = params.id as string;
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [attendance, setAttendance] = useState<StudentAttendance[]>([]);
  const [analytics, setAnalytics] = useState<StudentAttendanceAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  // Fetch student data
  const { data: studentData } = useFirebaseRealtime<Student>(`students/${studentId}`, {
    asArray: false,
  });

  // Load attendance data
  useEffect(() => {
    async function loadAttendance() {
      if (!studentId) return;

      setIsLoading(true);
      try {
        const start = startOfMonth(selectedMonth);
        const end = endOfMonth(selectedMonth);
        const startStr = format(start, "yyyy-MM-dd");
        const endStr = format(end, "yyyy-MM-dd");

        const [attendanceData, analyticsData] = await Promise.all([
          studentAttendanceService.getByStudentId(studentId, startStr, endStr),
          studentAttendanceService.getStudentAnalytics(studentId),
        ]);

        setAttendance(attendanceData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error("Error loading attendance:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAttendance();
  }, [studentId, selectedMonth]);

  // Extract student - when asArray is false, it returns Record<string, Student> for a single path
  const student = useMemo(() => {
    if (!studentData) return undefined;
    if (Array.isArray(studentData)) return undefined;
    // For a single student path like `students/${studentId}`, Firebase returns the student object directly
    // But TypeScript sees it as Record<string, Student>, so we need to handle both cases
    if (typeof studentData === "object") {
      // Check if it has Student properties (direct object)
      if ("admissionNumber" in studentData) {
        return studentData as unknown as Student;
      }
      // Otherwise it's a Record, get the first value
      const values = Object.values(studentData as Record<string, unknown>);
      return values.length > 0 ? (values[0] as unknown as Student) : undefined;
    }
    return undefined;
  }, [studentData]);

  // Create calendar data
  const calendarData = new Map<string, StudentAttendance>();
  attendance.forEach((a) => {
    calendarData.set(a.date, a);
  });

  const getDayClassName = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const record = calendarData.get(dateStr);

    if (!record) {
      return "";
    }

    if (record.status === "present") {
      return "bg-green-100 hover:bg-green-200 text-green-900";
    } else if (record.status === "absent") {
      return "bg-red-100 hover:bg-red-200 text-red-900";
    } else if (record.status === "late") {
      return "bg-orange-100 hover:bg-orange-200 text-orange-900";
    }

    return "";
  };

  const getDayModifiers = () => {
    const modifiers: Record<string, (date: Date) => boolean> = {};

    attendance.forEach((a) => {
      const date = parseISO(a.date + "T00:00:00");
      const dateStr = format(date, "yyyy-MM-dd");
      modifiers[dateStr] = (d: Date) => isSameDay(d, date);
    });

    return modifiers;
  };

  const getDayModifiersClassNames = () => {
    const classNames: Record<string, string> = {};

    attendance.forEach((a) => {
      const date = parseISO(a.date + "T00:00:00");
      const dateStr = format(date, "yyyy-MM-dd");
      classNames[dateStr] = getDayClassName(date);
    });

    return classNames;
  };

  const selectedDayRecord = selectedDate
    ? calendarData.get(format(selectedDate, "yyyy-MM-dd"))
    : undefined;

  // Prepare chart data
  const chartData = attendance
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((a, index) => ({
      day: index + 1,
      date: format(parseISO(a.date + "T00:00:00"), "MMM dd"),
      present: a.status === "present" ? 1 : 0,
      absent: a.status === "absent" ? 1 : 0,
      late: a.status === "late" ? 1 : 0,
    }));

  if (isLoading && !student) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {student?.fullName || "Student"} - Attendance History
        </h1>
        <p className="text-muted-foreground mt-2">
          View attendance records and statistics
        </p>
      </div>

      {/* Stats Cards */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Days</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalDays}</div>
              <p className="text-xs text-muted-foreground">Days recorded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Present</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics.presentDays}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.presentPercentage}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {analytics.absentDays}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.absentPercentage}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Late</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {analytics.lateDays}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.latePercentage}% of total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overall Attendance */}
      {analytics && (
        <Card>
          <CardHeader>
            <CardTitle>Overall Attendance</CardTitle>
            <CardDescription>Total attendance percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold">{analytics.attendancePercentage}%</div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${analytics.attendancePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar and Details */}
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
            {selectedDayRecord ? (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Status</div>
                  {selectedDayRecord.status === "present" && (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Present
                    </Badge>
                  )}
                  {selectedDayRecord.status === "absent" && (
                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                      <XCircle className="mr-1 h-3 w-3" />
                      Absent
                    </Badge>
                  )}
                  {selectedDayRecord.status === "late" && (
                    <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                      <Clock className="mr-1 h-3 w-3" />
                      Late
                    </Badge>
                  )}
                </div>

                {selectedDayRecord.notes && (
                  <div>
                    <div className="text-sm text-muted-foreground mb-2">Notes</div>
                    <p className="text-sm">{selectedDayRecord.notes}</p>
                  </div>
                )}

                <div>
                  <div className="text-sm text-muted-foreground mb-2">Marked At</div>
                  <p className="text-sm">
                    {format(new Date(selectedDayRecord.markedAt), "PPP 'at' p")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Select a date from the calendar to view details
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendance Trend Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
            <CardDescription>Monthly attendance pattern</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={attendanceChartConfig} className="h-[300px]">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 1]} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="present"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="#22c55e"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-green-100" />
              <span className="text-sm">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-red-100" />
              <span className="text-sm">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-orange-100" />
              <span className="text-sm">Late</span>
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

