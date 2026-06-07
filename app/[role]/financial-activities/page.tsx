"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { FeeConfiguration, FeeRecord } from "@/lib/types/fee.type";
import type { FinancialTransaction } from "@/lib/types/financial.type";
import type { Student } from "@/lib/types/student.type";
import { formatCurrency } from "@/lib/utils";
import {
  aggregateStudentDueSummaries,
  calculateStudentDueFromStructure,
  getAcademicYearForDate,
} from "@/lib/utils/fee-dues";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  Scale,
  WalletCards,
} from "lucide-react";
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
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function FinancialActivitiesPage() {
  const user = useAppStore((state) => state.user);

  const defaultStartDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  }, []);
  const defaultEndDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: financialData, loading: financialLoading } =
    useFirebaseRealtime<FinancialTransaction>("financialTransactions", {
      asArray: true,
    });
  const { data: feesData, loading: feesLoading } = useFirebaseRealtime<FeeRecord>(
    "feePayments",
    {
      asArray: true,
    },
  );
  const { data: studentsData } = useFirebaseRealtime<Student>("students", {
    asArray: true,
  });
  const { data: feeConfigsData } = useFirebaseRealtime<FeeConfiguration>(
    "feeConfigurations",
    {
      asArray: true,
    },
  );

  const transactions = (financialData as FinancialTransaction[]) || [];
  const fees = (feesData as FeeRecord[]) || [];
  const students = (studentsData as Student[]) || [];
  const feeConfigs = (feeConfigsData as FeeConfiguration[]) || [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((txn) => set.add(txn.category));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((txn) => {
        const matchesCategory =
          selectedCategory === "all" || txn.category === selectedCategory;
        const matchesStart = !startDate || txn.date >= startDate;
        const matchesEnd = !endDate || txn.date <= endDate;
        return matchesCategory && matchesStart && matchesEnd;
      })
      .sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [transactions, selectedCategory, startDate, endDate]);

  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;

    filteredTransactions.forEach((txn) => {
      if (txn.type === "income") income += Number(txn.amount) || 0;
      if (txn.type === "expense") expenses += Number(txn.amount) || 0;
    });

    const rangeStart = startDate
      ? new Date(`${startDate}T00:00:00`)
      : new Date("2000-01-01T00:00:00");
    const rangeEnd = endDate ? new Date(`${endDate}T23:59:59`) : new Date();
    const activeAY = getAcademicYearForDate(rangeEnd);

    const dueSummaries = students.map((student) =>
      calculateStudentDueFromStructure({
        student,
        feeConfigs,
        feeRecords: fees,
        rangeStart,
        rangeEnd,
        academicYear: activeAY,
      }),
    );
    const pendingFees = aggregateStudentDueSummaries(dueSummaries).totalPending;

    return {
      income,
      expenses,
      netBalance: income - expenses,
      pendingFees,
    };
  }, [filteredTransactions, fees, students, feeConfigs, startDate, endDate]);

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

    filteredTransactions.forEach((txn) => {
      const key = txn.date.slice(0, 7);
      const bucket = buckets.find((item) => item.key === key);
      if (!bucket) return;
      if (txn.type === "income") bucket.income += txn.amount;
      else bucket.expense += txn.amount;
    });

    return buckets;
  }, [filteredTransactions, startDate, endDate]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    filteredTransactions.forEach((txn) => {
      map.set(txn.category, (map.get(txn.category) || 0) + txn.amount);
    });

    return [...map.entries()]
      .map(([name, value], index) => ({
        name,
        value,
        fill: palette[index % palette.length],
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredTransactions]);

  const recentActivities = filteredTransactions.slice(0, 8);

  if (user?.role === "parent") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Access</CardTitle>
          <CardDescription>
            Financial activities are visible only to Admin and Staff users.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Activities</h1>
          <p className="text-muted-foreground">
            Overview of total income, expenses, net balance, and recent transactions.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <Label>From Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>To Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Total Income
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
              Total Expenses
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
              Net Balance
              <Scale className="h-4 w-4 text-blue-600" />
            </div>
            <div
              className={`mt-2 text-2xl font-bold ${summary.netBalance >= 0 ? "text-blue-700" : "text-amber-700"}`}
            >
              {formatCurrency(summary.netBalance)}
            </div>
          </CardContent>
        </Card>
        {/* <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Pending Fees
              <WalletCards className="h-4 w-4 text-orange-600" />
            </div>
            <div className="mt-2 text-2xl font-bold text-orange-700">
              {formatCurrency(summary.pendingFees)}
            </div>
          </CardContent>
        </Card> */}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses</CardTitle>
            <CardDescription>Monthly view for selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={summaryChartConfig} className="h-[280px] w-full">
              <BarChart data={monthlyData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="income" fill="var(--color-income)" radius={6} />
                <Bar dataKey="expense" fill="var(--color-expense)" radius={6} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category-wise Breakdown</CardTitle>
            <CardDescription>Top categories by transaction amount</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                No category data available for selected filters.
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
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="line-clamp-1">{item.name}</span>
                      </span>
                      <span className="font-semibold">{formatCurrency(item.value)}</span>
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
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest income and expense entries with date, category, amount, and notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {financialLoading || feesLoading ? (
            <div className="py-6 text-center text-muted-foreground">Loading activity...</div>
          ) : recentActivities.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground">
              No transactions found for selected filters.
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((txn) => (
                <div
                  key={txn.id}
                  className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
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
                      <span className="text-sm font-medium">{txn.category}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{toDisplayDate(txn.date)}</p>
                    {txn.notes && <p className="text-sm text-muted-foreground">{txn.notes}</p>}
                  </div>
                  <div
                    className={`text-lg font-bold ${txn.type === "income" ? "text-emerald-700" : "text-rose-700"}`}
                  >
                    {txn.type === "income" ? "+" : "-"} {formatCurrency(txn.amount)}
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

