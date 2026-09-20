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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CashBookEntry,
  CashBookEntryType,
  CashBookMode,
} from "@/lib/types/cash-book.type";
import {
  ALL_CASH_BOOK_CATEGORIES,
  CASH_BOOK_MODE_LABELS,
  getCashBookCategoryLabel,
} from "@/lib/types/cash-book.type";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  Scale,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

const formatDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function IncomeExpensesStatementPage() {
  const params = useParams();
  const role = params.role as string;

  const defaultStartDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  }, []);
  const defaultEndDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [selectedType, setSelectedType] = useState<"all" | CashBookEntryType>(
    "all",
  );
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedMode, setSelectedMode] = useState<"all" | CashBookMode>("all");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const { data: entriesData, loading } = useFirebaseRealtime<CashBookEntry>(
    "cashBookEntries",
    { asArray: true },
  );

  const allEntries = useMemo(() => {
    const rows = ((entriesData as CashBookEntry[]) || []).filter((e) => !e.voided);
    return [...rows].sort((a, b) => {
      const dateDiff = b.date.localeCompare(a.date);
      if (dateDiff !== 0) return dateDiff;
      return (
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    });
  }, [entriesData]);

  const categoryOptions = useMemo(() => {
    const used = new Set(allEntries.map((e) => e.categoryCode));
    return ALL_CASH_BOOK_CATEGORIES.filter(
      (c) =>
        used.has(c.code) ||
        selectedType === "all" ||
        c.type === selectedType,
    );
  }, [allEntries, selectedType]);

  const filtered = useMemo(() => {
    return allEntries.filter((entry) => {
      const matchesType =
        selectedType === "all" || entry.type === selectedType;
      const matchesCategory =
        selectedCategory === "all" || entry.categoryCode === selectedCategory;
      const matchesMode =
        selectedMode === "all" || entry.mode === selectedMode;
      const matchesStart = !startDate || entry.date >= startDate;
      const matchesEnd = !endDate || entry.date <= endDate;
      return matchesType && matchesCategory && matchesMode && matchesStart && matchesEnd;
    });
  }, [
    allEntries,
    selectedType,
    selectedCategory,
    selectedMode,
    startDate,
    endDate,
  ]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byMode: Record<CashBookMode, { income: number; expense: number }> = {
      C: { income: 0, expense: 0 },
      U: { income: 0, expense: 0 },
      B: { income: 0, expense: 0 },
      Q: { income: 0, expense: 0 },
    };

    for (const entry of filtered) {
      const amount = Number(entry.amount) || 0;
      if (entry.type === "income") {
        income += amount;
        byMode[entry.mode].income += amount;
      } else {
        expense += amount;
        byMode[entry.mode].expense += amount;
      }
    }

    return { income, expense, net: income - expense, byMode };
  }, [filtered]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Income &amp; Expense Statement
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Date-range statement from the daily cash book. Entry happens in the
            cash book; this page only reports.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${role}/cash-book`}>
            <BookOpen className="mr-2 h-4 w-4" />
            Open cash book
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Statement period</CardTitle>
          <CardDescription>
            Pick a from/to date (and optional filters) to fetch the statement.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
          <div className="space-y-1">
            <Label>Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => {
                setSelectedType(v as "all" | CashBookEntryType);
                setSelectedCategory("all");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All categories</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.code} value={cat.code}>
                    {cat.code} — {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Mode</Label>
            <Select
              value={selectedMode}
              onValueChange={(v) => setSelectedMode(v as "all" | CashBookMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                {(Object.keys(CASH_BOOK_MODE_LABELS) as CashBookMode[]).map(
                  (mode) => (
                    <SelectItem key={mode} value={mode}>
                      {mode} — {CASH_BOOK_MODE_LABELS[mode]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-none">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Total income
              <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-700">
              {formatCurrency(totals.income)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Total expense
              <ArrowDownCircle className="h-4 w-4 text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-rose-700">
              {formatCurrency(totals.expense)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="pt-5">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              Surplus / (deficit)
              <Scale className="h-4 w-4 text-blue-600" />
            </div>
            <p
              className={`mt-2 text-2xl font-bold ${
                totals.net >= 0 ? "text-blue-700" : "text-amber-700"
              }`}
            >
              {formatCurrency(totals.net)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By payment mode</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(CASH_BOOK_MODE_LABELS) as CashBookMode[]).map(
              (mode) => (
                <div key={mode} className="rounded-lg border px-3 py-2.5 space-y-1">
                  <p className="text-sm font-medium">
                    {mode} — {CASH_BOOK_MODE_LABELS[mode]}
                  </p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>In</span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(totals.byMode[mode].income)}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Out</span>
                    <span className="font-medium text-rose-600">
                      {formatCurrency(totals.byMode[mode].expense)}
                    </span>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-none overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">
            Statement lines ({filtered.length})
          </CardTitle>
          <CardDescription>
            {formatDate(startDate)} – {formatDate(endDate)}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">
              No cash book entries in this period. Record income/expenses in the
              daily cash book first.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Particulars</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>
                        <Link
                          href={`/${role}/cash-book?date=${entry.date}`}
                          className="font-medium hover:underline"
                        >
                          {formatDate(entry.date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            entry.type === "income"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-rose-200 bg-rose-50 text-rose-700"
                          }
                        >
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {entry.studentName || entry.particulars}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {getCashBookCategoryLabel(entry.categoryCode)}
                          {entry.refNo ? ` · Ref: ${entry.refNo}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.categoryCode}
                      </TableCell>
                      <TableCell>
                        {entry.mode}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({CASH_BOOK_MODE_LABELS[entry.mode]})
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          entry.type === "income"
                            ? "text-emerald-700"
                            : "text-rose-700"
                        }`}
                      >
                        {entry.type === "income" ? "+" : "−"}
                        {formatCurrency(entry.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
