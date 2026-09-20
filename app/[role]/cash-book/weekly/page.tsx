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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type {
  CashBookDay,
  CashBookEntry,
} from "@/lib/types/cash-book.type";
import {
  CASH_BOOK_EXPENSE_CATEGORIES,
  CASH_BOOK_INCOME_CATEGORIES,
  computeDayTotals,
  startOfWeekMonday,
  weekDatesFrom,
} from "@/lib/types/cash-book.type";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatShort(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export default function CashBookWeeklyPage() {
  const params = useParams();
  const role = params.role as string;
  const [anchorDate, setAnchorDate] = useState(todayISO);

  const weekDates = useMemo(() => weekDatesFrom(anchorDate), [anchorDate]);
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  const { data: entriesData, loading: entriesLoading } =
    useFirebaseRealtime<CashBookEntry>("cashBookEntries", { asArray: true });
  const { data: daysData, loading: daysLoading } =
    useFirebaseRealtime<CashBookDay>("cashBookDays", { asArray: true });

  const allEntries = (entriesData as CashBookEntry[]) || [];
  const allDays = (daysData as CashBookDay[]) || [];

  const dayRows = useMemo(() => {
    return weekDates.map((date) => {
      const dayMeta =
        allDays.find((d) => d.date === date || d.id === date) || null;
      const entries = allEntries.filter((e) => e.date === date && !e.voided);
      const opening = Number(dayMeta?.openingCash) || 0;
      const totals = computeDayTotals(entries, opening);
      return { date, opening, totals, locked: Boolean(dayMeta?.locked) };
    });
  }, [weekDates, allDays, allEntries]);

  const weekEntries = useMemo(
    () =>
      allEntries.filter(
        (e) => !e.voided && e.date >= weekStart && e.date <= weekEnd,
      ),
    [allEntries, weekStart, weekEnd],
  );

  const weekIncome = weekEntries
    .filter((e) => e.type === "income")
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const weekExpense = weekEntries
    .filter((e) => e.type === "expense")
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const weekNet = weekIncome - weekExpense;
  const weekClosing = dayRows[6]?.totals.closingCash ?? 0;
  const weekOpening = dayRows[0]?.opening ?? 0;

  const incomeByCategory = useMemo(() => {
    return CASH_BOOK_INCOME_CATEGORIES.map((cat) => {
      const amount = weekEntries
        .filter((e) => e.type === "income" && e.categoryCode === cat.code)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      return { ...cat, amount };
    }).filter((c) => c.amount > 0);
  }, [weekEntries]);

  const expenseByCategory = useMemo(() => {
    return CASH_BOOK_EXPENSE_CATEGORIES.map((cat) => {
      const amount = weekEntries
        .filter((e) => e.type === "expense" && e.categoryCode === cat.code)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
      return { ...cat, amount };
    }).filter((c) => c.amount > 0);
  }, [weekEntries]);

  const loading = entriesLoading || daysLoading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Weekly Income & Expense Summary
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Week of {formatShort(weekStart)} – {formatShort(weekEnd)} (Mon–Sun)
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${role}/cash-book`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Daily cash book
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Select week
          </CardTitle>
          <CardDescription>
            Pick any date in the week. Summary uses Monday–Sunday.
          </CardDescription>
        </CardHeader>
        <CardContent className="max-w-xs space-y-2">
          <Label htmlFor="week-anchor">Date in week</Label>
          <Input
            id="week-anchor"
            type="date"
            value={anchorDate}
            onChange={(e) => setAnchorDate(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Week starts {startOfWeekMonday(anchorDate)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Week opening cash" value={formatCurrency(weekOpening)} />
        <StatCard
          label="Total income"
          value={formatCurrency(weekIncome)}
          className="text-emerald-600"
        />
        <StatCard
          label="Total expense"
          value={formatCurrency(weekExpense)}
          className="text-rose-600"
        />
        <StatCard
          label={weekNet >= 0 ? "Week surplus" : "Week deficit"}
          value={formatCurrency(Math.abs(weekNet))}
          className={weekNet >= 0 ? "text-emerald-600" : "text-rose-600"}
          hint={`Closing cash ${formatCurrency(weekClosing)}`}
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="text-base">1. Day-wise totals</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Day</TableHead>
                    <TableHead className="text-right">Opening</TableHead>
                    <TableHead className="text-right">Income</TableHead>
                    <TableHead className="text-right">Expense</TableHead>
                    <TableHead className="text-right">Closing cash</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayRows.map((row) => (
                    <TableRow key={row.date}>
                      <TableCell>
                        <Link
                          href={`/${role}/cash-book?date=${row.date}`}
                          className="font-medium hover:underline"
                        >
                          {formatShort(row.date)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.opening)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.totals.totalIncome)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.totals.totalExpense)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.totals.closingCash)}
                      </TableCell>
                      <TableCell>
                        {row.locked && (
                          <Badge variant="secondary">Locked</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <CategoryCard
              title="2. Income by category"
              rows={incomeByCategory}
              empty="No income this week"
            />
            <CategoryCard
              title="3. Expense by category"
              rows={expenseByCategory}
              empty="No expenses this week"
            />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  className,
  hint,
}: {
  label: string;
  value: string;
  className?: string;
  hint?: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="p-4 pb-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={`text-lg ${className || ""}`}>{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="p-4 pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}

function CategoryCard({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: Array<{ code: string; label: string; amount: number; group?: string }>;
  empty: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="px-6 pb-6 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.code}>
                  <TableCell className="font-mono text-xs">{row.code}</TableCell>
                  <TableCell>
                    {row.label}
                    {row.group ? (
                      <span className="text-xs text-muted-foreground">
                        {" "}
                        · {row.group}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
