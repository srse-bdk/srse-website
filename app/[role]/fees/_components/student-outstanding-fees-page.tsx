"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PAYMENT_CONFIG } from "@/lib/config/payment";
import { feeService } from "@/lib/services/fee.service";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import type { FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { formatCurrency } from "@/lib/utils";
import { CalendarClock, CheckCircle2, Clipboard, CreditCard, FileClock, Loader2, QrCode, ReceiptIndianRupee, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { FeeReceiptDialog } from "./fee-receipt-dialog";

interface StudentOutstandingFeesPageProps {
  student: Student | null;
  fees: FeeRecord[];
  payments: FeePayment[];
}

const safeDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "N/A";

const pendingStatuses = new Set(["pending", "partial", "pending_verification"]);

export function StudentOutstandingFeesPage({
  student,
  fees,
  payments,
}: StudentOutstandingFeesPageProps) {
  const [selectedFeeId, setSelectedFeeId] = useState<string>("");
  const [transactionId, setTransactionId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<FeePayment | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const studentPayments = useMemo(
    () =>
      (payments || [])
        .filter((payment) => payment.studentId === student?.id)
        .sort(
          (a, b) =>
            new Date(b.paymentDate || b.updatedAt || b.createdAt).getTime() -
            new Date(a.paymentDate || a.updatedAt || a.createdAt).getTime(),
        ),
    [payments, student?.id],
  );

  const pendingFees = useMemo(
    () =>
      fees
        .filter((fee) => fee.studentId === student?.id && pendingStatuses.has(fee.status))
        .sort(
          (a, b) =>
            new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
        ),
    [fees, student?.id],
  );

  const selectedFee = pendingFees.find((fee) => fee.id === selectedFeeId) || pendingFees[0];
  const pendingAmount = Math.max(
    0,
    (Number(selectedFee?.amount) || 0) - (Number(selectedFee?.paidAmount) || 0),
  );

  const selectedVerification = useMemo(() => {
    if (!selectedFee) return null;
    return (
      studentPayments.find(
        (payment) => payment.id === selectedFee.pendingVerificationPaymentId,
      ) ||
      studentPayments.find(
        (payment) =>
          payment.feeId === selectedFee.id &&
          payment.approvalStatus === "pending_verification",
      ) ||
      null
    );
  }, [studentPayments, selectedFee]);

  const totalPendingRecords = pendingFees.reduce(
    (sum, fee) => sum + Math.max(0, (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0)),
    0,
  );

  const pendingVerificationCount = pendingFees.filter(
    (fee) => fee.status === "pending_verification",
  ).length;

  useEffect(() => {
    if (!pendingFees.length) {
      setSelectedFeeId("");
      return;
    }

    const hasSelectedFee = pendingFees.some((fee) => fee.id === selectedFeeId);
    if (!selectedFeeId || !hasSelectedFee) {
      setSelectedFeeId(pendingFees[0].id || "");
    }
  }, [pendingFees, selectedFeeId]);

  useEffect(() => {
    if (!selectedFee) {
      setTransactionId("");
      setRemarks("");
      return;
    }

    setTransactionId(
      selectedVerification?.transactionId || selectedFee.transactionId || "",
    );
    setRemarks(selectedVerification?.remarks || selectedFee.remarks || "");
  }, [selectedFee, selectedVerification]);

  const upiUri = selectedFee
    ? `upi://pay?pa=${PAYMENT_CONFIG.upiId}&pn=${encodeURIComponent(PAYMENT_CONFIG.payeeName)}&am=${pendingAmount}&tn=${encodeURIComponent(selectedFee.title)}&cu=${PAYMENT_CONFIG.currency}`
    : "";

  const copyUpiId = async () => {
    await navigator.clipboard.writeText(PAYMENT_CONFIG.upiId);
    toast.success("UPI ID copied");
  };

  const submitVerification = async () => {
    if (!selectedFee?.id) return;
    if (!transactionId.trim()) {
      toast.error("Enter the transaction ID / UTR first");
      return;
    }

    setSubmitting(true);
    try {
      await feeService.submitFeePaymentForVerification({
        feeId: selectedFee.id,
        amountPaid: pendingAmount,
        transactionId: transactionId.trim(),
        remarks: remarks.trim(),
        paidBy: "student",
      });
      toast.success("Payment details sent for admin verification");
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit payment details");
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Student not linked</CardTitle>
          <CardDescription>
            Your login is not linked to a student record yet. Please contact the admin.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-amber-50 via-white to-emerald-50 p-6 shadow-sm">
          <div className="absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.16),_transparent_55%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <Badge className="border-none bg-amber-100 text-amber-900 hover:bg-amber-100">
                Student Fee Desk
              </Badge>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Outstanding fee payment
              </h1>
              <p className="max-w-2xl text-sm text-slate-600">
                Pending dues stay visible until the admin confirms the transaction from the collect dialog.
                Entering the UTR only moves the payment into verification.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="min-w-[180px] border-amber-200 bg-white/80 shadow-none">
                <CardContent className="pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Pending Fees
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-900">{pendingFees.length}</p>
                </CardContent>
              </Card>
              <Card className="min-w-[180px] border-rose-200 bg-white/80 shadow-none">
                <CardContent className="pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Outstanding
                  </p>
                  <p className="mt-2 text-2xl font-black text-rose-600">
                    {formatCurrency(totalPendingRecords)}
                  </p>
                </CardContent>
              </Card>
              <Card className="min-w-[180px] border-sky-200 bg-white/80 shadow-none">
                <CardContent className="pt-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
                    Awaiting Approval
                  </p>
                  <p className="mt-2 text-2xl font-black text-sky-700">
                    {pendingVerificationCount}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ReceiptIndianRupee className="h-5 w-5 text-rose-600" />
                Pending fee list
              </CardTitle>
              <CardDescription>
                Choose a fee to pay. The QR code remains available until admin approval is completed.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingFees.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  No pending fee is left right now.
                </div>
              ) : (
                pendingFees.map((fee) => {
                  const isSelected = selectedFee?.id === fee.id;
                  const feePending = Math.max(0, (Number(fee.amount) || 0) - (Number(fee.paidAmount) || 0));
                  return (
                    <button
                      key={fee.id}
                      type="button"
                      onClick={() => setSelectedFeeId(fee.id || "")}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                          : "border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/50"
                      }`}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-base font-bold">{fee.title}</p>
                          <div className={`flex items-center gap-2 text-xs ${isSelected ? "text-white/80" : "text-slate-500"}`}>
                            <CalendarClock className="h-3.5 w-3.5" />
                            Due {safeDate(fee.dueDate)}
                          </div>
                        </div>
                        <div className="space-y-2 text-right">
                          <p className="text-xl font-black">{formatCurrency(feePending)}</p>
                          <Badge
                            className={
                              fee.status === "pending_verification"
                                ? "border-none bg-sky-100 text-sky-800 hover:bg-sky-100"
                                : "border-none bg-amber-100 text-amber-900 hover:bg-amber-100"
                            }
                          >
                            {fee.status === "pending_verification" ? "Pending Verification" : "Pending"}
                          </Badge>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <QrCode className="h-5 w-5 text-emerald-600" />
                Scan and submit transaction
              </CardTitle>
              <CardDescription>
                The transaction moves to admin verification only. Your due clears after admin approval in `/fees`.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedFee ? (
                <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                  Select a pending fee to view the QR code.
                </div>
              ) : (
                <>
                  <div className="rounded-[28px] border bg-gradient-to-br from-emerald-50 via-white to-emerald-100/70 p-5">
                    <div className="flex flex-col items-center gap-4">
                      <div className="space-y-1 text-center">
                        <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700">
                          Amount To Pay
                        </p>
                        <p className="text-4xl font-black text-slate-900">
                          {formatCurrency(pendingAmount)}
                        </p>
                        <p className="text-sm text-slate-600">{selectedFee.title}</p>
                      </div>

                      <div className="rounded-[28px] bg-white p-4 shadow-xl shadow-emerald-200/60">
                        <QRCodeSVG value={upiUri} size={210} includeMargin level="H" />
                      </div>

                      <div className="grid w-full gap-3 sm:grid-cols-2">
                        <div className="rounded-2xl border bg-white/80 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            UPI ID
                          </p>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <code className="truncate text-sm font-bold text-slate-900">
                              {PAYMENT_CONFIG.upiId}
                            </code>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={copyUpiId}>
                              <Clipboard className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="rounded-2xl border bg-white/80 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">
                            Payee
                          </p>
                          <p className="mt-2 text-sm font-bold text-slate-900">
                            {PAYMENT_CONFIG.payeeName}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedFee.status === "pending_verification" && (
                    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 text-sky-600" />
                        <div className="space-y-1">
                          <p className="font-bold">Verification in progress</p>
                          <p>
                            Transaction ID <span className="font-mono font-semibold">{selectedVerification?.transactionId || selectedFee.transactionId}</span> was already submitted.
                            The QR stays visible until admin confirms the payment.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800" htmlFor="transactionId">
                        Transaction ID / UTR
                      </label>
                      <Input
                        id="transactionId"
                        value={transactionId}
                        onChange={(event) => setTransactionId(event.target.value)}
                        placeholder="Enter the UTR / reference number"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-800" htmlFor="remarks">
                        Note for admin
                      </label>
                      <Textarea
                        id="remarks"
                        value={remarks}
                        onChange={(event) => setRemarks(event.target.value)}
                        placeholder="Optional note to help verify the payment"
                        className="min-h-24"
                      />
                    </div>

                    <Button onClick={submitVerification} className="h-12 w-full text-base font-bold" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending for verification...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          {selectedFee.status === "pending_verification"
                            ? "Update Transaction ID"
                            : "Submit For Verification"}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileClock className="h-5 w-5 text-slate-700" />
              Payment history
            </CardTitle>
            <CardDescription>
              Every submission shows its current approval state.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {studentPayments.length === 0 ? (
              <div className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                No payment history available yet.
              </div>
            ) : (
              <div className="space-y-3">
                {studentPayments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col gap-4 rounded-2xl border p-4 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-slate-900">{payment.feeTitle}</p>
                        <Badge
                          className={
                            payment.approvalStatus === "pending_verification"
                              ? "border-none bg-sky-100 text-sky-800 hover:bg-sky-100"
                              : "border-none bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                          }
                        >
                          {payment.approvalStatus === "pending_verification"
                            ? "Pending Verification"
                            : "Approved"}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        Submitted {safeDate(payment.paymentDate || payment.paidDate)}
                        {payment.transactionId ? ` • UTR ${payment.transactionId}` : ""}
                      </p>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatCurrency(
                            payment.approvalStatus === "pending_verification"
                            ? Math.max(
                                0,
                                (Number(payment.amount) || 0) - (Number(payment.paidAmount) || 0),
                              )
                            : payment.amountPaid || payment.paidAmount || 0,
                        )}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {payment.approvalStatus === "approved" && payment.receiptNumber ? (
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setReceiptOpen(true);
                          }}
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Receipt
                        </Button>
                      ) : (
                        <Button variant="outline" disabled>
                          Awaiting admin approval
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <FeeReceiptDialog
        payment={selectedPayment}
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
      />
    </>
  );
}
