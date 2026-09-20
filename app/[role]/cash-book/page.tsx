"use client";

import { AccountsUserManager } from "@/app/[role]/cash-book/_components/accounts-user-manager";
import { CashBookEntryFormDialog } from "@/app/[role]/cash-book/_components/entry-form-dialog";
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
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { cashBookService } from "@/lib/services/cash-book.service";
import type {
  CashBookDay,
  CashBookEntry,
  CashBookEntryType,
  CashBookMode,
} from "@/lib/types/cash-book.type";
import {
  CASH_BOOK_MODE_LABELS,
  computeDayTotals,
  getCashBookCategoryLabel,
} from "@/lib/types/cash-book.type";
import { cn, formatCurrency } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CashBookPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const role = params.role as string;
  const user = useAppStore((state) => state.user);
  const isAdmin = user?.role === "admin";

  const initialDate = searchParams.get("date") || todayISO();
  const [selectedDate, setSelectedDate] = useState(initialDate);

  useEffect(() => {
    const fromQuery = searchParams.get("date");
    if (fromQuery) {
      setSelectedDate(fromQuery);
    }
  }, [searchParams]);
  const [openingCash, setOpeningCash] = useState("0");
  const [physicalCash, setPhysicalCash] = useState("");
  const [savingDay, setSavingDay] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<CashBookEntryType>("income");
  const [editing, setEditing] = useState<CashBookEntry | null>(null);

  const { data: entriesData, loading: entriesLoading } =
    useFirebaseRealtime<CashBookEntry>("cashBookEntries", { asArray: true });

  const { data: daysData, loading: daysLoading } =
    useFirebaseRealtime<CashBookDay>("cashBookDays", { asArray: true });

  const allEntries = (entriesData as CashBookEntry[]) || [];
  const allDays = (daysData as CashBookDay[]) || [];

  const dayMeta = useMemo(() => {
    return (
      allDays.find((d) => d.date === selectedDate || d.id === selectedDate) ||
      null
    );
  }, [allDays, selectedDate]);

  const dayEntries = useMemo(() => {
    return allEntries
      .filter((e) => e.date === selectedDate && !e.voided)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [allEntries, selectedDate]);

  const incomeEntries = dayEntries.filter((e) => e.type === "income");
  const expenseEntries = dayEntries.filter((e) => e.type === "expense");

  const opening = Number(openingCash) || 0;
  const totals = useMemo(
    () => computeDayTotals(dayEntries, opening),
    [dayEntries, opening],
  );

  const previousClosing = useMemo(() => {
    const yesterday = new Date(`${selectedDate}T12:00:00`);
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().slice(0, 10);
    const yDay = allDays.find((d) => d.date === yStr || d.id === yStr);
    const yEntries = allEntries.filter((e) => e.date === yStr && !e.voided);
    const yOpening = Number(yDay?.openingCash) || 0;
    return computeDayTotals(yEntries, yOpening).closingCash;
  }, [allDays, allEntries, selectedDate]);

  useEffect(() => {
    if (dayMeta) {
      setOpeningCash(String(dayMeta.openingCash ?? 0));
      setPhysicalCash(
        dayMeta.physicalCashCount != null
          ? String(dayMeta.physicalCashCount)
          : "",
      );
    } else {
      setOpeningCash(String(previousClosing || 0));
      setPhysicalCash("");
    }
  }, [dayMeta, selectedDate, previousClosing]);

  const locked = Boolean(dayMeta?.locked);
  const physicalNum =
    physicalCash.trim() === "" ? null : Number(physicalCash) || 0;
  const cashMatch =
    physicalNum == null ? null : Math.abs(physicalNum - totals.closingCash) < 0.01;

  const openAdd = (type: CashBookEntryType) => {
    if (locked) {
      toast.error("This day is locked. Unlock to add entries.");
      return;
    }
    setEditing(null);
    setDialogType(type);
    setDialogOpen(true);
  };

  const openEdit = (entry: CashBookEntry) => {
    if (locked) {
      toast.error("This day is locked. Unlock to edit.");
      return;
    }
    setEditing(entry);
    setDialogType(entry.type);
    setDialogOpen(true);
  };

  const saveDayMeta = async () => {
    setSavingDay(true);
    try {
      await cashBookService.upsertDay(
        selectedDate,
        {
          openingCash: Number(openingCash) || 0,
          physicalCashCount:
            physicalCash.trim() === "" ? null : Number(physicalCash) || 0,
          locked: dayMeta?.locked ?? false,
        },
        user?.uid || "admin",
      );
      toast.success("Day balances saved");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save day");
    } finally {
      setSavingDay(false);
    }
  };

  const toggleLock = async () => {
    try {
      if (locked) {
        if (!isAdmin) {
          toast.error("Only admin can unlock a day");
          return;
        }
        await cashBookService.unlockDay(selectedDate, user?.uid || "admin");
        toast.success("Day unlocked");
      } else {
        await cashBookService.upsertDay(
          selectedDate,
          {
            openingCash: Number(openingCash) || 0,
            physicalCashCount:
              physicalCash.trim() === "" ? null : Number(physicalCash) || 0,
          },
          user?.uid || "admin",
        );
        await cashBookService.lockDay(
          selectedDate,
          user?.uid || "",
          user?.name || "User",
          user?.uid || "admin",
        );
        toast.success("Day locked");
      }
    } catch (error) {
      console.error(error);
      toast.error("Could not update lock");
    }
  };

  const voidEntry = async (entry: CashBookEntry) => {
    if (locked) {
      toast.error("Day is locked");
      return;
    }
    if (!confirm(`Void entry “${entry.particulars}”?`)) return;
    try {
      await cashBookService.voidEntry(entry.id, user?.uid || "admin");
      toast.success("Entry voided");
    } catch (error) {
      console.error(error);
      toast.error("Failed to void entry");
    }
  };

  const loading = entriesLoading || daysLoading;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Cash Book</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Record receipts and payments. Closing cash = opening + cash income −
            cash expense.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href={`/${role}/cash-book/weekly`}>
              <CalendarDays className="mr-2 h-4 w-4" />
              Weekly summary
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Day controls</CardTitle>
          <CardDescription>
            {formatDisplayDate(selectedDate)}
            {locked && (
              <Badge variant="secondary" className="ml-2">
                Locked
                {dayMeta?.lockedByName ? ` by ${dayMeta.lockedByName}` : ""}
              </Badge>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="cb-date">Date</Label>
              <Input
                id="cb-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cb-opening">Opening cash (₹)</Label>
              <Input
                id="cb-opening"
                type="number"
                min="0"
                step="1"
                value={openingCash}
                disabled={locked}
                onChange={(e) => setOpeningCash(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Suggested from yesterday closing: {formatCurrency(previousClosing)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cb-physical">Physical cash count (₹)</Label>
              <Input
                id="cb-physical"
                type="number"
                min="0"
                step="1"
                value={physicalCash}
                disabled={locked}
                onChange={(e) => setPhysicalCash(e.target.value)}
                placeholder="Count cash box"
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Button
                type="button"
                variant="secondary"
                disabled={locked || savingDay}
                onClick={saveDayMeta}
              >
                Save balances
              </Button>
              <Button
                type="button"
                variant={locked ? "outline" : "default"}
                onClick={toggleLock}
                disabled={locked && !isAdmin}
              >
                {locked ? (
                  <>
                    <LockOpen className="mr-2 h-4 w-4" />
                    Unlock
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Lock day
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryTile label="Opening cash" value={formatCurrency(opening)} />
        <SummaryTile
          label="Total income"
          value={formatCurrency(totals.totalIncome)}
          tone="income"
        />
        <SummaryTile
          label="Total expense"
          value={formatCurrency(totals.totalExpense)}
          tone="expense"
        />
        <SummaryTile
          label="Closing cash"
          value={formatCurrency(totals.closingCash)}
          hint={`Cash in ${formatCurrency(totals.cashIncome)} − out ${formatCurrency(totals.cashExpense)}`}
        />
        <SummaryTile
          label="Cash check"
          value={
            cashMatch == null
              ? "—"
              : cashMatch
                ? "Matches"
                : `Diff ${formatCurrency(Math.abs((physicalNum || 0) - totals.closingCash))}`
          }
          tone={cashMatch == null ? undefined : cashMatch ? "income" : "expense"}
        />
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">By payment mode</CardTitle>
          <CardDescription>
            Cash (C) affects the cash box. UPI / Bank / Cheque are tracked
            separately for reconciliation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(["C", "U", "B", "Q"] as CashBookMode[]).map((mode) => (
              <div
                key={mode}
                className="rounded-lg border px-3 py-2.5 space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {mode} — {CASH_BOOK_MODE_LABELS[mode]}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>In</span>
                  <span className="font-medium text-emerald-600">
                    {formatCurrency(totals.incomeByMode[mode])}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Out</span>
                  <span className="font-medium text-rose-600">
                    {formatCurrency(totals.expenseByMode[mode])}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => openAdd("income")} disabled={locked}>
          <Plus className="mr-2 h-4 w-4" />
          Add income
        </Button>
        <Button
          variant="outline"
          onClick={() => openAdd("expense")}
          disabled={locked}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add expense
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading entries…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <EntryTable
            title="Income (receipts)"
            icon={ArrowUpCircle}
            entries={incomeEntries}
            empty="No income for this day"
            onEdit={openEdit}
            onVoid={voidEntry}
            locked={locked}
            role={role}
          />
          <EntryTable
            title="Expenses (payments)"
            icon={ArrowDownCircle}
            entries={expenseEntries}
            empty="No expenses for this day"
            onEdit={openEdit}
            onVoid={voidEntry}
            locked={locked}
            role={role}
          />
        </div>
      )}

      {isAdmin && (
        <div className="pt-4">
          <AccountsUserManager />
        </div>
      )}

      <CashBookEntryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={selectedDate}
        entry={editing}
        defaultType={dialogType}
        onSuccess={() => {
          /* realtime updates */
        }}
      />
    </div>
  );
}

function SummaryTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "income" | "expense";
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="p-4 pb-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle
          className={cn(
            "text-lg",
            tone === "income" && "text-emerald-600",
            tone === "expense" && "text-rose-600",
          )}
        >
          {value}
        </CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="p-4 pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}

function EntryTable({
  title,
  icon: Icon,
  entries,
  empty,
  onEdit,
  onVoid,
  locked,
  role,
}: {
  title: string;
  icon: React.ElementType;
  entries: CashBookEntry[];
  empty: string;
  onEdit: (e: CashBookEntry) => void;
  onVoid: (e: CashBookEntry) => void;
  locked: boolean;
  role: string;
}) {
  return (
    <Card className="shadow-none overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" />
          {title}
          <Badge variant="outline" className="ml-auto font-normal">
            {entries.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {entries.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Particulars</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const primary =
                    entry.studentName?.trim() ||
                    entry.particulars?.trim() ||
                    "—";
                  const particularsNote =
                    entry.studentName?.trim() &&
                    entry.particulars?.trim() &&
                    entry.particulars.trim().toLowerCase() !==
                      entry.studentName.trim().toLowerCase()
                      ? entry.particulars.trim()
                      : null;

                  return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium">{primary}</div>
                      <div className="text-xs text-muted-foreground">
                        {entry.refNo ? `Ref: ${entry.refNo}` : null}
                        {entry.refNo ? " · " : null}
                        {getCashBookCategoryLabel(entry.categoryCode)}
                        {particularsNote ? ` · ${particularsNote}` : null}
                      </div>
                      {entry.feeReferenceLabel &&
                      Number(entry.feeReferenceAmount) > 0 ? (
                        <div className="mt-1 text-xs text-muted-foreground">
                          Fee ref: {entry.feeReferenceLabel} ·{" "}
                          {formatCurrency(Number(entry.feeReferenceAmount))}
                          {entry.feeReferenceKind === "pending"
                            ? " (pending)"
                            : entry.feeReferenceKind === "structure"
                              ? " (structure)"
                              : ""}
                        </div>
                      ) : null}
                      {entry.studentId ? (
                        <Link
                          href={`/${role}/students/${entry.studentId}`}
                          className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
                        >
                          Open profile
                          {entry.studentAdmissionNumber
                            ? ` · ${entry.studentAdmissionNumber}`
                            : ""}
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.categoryCode}
                    </TableCell>
                    <TableCell>
                      <span title={CASH_BOOK_MODE_LABELS[entry.mode]}>
                        {entry.mode}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(entry.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          disabled={locked}
                          onClick={() => onEdit(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          disabled={locked}
                          onClick={() => onVoid(entry)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
