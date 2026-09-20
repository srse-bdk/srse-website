"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { CashBookEntry } from "@/lib/types/cash-book.type";
import {
  CASH_BOOK_MODE_LABELS,
  getCashBookCategoryLabel,
} from "@/lib/types/cash-book.type";
import { formatCurrency } from "@/lib/utils";
import { Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

interface StudentCashBookReceiptsProps {
  studentId: string;
  role: string;
  /** Used to hide redundant name in particulars (this view is always one student). */
  studentName?: string;
  /** When false, dates are plain text (student/parent cannot open cash book). */
  linkToCashBook?: boolean;
  className?: string;
}

function normalize(value?: string) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** Particulars often auto-fill as the student name — skip that on a per-student view. */
function extraParticulars(
  entry: CashBookEntry,
  studentName?: string,
): string | null {
  const particulars = entry.particulars?.trim();
  if (!particulars) return null;

  const p = normalize(particulars);
  const names = [
    studentName,
    entry.studentName,
  ]
    .map(normalize)
    .filter(Boolean);

  if (names.some((n) => n === p || p.startsWith(`${n} `) || p.endsWith(` ${n}`))) {
    return null;
  }

  return particulars;
}

export function StudentCashBookReceipts({
  studentId,
  role,
  studentName,
  linkToCashBook = true,
  className,
}: StudentCashBookReceiptsProps) {
  const { data, loading } = useFirebaseRealtime<CashBookEntry>(
    "cashBookEntries",
    { asArray: true },
  );

  const receipts = useMemo(() => {
    const all = (data as CashBookEntry[]) || [];
    return all
      .filter(
        (e) =>
          e.studentId === studentId && e.type === "income" && !e.voided,
      )
      .sort((a, b) => {
        const d = b.date.localeCompare(a.date);
        if (d !== 0) return d;
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      });
  }, [data, studentId]);

  const total = receipts.reduce((s, e) => s + (Number(e.amount) || 0), 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-3 border-b">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Payments received
            </CardTitle>
            <CardDescription className="mt-1">
              Amounts paid at school for this student (cash, UPI, bank, or
              cheque).
            </CardDescription>
          </div>
          {receipts.length > 0 && (
            <Badge variant="secondary">Total {formatCurrency(total)}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-4 p-0 sm:p-0">
        {loading ? (
          <p className="px-6 py-4 text-sm text-muted-foreground">Loading…</p>
        ) : receipts.length === 0 ? (
          <p className="px-6 py-6 text-sm text-muted-foreground">
            No payments recorded for this student yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((entry) => {
                  const category = getCashBookCategoryLabel(entry.categoryCode);
                  const note = extraParticulars(entry, studentName);
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>
                        {linkToCashBook ? (
                          <Link
                            href={`/${role}/cash-book?date=${entry.date}`}
                            className="font-medium hover:underline"
                          >
                            {entry.date}
                          </Link>
                        ) : (
                          <span className="font-medium">{entry.date}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{category}</div>
                        {(entry.refNo ||
                          note ||
                          (entry.feeReferenceLabel &&
                            Number(entry.feeReferenceAmount) > 0)) && (
                          <div className="text-xs text-muted-foreground space-y-0.5">
                            {[entry.refNo ? `Ref: ${entry.refNo}` : null, note]
                              .filter(Boolean)
                              .join(" · ")}
                            {entry.feeReferenceLabel &&
                            Number(entry.feeReferenceAmount) > 0 ? (
                              <div>
                                Expected:{" "}
                                {formatCurrency(
                                  Number(entry.feeReferenceAmount),
                                )}
                                {entry.feeReferenceKind === "pending"
                                  ? " pending"
                                  : ""}
                              </div>
                            ) : null}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {CASH_BOOK_MODE_LABELS[entry.mode]}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(entry.amount)}
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
