"use client";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import type { FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { formatCurrency } from "@/lib/utils";
import { format, isValid } from "date-fns";
import { Calendar, Eye, Tag, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FeeReceiptDialog } from "./fee-receipt-dialog";

const safeFormatDate = (dateStr: any, formatStr: string) => {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isValid(d) ? format(d, formatStr) : "Invalid Date";
};

interface StudentFeeDetailsDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StudentFeeDetailsDialog({
  student,
  open,
  onOpenChange,
}: StudentFeeDetailsDialogProps) {
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const { data: issuedFeesData } = useFirebaseRealtime<FeeRecord>("feeIssued", {
    asArray: true,
  });
  const { data: feePaymentsData } = useFirebaseRealtime<FeePayment>("feePayments", {
    asArray: true,
  });
  const fees = (issuedFeesData as FeeRecord[]) || [];
  const payments = (feePaymentsData as FeePayment[]) || [];

  const studentFees = useMemo(
    () => fees.filter((f) => f.studentId === student?.id),
    [fees, student?.id],
  );

  const studentPayments = useMemo(
    () =>
      payments
        .filter((p) => p.studentId === student?.id)
        .sort(
          (a, b) =>
            new Date(b.paymentDate || b.updatedAt || b.createdAt).getTime() -
            new Date(a.paymentDate || a.updatedAt || a.createdAt).getTime(),
        ),
    [payments, student?.id],
  );

  const pendingFromIssued = useMemo(
    () =>
      studentFees.reduce(
        (sum, fee) =>
          sum + Math.max(0, (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0)),
        0,
      ),
    [studentFees],
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
            Partial
          </Badge>
        );
      case "pending":
      case "overdue":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
            Due
          </Badge>
        );
      case "pending_verification":
        return (
          <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-200 border-none">
            Pending Verification
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Fee Details: {student?.fullName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 mt-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-muted/50 p-3 rounded-xl border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Admission No
                </p>
                <p className="text-sm font-bold mt-1">{student?.admissionNumber}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-xl border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Class
                </p>
                <p className="text-sm font-bold mt-1">{student?.currentClass}</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-xl border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Pending Amount
                </p>
                <p className="text-sm font-extrabold mt-1 text-rose-600">
                  {formatCurrency(pendingFromIssued)}
                </p>
              </div>
              <div className="bg-muted/50 p-3 rounded-xl border">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Last Payment
                </p>
                <p className="text-sm font-bold mt-1">
                  {safeFormatDate(studentPayments[0]?.paymentDate, "dd MMM yyyy")}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Student Fee Records
              </h3>
              <div className="rounded-xl border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentFees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center h-24 text-muted-foreground"
                        >
                          No fee records found for this student.
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentFees.map((fee) => (
                        <TableRow key={fee.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-xs sm:text-sm truncate max-w-[180px] sm:max-w-none">
                                {fee.title}
                              </span>
                              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Tag className="h-2.5 w-2.5" /> {fee.category}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-[10px] sm:text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {safeFormatDate(fee.dueDate, "dd MMM yyyy")}
                            </div>
                          </TableCell>
                          <TableCell className="font-black text-xs sm:text-sm">
                            {formatCurrency(fee.amount)}
                          </TableCell>
                          <TableCell className="text-emerald-600 font-black text-xs sm:text-sm">
                            {formatCurrency(fee.paidAmount)}
                          </TableCell>
                          <TableCell>{getStatusBadge(fee.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Payment History
              </h3>
              <div className="rounded-xl border shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Receipt</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentPayments.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center h-20 text-muted-foreground"
                        >
                          No payment history available yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentPayments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>{safeFormatDate(payment.paymentDate, "dd MMM yyyy")}</TableCell>
                          <TableCell className="font-mono text-xs">{payment.receiptNumber}</TableCell>
                          <TableCell>{payment.feeTitle}</TableCell>
                          <TableCell className="uppercase">{payment.paymentMethod}</TableCell>
                          <TableCell className="font-semibold text-emerald-700">
                            {formatCurrency(payment.amountPaid || payment.paidAmount || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                payment.approvalStatus === "approved"
                                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none"
                                  : "bg-sky-100 text-sky-800 hover:bg-sky-200 border-none"
                              }
                            >
                              {payment.approvalStatus === "approved"
                                ? "Approved"
                                : "Pending Verification"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={payment.approvalStatus !== "approved"}
                              onClick={() => {
                                setSelectedPayment(payment);
                                setReceiptOpen(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Receipt
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <FeeReceiptDialog
        payment={selectedPayment}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </>
  );
}
