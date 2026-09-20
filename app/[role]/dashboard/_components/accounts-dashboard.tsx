"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type {
  CashBookDay,
  CashBookEntry,
} from "@/lib/types/cash-book.type";
import { computeDayTotals } from "@/lib/types/cash-book.type";
import { formatCurrency } from "@/lib/utils";
import {
  BookOpen,
  CalendarDays,
  Sparkles,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function AccountsDashboard() {
  const params = useParams();
  const role = (params.role as string) || "accounts";
  const user = useAppStore((state) => state.user);
  const today = todayISO();

  const { data: entriesData } = useFirebaseRealtime<CashBookEntry>(
    "cashBookEntries",
    { asArray: true },
  );
  const { data: daysData } = useFirebaseRealtime<CashBookDay>("cashBookDays", {
    asArray: true,
  });

  const allEntries = (entriesData as CashBookEntry[]) || [];
  const allDays = (daysData as CashBookDay[]) || [];

  const todayStats = useMemo(() => {
    const dayMeta =
      allDays.find((d) => d.date === today || d.id === today) || null;
    const entries = allEntries.filter((e) => e.date === today && !e.voided);
    const opening = Number(dayMeta?.openingCash) || 0;
    return {
      ...computeDayTotals(entries, opening),
      locked: Boolean(dayMeta?.locked),
      entryCount: entries.length,
    };
  }, [allDays, allEntries, today]);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {getGreeting()}, {user?.name?.split(" ")[0] || "Accounts"}
          </h1>
          <p className="text-sm text-muted-foreground">
            School cash book — income, expenses, and day close.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-1">
            <CardDescription>Today&apos;s entries</CardDescription>
            <CardTitle className="text-xl">{todayStats.entryCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-1">
            <CardDescription>Today income</CardDescription>
            <CardTitle className="text-xl text-emerald-600">
              {formatCurrency(todayStats.totalIncome)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-1">
            <CardDescription>Today expense</CardDescription>
            <CardTitle className="text-xl text-rose-600">
              {formatCurrency(todayStats.totalExpense)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="p-4 pb-1">
            <CardDescription>Closing cash (est.)</CardDescription>
            <CardTitle className="text-xl">
              {formatCurrency(todayStats.closingCash)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              Daily Cash Book
            </CardTitle>
            <CardDescription>
              Enter receipts and payments, set opening cash, lock the day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href={`/${role}/cash-book`}>Open cash book</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Weekly Summary
            </CardTitle>
            <CardDescription>
              Day-wise totals and category breakdown for Mon–Sun.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href={`/${role}/cash-book/weekly`}>
                <BookOpen className="mr-2 h-4 w-4" />
                View week
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
