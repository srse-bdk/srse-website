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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { financialService } from "@/lib/services/financial.service";
import type { FinancialTransaction } from "@/lib/types/financial.type";
import {
  PREDEFINED_EXPENSE_CATEGORIES,
  PREDEFINED_INCOME_CATEGORIES,
} from "@/lib/types/financial.type";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TransactionFormDialog } from "./_components/transaction-form-dialog";

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export default function IncomeExpensesPage() {
  const user = useAppStore((state) => state.user);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<FinancialTransaction | null>(null);

  const defaultStartDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
  }, []);
  const defaultEndDate = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense">(
    "all",
  );
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const { data: transactionsData, loading } =
    useFirebaseRealtime<FinancialTransaction>("financialTransactions", {
      asArray: true,
    });

  const allTransactions = (transactionsData as FinancialTransaction[]) || [];
  const sortedTransactions = useMemo(
    () =>
      [...allTransactions].sort((a, b) => {
        const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (dateDiff !== 0) return dateDiff;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }),
    [allTransactions],
  );

  const availableCategories = useMemo(() => {
    const set = new Set<string>([
      ...PREDEFINED_INCOME_CATEGORIES,
      ...PREDEFINED_EXPENSE_CATEGORIES,
    ]);
    sortedTransactions.forEach((txn) => set.add(txn.category));
    return [...set];
  }, [sortedTransactions]);

  const filteredTransactions = useMemo(() => {
    return sortedTransactions.filter((txn) => {
      const matchesType = selectedType === "all" || txn.type === selectedType;
      const matchesCategory =
        selectedCategory === "all" || txn.category === selectedCategory;
      const matchesStart = !startDate || txn.date >= startDate;
      const matchesEnd = !endDate || txn.date <= endDate;
      return matchesType && matchesCategory && matchesStart && matchesEnd;
    });
  }, [sortedTransactions, selectedType, selectedCategory, startDate, endDate]);

  const resetDialog = () => {
    setDialogOpen(false);
    setEditingTransaction(null);
  };

  const deleteTransaction = async (transaction: FinancialTransaction) => {
    if (!transaction.id) return;
    const ok = window.confirm("Delete this transaction permanently?");
    if (!ok) return;

    try {
      await financialService.deleteTransaction(transaction.id);
      if (transaction.receiptFileKey) {
        await fetch(
          `/api/uploadthing/delete?fileKey=${encodeURIComponent(transaction.receiptFileKey)}`,
          { method: "DELETE" },
        );
      }
      toast.success("Transaction deleted");
    } catch (error) {
      console.error(error);
      toast.error("Unable to delete transaction");
    }
  };

  if (user?.role === "parent") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No Access</CardTitle>
          <CardDescription>
            Income and expense management is available only for Admin and Staff.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Income / Expenses Management
          </h1>
          <p className="text-muted-foreground">
            Track, edit, and maintain every financial transaction with proper
            category and receipt details.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTransaction(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
              Predefined Income Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {PREDEFINED_INCOME_CATEGORIES.map((category) => (
              <div
                key={category}
                className="rounded-md border bg-emerald-50/40 px-3 py-2"
              >
                {category}
              </div>
            ))}
          </CardContent>
        </Card> */}

        {/* <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownCircle className="h-4 w-4 text-rose-600" />
              Predefined Expense Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {PREDEFINED_EXPENSE_CATEGORIES.map((category) => (
              <div
                key={category}
                className="rounded-md border bg-rose-50/40 px-3 py-2"
              >
                {category}
              </div>
            ))}
          </CardContent>
        </Card> */}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Filter by category, date, and type. Use custom category in the form
            when needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={selectedType}
                onValueChange={(value) =>
                  setSelectedType(value as "all" | "income" | "expense")
                }
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
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No records found for selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((txn) => (
                    <TableRow key={txn.id}>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          {formatDate(txn.date)}
                        </span>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>{txn.category}</TableCell>
                      <TableCell className="font-semibold">
                        <span
                          className={
                            txn.type === "income" ? "text-emerald-700" : "text-rose-700"
                          }
                        >
                          {txn.type === "income" ? "+" : "-"}{" "}
                          {formatCurrency(txn.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">
                        {txn.notes || "-"}
                      </TableCell>
                      <TableCell>
                        {txn.receiptUrl ? (
                          <Link
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                            href={txn.receiptUrl}
                            target="_blank"
                          >
                            <ReceiptText className="h-4 w-4" />
                            View
                          </Link>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingTransaction(txn);
                                setDialogOpen(true);
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => deleteTransaction(txn)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TransactionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        transaction={editingTransaction}
        extraCategories={availableCategories}
        onSuccess={resetDialog}
      />
    </div>
  );
}
