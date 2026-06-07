"use client";

import { useState, useEffect, useMemo } from "react";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { Student } from "@/lib/types/student.type";
import type { FeeRecord } from "@/lib/types/fee.type";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { feeService } from "@/lib/services/fee.service";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Banknote, ShieldCheck } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const collectFeeSchema = z.object({
    feeId: z.string().min(1, "Please select a fee to pay"),
    amount: z.coerce.number().min(1, "Amount must be at least 1"),
    paymentDate: z.string().min(1, "Please select payment date"),
    paymentMethod: z.enum(["cash", "online", "check", "transfer"]),
    transactionId: z.string().optional(),
    remarks: z.string().optional(),
});

type CollectFeeValues = z.infer<typeof collectFeeSchema>;

interface CollectFeeDialogProps {
    student: Student | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CollectFeeDialog({ student, open, onOpenChange }: CollectFeeDialogProps) {
    const [loading, setLoading] = useState(false);
    const { data: feesData } = useFirebaseRealtime<FeeRecord>("feeIssued", {
        asArray: true,
    });
    const { data: feePaymentsData } = useFirebaseRealtime<FeePayment>("feePayments", {
        asArray: true,
    });

    const allFees = (feesData as FeeRecord[]) || [];
    const feePayments = (feePaymentsData as FeePayment[]) || [];

    // Get existing pending fee records
    const existingPendingFees = allFees.filter(
        f =>
            f.studentId === student?.id &&
            (f.status === "pending" ||
                f.status === "partial" ||
                f.status === "pending_verification")
    );

    const pendingPaymentsByFeeId = useMemo(() => {
        const map = new Map<string, FeePayment>();
        feePayments
            .filter(
                (p) =>
                    p.studentId === student?.id &&
                    p.approvalStatus === "pending_verification",
            )
            .forEach((p) => map.set(p.feeId || "", p));
        return map;
    }, [feePayments, student?.id]);

    // Combine existing records and structure dues
    const allPendingFees = [
        ...existingPendingFees.map(fee => ({
            id: fee.id!,
            feeRecordId: fee.id,
            title: fee.title,
            amount: fee.amount,
            pendingAmount: fee.amount - fee.paidAmount,
            status: fee.status,
            verificationPaymentId: pendingPaymentsByFeeId.get(fee.id!)?.id,
            verificationPayment: pendingPaymentsByFeeId.get(fee.id!),
        })),
    ];

    const form = useForm<CollectFeeValues>({
        resolver: zodResolver(collectFeeSchema) as any,
        defaultValues: {
            feeId: "",
            amount: 0,
            paymentDate: new Date().toISOString().slice(0, 10),
            paymentMethod: "cash",
            transactionId: "",
            remarks: "",
        },
    });

    const selectedFeeId = form.watch("feeId");
    const selectedFee = allPendingFees.find(f => f.id === selectedFeeId);

    useEffect(() => {
        if (selectedFee) {
            form.setValue("amount", selectedFee.pendingAmount);
            form.setValue(
                "transactionId",
                selectedFee.verificationPayment?.transactionId || "",
            );
            form.setValue(
                "remarks",
                selectedFee.verificationPayment?.remarks || "",
            );
        }
    }, [selectedFee, form]);

    async function onSubmit(data: CollectFeeValues) {
        if (!selectedFee || !student) return;

        setLoading(true);
        try {
            const amountToPay = Number(data.amount) || 0;
            const pendingAmount = selectedFee.pendingAmount;

            if (amountToPay > pendingAmount) {
                toast.error("Amount exceeds pending balance");
                setLoading(false);
                return;
            }

            const payment = await feeService.recordFeePayment({
                feeId: data.feeId,
                amountPaid: amountToPay,
                paymentMethod: data.paymentMethod,
                transactionId: data.transactionId,
                remarks: data.remarks,
                paymentDate: new Date(`${data.paymentDate}T00:00:00`).toISOString(),
                paidBy: "staff",
            });

            toast.success(`Payment recorded. Receipt: ${payment.receiptNumber}`);

            onOpenChange(false);
            form.reset();
        } catch (error) {
            console.error(error);
            toast.error("Failed to record payment");
        } finally {
            setLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Banknote className="h-5 w-5 text-emerald-500" />
                        Collect Fee: {student?.fullName}
                    </DialogTitle>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 py-4">
                        <FormField
                            control={form.control as any}
                            name="feeId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Select Pending Fee</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choose a fee record" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {allPendingFees.map((fee) => (
                                                <SelectItem key={fee.id} value={fee.id}>
                                                    {`${fee.title} (Pending: ${formatCurrency(fee.pendingAmount)})`}
                                                </SelectItem>
                                            ))}
                                            {allPendingFees.length === 0 && (
                                                <div className="p-2 text-sm text-muted-foreground text-center">
                                                    No pending fees found.
                                                </div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount to Pay (₹)</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="paymentDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="paymentMethod"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Method</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Method" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="cash">Cash</SelectItem>
                                                <SelectItem value="online">UPI / Online</SelectItem>
                                                <SelectItem value="check">Check</SelectItem>
                                                <SelectItem value="transfer">Transfer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {selectedFee?.status === "pending_verification" && (
                            <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
                                <div className="flex items-start gap-2">
                                    <ShieldCheck className="mt-0.5 h-4 w-4 text-sky-600" />
                                    <div>
                                        <p className="font-semibold">Verification request found</p>
                                        <p>
                                            This transaction was entered from the student fee page. Confirming collection here will approve it and clear the outstanding fee.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <FormField
                            control={form.control as any}
                            name="transactionId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Transaction ID / Ref (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="UTR, Check No, etc." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control as any}
                            name="remarks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Remarks</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Any additional notes" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex justify-end pt-4">
                            <Button type="submit" className="w-full sm:w-auto" disabled={loading || allPendingFees.length === 0}>
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Collection
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
