"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, CartesianGrid, Pie, PieChart, Cell, XAxis, YAxis, Legend } from "recharts";
import { FeeRecord } from "@/lib/types/fee.type";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

interface FeeChartsProps {
    fees: FeeRecord[];
}

const collectionChartConfig = {
    amount: {
        label: "Collection",
        color: "#10b981",
    },
} satisfies ChartConfig;

const categoryChartConfig = {
    tuition: { label: "Tuition", color: "#3b82f6" },
    transport: { label: "Transport", color: "#10b981" },
    library: { label: "Library", color: "#f59e0b" },
    exam: { label: "Exam", color: "#ef4444" },
    donation: { label: "Donation", color: "#8b5cf6" },
    other: { label: "Other", color: "#6b7280" },
} satisfies ChartConfig;

export function FeeCharts({ fees }: FeeChartsProps) {
    // 1. Calculate Monthly Collection Trend (Last 6 Months)
    const monthlyData = Array.from({ length: 6 }).map((_, i) => {
        const date = subMonths(new Date(), 5 - i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        const monthLabel = format(date, "MMM yyyy");

        const monthlyFees = fees.filter(f => {
            if (!f.paidDate) return false;
            const paidDate = new Date(f.paidDate);
            return isWithinInterval(paidDate, { start: monthStart, end: monthEnd });
        });

        const totalAmount = monthlyFees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);

        return {
            month: monthLabel,
            amount: totalAmount,
        };
    });

    // 2. Calculate Category Distribution
    const categoryCounts = fees.reduce((acc, fee) => {
        const cat = fee.category || "other";
        acc[cat] = (acc[cat] || 0) + (Number(fee.paidAmount) || 0);
        return acc;
    }, {} as Record<string, number>);

    const categoryData = Object.entries(categoryCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
        color: (categoryChartConfig as any)[name]?.color || "#6b7280",
    })).filter(item => item.value > 0);

    return (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Collection Trend */}
            <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold tracking-tight">Collection Trends</CardTitle>
                    <CardDescription className="text-xs font-medium">Monthly fee collections (Last 6 months)</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {monthlyData.some(d => d.amount > 0) ? (
                        <ChartContainer config={collectionChartConfig} className="h-[250px] w-full">
                            <AreaChart
                                data={monthlyData}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="fillCollection" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                                <XAxis
                                    dataKey="month"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                                />
                                <ChartTooltip
                                    content={<ChartTooltipContent indicator="line" />}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    fill="url(#fillCollection)"
                                    dot={{ fill: "#10b981", r: 4, strokeWidth: 2, stroke: "#fff" }}
                                />
                            </AreaChart>
                        </ChartContainer>
                    ) : (
                        <div className="flex h-[250px] items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed text-center p-6">
                            <div>
                                <p className="text-sm font-semibold">No collection data</p>
                                <p className="text-[10px] mt-1 opacity-70">Trends will appear once fees are paid</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-bold tracking-tight">Fee Distribution</CardTitle>
                    <CardDescription className="text-xs font-medium">Collections by category</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                    {categoryData.length > 0 ? (
                        <ChartContainer config={categoryChartConfig} className="h-[250px] w-full">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    innerRadius={50}
                                    paddingAngle={5}
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={4} />
                                    ))}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => (
                                        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ChartContainer>
                    ) : (
                        <div className="flex h-[250px] items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed text-center p-6">
                            <div>
                                <p className="text-sm font-semibold">No distribution data</p>
                                <p className="text-[10px] mt-1 opacity-70">Metrics will appear as collections are made</p>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
