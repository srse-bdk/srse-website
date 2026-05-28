"use client";

import {
  useEffect,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { format, parse, eachDayOfInterval, subDays } from "date-fns";
import { Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { attendanceService } from "@/lib/services";
import type { Attendance } from "@/lib/types/attendance.type";
import { toast } from "sonner";

export interface AdminAttendanceChartsRef {
  refetch: () => void;
}

interface AdminAttendanceChartsProps {
  selectedStaffId: string;
  dateStr: string;
}

export const AdminAttendanceCharts = forwardRef<
  AdminAttendanceChartsRef,
  AdminAttendanceChartsProps
>(({ selectedStaffId, dateStr }, ref) => {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      let data: Attendance[];

      if (selectedStaffId === "all") {
        // Get records for the last 30 days for trend analysis
        const endDate = dateStr || format(new Date(), "yyyy-MM-dd");
        const parsedEndDate = parse(endDate, "yyyy-MM-dd", new Date());
        const startDate = format(subDays(parsedEndDate, 30), "yyyy-MM-dd");
        data = await attendanceService.getAll(startDate, endDate);
      } else {
        data = await attendanceService.getByStaffId(selectedStaffId);
      }

      setRecords(data);
    } catch (error) {
      console.error("Failed to load attendance records:", error);
      toast.error("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  }, [selectedStaffId, dateStr]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  useImperativeHandle(ref, () => ({
    refetch: loadRecords,
  }));

  // Process data for charts
  const processedData = useCallback(() => {
    if (!records.length) return null;

    // 1. Status distribution (Present vs Absent)
    const presentCount = records.filter((r) => r.status === "present").length;
    const absentCount = records.length - presentCount;
    const statusData = [
      { status: "present", count: presentCount, fill: "var(--color-present)" },
      { status: "absent", count: absentCount, fill: "var(--color-absent)" },
    ];

    // 2. Daily attendance trends (last 14 days)
    const endDate = dateStr
      ? parse(dateStr, "yyyy-MM-dd", new Date())
      : new Date();
    const startDate = subDays(endDate, 14);
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const dailyData = days.map((day) => {
      const dayStr = format(day, "yyyy-MM-dd");
      const dayRecords = records.filter((r) => r.date === dayStr);
      const present = dayRecords.filter((r) => r.status === "present").length;
      const absent = dayRecords.filter((r) => r.status === "absent").length;
      const totalHours = dayRecords.reduce(
        (sum, r) => sum + (r.totalHours || 0),
        0,
      );

      return {
        date: dayStr,
        dateLabel: format(day, "MMM dd"),
        present,
        absent,
        totalHours: Math.round(totalHours * 100) / 100,
      };
    });

    // 3. Staff performance (top 10 by hours)
    const staffHoursMap = new Map<string, { name: string; hours: number }>();
    records.forEach((r) => {
      if (r.totalHours) {
        const existing = staffHoursMap.get(r.staffId) || {
          name: r.staffName,
          hours: 0,
        };
        staffHoursMap.set(r.staffId, {
          name: existing.name,
          hours: existing.hours + (r.totalHours || 0),
        });
      }
    });

    const staffPerformanceData = Array.from(staffHoursMap.values())
      .map((staff) => ({
        name:
          staff.name.length > 15
            ? staff.name.substring(0, 15) + "..."
            : staff.name,
        hours: Math.round(staff.hours * 100) / 100,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10);

    // 4. Weekly patterns (by day of week)
    const weeklyMap = new Map<string, { present: number; absent: number }>();
    records.forEach((r) => {
      const dayOfWeek = format(parse(r.date, "yyyy-MM-dd", new Date()), "EEE");
      const existing = weeklyMap.get(dayOfWeek) || { present: 0, absent: 0 };
      if (r.status === "present") {
        existing.present++;
      } else {
        existing.absent++;
      }
      weeklyMap.set(dayOfWeek, existing);
    });

    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weeklyData = dayOrder.map((day) => {
      const data = weeklyMap.get(day) || { present: 0, absent: 0 };
      return {
        day,
        present: data.present,
        absent: data.absent,
      };
    });

    return {
      statusData,
      dailyData,
      staffPerformanceData,
      weeklyData,
    };
  }, [records, dateStr]);

  const chartData = processedData();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Charts</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attendance Charts</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No attendance records found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Distribution & Weekly Patterns */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold tracking-tight">Attendance Status</CardTitle>
            <CardDescription className="text-xs font-medium">Present vs Absent Distribution</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <ChartContainer
              config={{
                present: {
                  label: "Present",
                  color: "#22c55e",
                },
                absent: {
                  label: "Absent",
                  color: "#ef4444",
                },
              }}
              className="mx-auto aspect-square max-h-[250px] sm:max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={chartData.statusData}
                  dataKey="count"
                  nameKey="status"
                  innerRadius={60}
                  outerRadius={80}
                  strokeWidth={5}
                  stroke="var(--background)"
                />
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      const total = chartData.statusData.reduce(
                        (sum, item) => sum + item.count,
                        0,
                      );
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy}
                            className="fill-foreground text-2xl sm:text-3xl font-bold"
                          >
                            {total}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 20}
                            className="fill-muted-foreground text-[10px] sm:text-xs font-medium"
                          >
                            Total Records
                          </tspan>
                        </text>
                      );
                    }
                  }}
                />
                <ChartLegend
                  content={<ChartLegendContent nameKey="status" />}
                  className="flex-wrap gap-2 text-[10px] sm:text-xs font-semibold"
                />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold tracking-tight">Weekly Patterns</CardTitle>
            <CardDescription className="text-xs font-medium">Attendance by Day of Week</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer
              config={{
                present: {
                  label: "Present",
                  color: "#22c55e",
                },
                absent: {
                  label: "Absent",
                  color: "#ef4444",
                },
              }}
              className="min-h-[250px] sm:min-h-[300px] w-full"
            >
              <BarChart data={chartData.weeklyData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="present"
                  stackId="a"
                  fill="var(--color-present)"
                  radius={[0, 0, 0, 0]}
                  barSize={window.innerWidth < 640 ? 15 : 25}
                />
                <Bar
                  dataKey="absent"
                  stackId="a"
                  fill="var(--color-absent)"
                  radius={[4, 4, 0, 0]}
                  barSize={window.innerWidth < 640 ? 15 : 25}
                />
                <ChartLegend content={<ChartLegendContent />} className="text-[10px] sm:text-xs font-semibold" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Daily Trends - Area Chart */}
      <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md transition-all duration-300 hover:shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-bold tracking-tight">Daily Attendance Trends</CardTitle>
          <CardDescription className="text-xs font-medium">Last 14 days attendance overview</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ChartContainer
            config={{
              present: {
                label: "Present",
                color: "#22c55e",
              },
              absent: {
                label: "Absent",
                color: "#ef4444",
              },
            }}
            className="aspect-auto h-[250px] sm:h-[300px] w-full"
          >
            <AreaChart data={chartData.dailyData} margin={{ left: -20, right: 10 }}>
              <defs>
                <linearGradient id="fillPresent" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-present)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-present)"
                    stopOpacity={0}
                  />
                </linearGradient>
                <linearGradient id="fillAbsent" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-absent)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-absent)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="dateLabel"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={24}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Area
                dataKey="present"
                type="monotone"
                fill="url(#fillPresent)"
                stroke="var(--color-present)"
                strokeWidth={2}
                stackId="a"
              />
              <Area
                dataKey="absent"
                type="monotone"
                fill="url(#fillAbsent)"
                stroke="var(--color-absent)"
                strokeWidth={2}
                stackId="a"
              />
              <ChartLegend content={<ChartLegendContent />} className="text-[10px] sm:text-xs font-semibold" />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Staff Performance & Hours Worked */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold tracking-tight">Top Performers</CardTitle>
            <CardDescription className="text-xs font-medium">Total hours worked by staff</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {chartData.staffPerformanceData.length > 0 ? (
              <ChartContainer
                config={{
                  hours: {
                    label: "Hours",
                    color: "#3b82f6",
                  },
                }}
                className="min-h-[250px] sm:min-h-[300px] w-full"
              >
                <BarChart
                  accessibilityLayer
                  data={chartData.staffPerformanceData}
                  layout="vertical"
                  margin={{
                    left: -10,
                    right: 20
                  }}
                >
                  <XAxis type="number" dataKey="hours" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    tickMargin={10}
                    axisLine={false}
                    width={80}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Bar
                    dataKey="hours"
                    fill="#3b82f6"
                    radius={5}
                    barSize={15}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                <p className="text-xs font-medium">No completed records found</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold tracking-tight">Hours Worked</CardTitle>
            <CardDescription className="text-xs font-medium">
              Total hours per day (last 14 days)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <ChartContainer
              config={{
                totalHours: {
                  label: "Total Hours",
                  color: "#3b82f6",
                },
              }}
              className="min-h-[250px] sm:min-h-[300px] w-full"
            >
              <BarChart data={chartData.dailyData} margin={{ left: -20, right: 10 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis
                  dataKey="dateLabel"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={24}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar
                  dataKey="totalHours"
                  fill="#3b82f6"
                  radius={4}
                  barSize={15}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

AdminAttendanceCharts.displayName = "AdminAttendanceCharts";
