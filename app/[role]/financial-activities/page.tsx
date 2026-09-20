"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { CashBookEntry, CashBookMode } from "@/lib/types/cash-book.type";
import {
  CASH_BOOK_MODE_LABELS,
  getCashBookCategoryLabel,
} from "@/lib/types/cash-book.type";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Landmark,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const summaryChartConfig = {
  income: { label: "Income", color: "#10b981" },
  expense: { label: "Expense", color: "#ef4444" },
} satisfies ChartConfig;

const palette = [
  "#0ea5e9",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#6366f1",
];

const toDisplayDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function FinancialOverviewPage() {
  const params = useParams();
  const role = params.role as string;

  const defaultStartDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  }, []);
  const defaultEndDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const { data: entriesData, loading } = useFirebaseRealtime<CashBookEntry>(
    "cashBookEntries",
    { asArray: true },
  );

  const filtered = useMemo(() => {
    const rows = ((entriesData as CashBookEntry[]) || []).filter((e) => !e.voided);
    return rows
      .filter((entry) => {
        const matchesStart = !startDate || entry.date >= startDate;
        const matchesEnd = !endDate || entry.date <= endDate;
        return matchesStart && matchesEnd;
      })
      .sort((a, b) => {
        const dateDiff = b.date.localeCompare(a.date);
        if (dateDiff !== 0) return dateDiff;
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });
  }, [entriesData, startDate, endDate]);

  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    const byMode: Record<CashBookMode, number> = { C: 0, U: 0, B: 0, Q: 0 };

    for (const entry of filtered) {
      const amount = Number(entry.amount) || 0;
      if (entry.type === "income") {
        income += amount;
        byMode[entry.mode] += amount;
      } else {
        expenses += amount;
      }
    }

    return {
      income,
      expenses,
      netBalance: income - expenses,
      byMode,
      count: filtered.length,
    };
  }, [filtered]);

  const monthlyData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (start > end) return [];

    const buckets: {
      month: string;
      key: string;
      income: number;
      expense: number;
    }[] = [];

    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const limit = new Date(end.getFullYear(), end.getMonth(), 1);

    while (cursor <= limit) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      buckets.push({
        month: cursor.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        }),
        key,
        income: 0,
        expense: 0,
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    filtered.forEach((txn) => {
      const key = txn.date.slice(0, 7);
      const bucket = buckets.find((item) => item.key === key);
      if (!bucket) return;
      const amount = Number(txn.amount) || 0;
      if (txn.type === "income") bucket.income += amount;
      else bucket.expense += amount;
    });

    return buckets;
  }, [filtered, startDate, endDate]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((txn) => {
      const label = getCashBookCategoryLabel(txn.categoryCode);
      const amount = Number(txn.amount) || 0;
      map.set(label, (map.get(label) || 0) + amount);
    });

    return [...map.entries()]
      .map(([name, value], index) => ({
        name,
        value,
        fill: palette[index % palette.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filtered]);

  const recentActivities = filtered.slice(0, 10);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Financial Overview
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overall financial status for a date range — totals, charts, and
            recent activity from the cash book.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${role}/income-expenses`}>View statement</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${role}/cash-book`}>
              <BookOpen className="mr-2 h-4 w-4" />
              Cash book
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Period</CardTitle>
          <CardDescription>
            Choose from/to dates to refresh the overview.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 max-w-lg">
          <div className="space-y-1">
            <Label>From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Total income
              <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              {formatCurrency(summary.income)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Total expenses
              <ArrowDownCircle className="h-4 w-4 text-rose-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              {formatCurrency(summary.expenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Net balance
              <Scale className="h-4 w-4 text-blue-600" />
            </div>
            <div
              className={`mt-2 text-2xl font-bold ${
                summary.netBalance >= 0 ? "text-blue-700" : "text-amber-700"
              }`}
            >
              {formatCurrency(summary.netBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Entries in period
              <Landmark className="h-4 w-4" />
            </div>
            <div className="mt-2 text-2xl font-bold">{summary.count}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Income by payment mode</CardTitle>
          <CardDescription>
            How money came in during this period (cash vs UPI vs bank vs cheque).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(CASH_BOOK_MODE_LABELS) as CashBookMode[]).map(
              (mode) => (
                <div key={mode} className="rounded-lg border px-3 py-3">
                  <p className="text-sm text-muted-foreground">
                    {CASH_BOOK_MODE_LABELS[mode]}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-700">
                    {formatCurrency(summary.byMode[mode])}
                  </p>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income vs expenses</CardTitle>
            <CardDescription>Monthly view for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            {monthlyData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No data for this period
              </div>
            ) : (
              <ChartContainer
                config={summaryChartConfig}
                className="h-[280px] w-full"
              >
                <BarChart data={monthlyData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={6} />
                  <Bar
                    dataKey="expense"
                    fill="var(--color-expense)"
                    radius={6}
                  />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category-wise breakdown</CardTitle>
            <CardDescription>Top categories by amount</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No category data for selected period.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                      >
                        {categoryBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {categoryBreakdown.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs"
                    >
                      <span className="inline-flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="line-clamp-1">{item.name}</span>
                      </span>
                      <span className="font-semibold shrink-0">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5" />
            Recent activity
          </CardTitle>
          <CardDescription>
            Latest cash book entries in this period.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-6 text-center text-muted-foreground">
              Loading…
            </div>
          ) : recentActivities.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No cash book entries for this period. Record them in the daily
              cash book.
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((txn) => (
                <div
                  key={txn.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          txn.type === "income"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }
                      >
                        {txn.type}
                      </Badge>
                      <span className="text-sm font-medium">
                        {getCashBookCategoryLabel(txn.categoryCode)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {CASH_BOOK_MODE_LABELS[txn.mode]}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {toDisplayDate(txn.date)}
                      {txn.studentName || txn.particulars
                        ? ` · ${txn.studentName || txn.particulars}`
                        : ""}
                    </p>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      txn.type === "income"
                        ? "text-emerald-700"
                        : "text-rose-700"
                    }`}
                  >
                    {txn.type === "income" ? "+" : "−"}{" "}
                    {formatCurrency(txn.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
