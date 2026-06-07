"use client";

import { useState, useEffect, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Autocomplete, type AutocompleteOption } from "@/components/core/autocomplete";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { studentAttendanceService } from "@/lib/services";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { Loader2 } from "lucide-react";
import type { Class } from "@/lib/types/class.type";
import type { MonthlyAttendanceReport } from "@/lib/types/student-attendance.type";

const attendanceChartConfig = {
  present: {
    label: "Present",
    color: "#22c55e",
  },
  absent: {
    label: "Absent",
    color: "#ef4444",
  },
  late: {
    label: "Late",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

const percentageChartConfig = {
  attendance: {
    label: "Attendance %",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

const COLORS = ["#22c55e", "#ef4444", "#f59e0b"];

export function AttendanceReports() {
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    format(new Date(), "yyyy-MM"),
  );
  const [dailyData, setDailyData] = useState<Array<{ date: string; present: number; absent: number; late: number; total: number; percentage: number }>>([]);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyAttendanceReport | null>(null);
  const [classComparison, setClassComparison] = useState<Array<{ className: string; present: number; absent: number; late: number; total: number; percentage: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch classes
  const { data: classesData } = useFirebaseRealtime<Class>("classes", {
    asArray: true,
  });
  const classes = useMemo(() => (classesData as Class[]) || [], [classesData]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = selectedClass?.sections || [];

  // Prepare options for autocomplete
  const classOptions: AutocompleteOption[] = classes
    .filter((c) => c.status === "active")
    .map((c) => ({
      value: c.id,
      label: c.name,
    }));

  const sectionOptions: AutocompleteOption[] = availableSections.map((section) => ({
    value: section,
    label: `Section ${section}`,
  }));

  // Generate month options
  const monthOptions: AutocompleteOption[] = [];
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthValue = format(date, "yyyy-MM");
    monthOptions.push({
      value: monthValue,
      label: format(parseISO(`${monthValue}-01`), "MMMM yyyy"),
    });
  }

  // Load daily summary
  useEffect(() => {
    async function loadDailySummary() {
      setIsLoading(true);
      try {
        const endDate = new Date();
        const startDate = subDays(endDate, 14);
        const startStr = format(startDate, "yyyy-MM-dd");
        const endStr = format(endDate, "yyyy-MM-dd");

        const attendance = await studentAttendanceService.getByDateRange(
          startStr,
          endStr,
          selectedClassId || undefined,
          selectedSection || undefined,
        );

        // Group by date
        const dailyMap = new Map<string, { present: number; absent: number; late: number; total: number }>();

        attendance.forEach((a) => {
          const existing = dailyMap.get(a.date) || { present: 0, absent: 0, late: 0, total: 0 };
          if (a.status === "present") existing.present++;
          if (a.status === "absent") existing.absent++;
          if (a.status === "late") existing.late++;
          existing.total++;
          dailyMap.set(a.date, existing);
        });

        const daily = Array.from(dailyMap.entries())
          .map(([date, stats]) => ({
            date: format(parseISO(date), "MMM dd"),
            dateKey: date,
            present: stats.present,
            absent: stats.absent,
            late: stats.late,
            total: stats.total,
            percentage: stats.total > 0
              ? Math.round(((stats.present + stats.late) / stats.total) * 100)
              : 0,
          }))
          .sort((a, b) => a.dateKey.localeCompare(b.dateKey));

        setDailyData(daily);
      } catch (error) {
        console.error("Error loading daily summary:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDailySummary();
  }, [selectedClassId, selectedSection]);

  // Load monthly report
  useEffect(() => {
    async function loadMonthlyReport() {
      if (!selectedMonth) return;

      setIsLoading(true);
      try {
        const report = await studentAttendanceService.getMonthlyReport(
          selectedMonth,
          selectedClassId || undefined,
          selectedSection || undefined,
        );
        setMonthlyReport(report);
      } catch (error) {
        console.error("Error loading monthly report:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadMonthlyReport();
  }, [selectedMonth, selectedClassId, selectedSection]);

  // Create stable key for classes dependency
  const classesKey = useMemo(
    () => classes.map((c) => `${c.id}-${c.status}`).join(","),
    [classes],
  );

  // Load class comparison
  useEffect(() => {
    async function loadClassComparison() {
      setIsLoading(true);
      try {
        const today = format(new Date(), "yyyy-MM-dd");
        const comparison: Array<{ className: string; present: number; absent: number; late: number; total: number; percentage: number }> = [];

        for (const classData of classes.filter((c) => c.status === "active")) {
          for (const section of classData.sections) {
            const stats = await studentAttendanceService.getClassStats(
              today,
              classData.id,
              section,
            );

            comparison.push({
              className: `${classData.name} - ${section}`,
              present: stats.presentCount,
              absent: stats.absentCount,
              late: stats.lateCount,
              total: stats.totalStudents,
              percentage: stats.attendancePercentage,
            });
          }
        }

        setClassComparison(comparison);
      } catch (error) {
        console.error("Error loading class comparison:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadClassComparison();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classesKey]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
          <CardDescription>Select filters for attendance reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Autocomplete
                options={[
                  { value: "all", label: "All classes" },
                  ...classOptions,
                ]}
                value={selectedClassId || "all"}
                onChange={(value) => setSelectedClassId(value === "all" ? "" : value)}
                placeholder="All classes"
                emptyMessage="No classes found"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Autocomplete
                options={[
                  { value: "all", label: "All sections" },
                  ...sectionOptions,
                ]}
                value={selectedSection || "all"}
                onChange={(value) => setSelectedSection(value === "all" ? "" : value)}
                placeholder="All sections"
                emptyMessage="No sections found"
                disabled={!selectedClassId}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Autocomplete
                options={monthOptions}
                value={selectedMonth}
                onChange={setSelectedMonth}
                placeholder="Select month"
                emptyMessage="No months available"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="daily" className="space-y-4">
        <TabsList>
          <TabsTrigger value="daily">Daily Summary</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Report</TabsTrigger>
          <TabsTrigger value="comparison">Class Comparison</TabsTrigger>
        </TabsList>

        {/* Daily Summary */}
        <TabsContent value="daily" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Daily Attendance Trends</CardTitle>
                <CardDescription>Last 14 days attendance overview</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : dailyData.length > 0 ? (
                  <ChartContainer config={attendanceChartConfig} className="h-[300px]">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="present" fill="var(--color-present)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="absent" fill="var(--color-absent)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="late" fill="var(--color-late)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Attendance Percentage</CardTitle>
                <CardDescription>Daily attendance percentage trend</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-[300px]">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : dailyData.length > 0 ? (
                  <ChartContainer config={percentageChartConfig} className="h-[300px]">
                    <AreaChart data={dailyData}>
                      <defs>
                        <linearGradient id="fillPercentage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} />
                      <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area
                        type="monotone"
                        dataKey="percentage"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        fill="url(#fillPercentage)"
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Monthly Report */}
        <TabsContent value="monthly" className="space-y-4">
          {isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin" />
              </CardContent>
            </Card>
          ) : monthlyReport ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Summary</CardTitle>
                  <CardDescription>
                    {format(parseISO(`${selectedMonth}-01`), "MMMM yyyy")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {monthlyReport.presentDays}
                        </div>
                        <p className="text-xs text-muted-foreground">Present Days</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {monthlyReport.absentDays}
                        </div>
                        <p className="text-xs text-muted-foreground">Absent Days</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-600">
                          {monthlyReport.lateDays}
                        </div>
                        <p className="text-xs text-muted-foreground">Late Days</p>
                      </div>
                      <div>
                        <div className="text-2xl font-bold">
                          {monthlyReport.attendancePercentage}%
                        </div>
                        <p className="text-xs text-muted-foreground">Attendance Rate</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Breakdown</CardTitle>
                  <CardDescription>Daily attendance for the month</CardDescription>
                </CardHeader>
                <CardContent>
                  {monthlyReport.dailyStats.length > 0 ? (
                    <ChartContainer config={attendanceChartConfig} className="h-[300px]">
                      <AreaChart data={monthlyReport.dailyStats}>
                        <defs>
                          <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="fillAbsent" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => format(parseISO(value), "dd")}
                        />
                        <YAxis tickLine={false} axisLine={false} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="present"
                          stackId="1"
                          stroke="#22c55e"
                          fill="url(#fillPresent)"
                        />
                        <Area
                          type="monotone"
                          dataKey="absent"
                          stackId="1"
                          stroke="#ef4444"
                          fill="url(#fillAbsent)"
                        />
                        <Area
                          type="monotone"
                          dataKey="late"
                          stackId="1"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.6}
                        />
                      </AreaChart>
                    </ChartContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
                No monthly report data available
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Class Comparison */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Class Comparison</CardTitle>
              <CardDescription>Today's attendance across all classes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : classComparison.length > 0 ? (
                <ChartContainer config={percentageChartConfig} className="h-[400px]">
                  <BarChart data={classComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis
                      dataKey="className"
                      type="category"
                      width={150}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="percentage" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  No comparison data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

