"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { PAYMENT_CONFIG } from "@/lib/config/payment";
import { feeService } from "@/lib/services/fee.service";
import type { FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { cn, formatCurrency } from "@/lib/utils";
import { UploadButton } from "@/lib/utils/uploadthing";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2,
  Clipboard,
  CreditCard,
  Loader2,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const payFeeSchema = z.object({
  feeId: z.string().min(1, "Please select a fee to pay"),
  amount: z.number().min(1, "Amount must be at least 1"),
  transactionId: z.string().min(3, "Please enter a valid Transaction ID / UTR"),
  remarks: z.string().optional(),
  paymentScreenshot: z.string().min(1, "Please upload the payment screenshot"),
  paymentScreenshotFileKey: z.string().min(1, "Upload failed - no file key"),
});

type PayFeeValues = z.infer<typeof payFeeSchema>;

interface ParentPayFeeDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ParentPayFeeDialog({
  student,
  open,
  onOpenChange,
}: ParentPayFeeDialogProps) {
  const [loading, setLoading] = useState(false);
  const { data: feesData } = useFirebaseRealtime<FeeRecord>("feeIssued", {
    asArray: true,
  });

  const studentFees = ((feesData as FeeRecord[]) || []).filter(
    (f) =>
      f.studentId === student?.id &&
      (f.status === "pending" ||
        f.status === "partial" ||
        f.status === "pending_verification"),
  );

  const form = useForm<PayFeeValues>({
    resolver: zodResolver(payFeeSchema),
    defaultValues: {
      feeId: "",
      amount: 0,
      transactionId: "",
      remarks: "",
      paymentScreenshot: "",
      paymentScreenshotFileKey: "",
    },
  });

  const selectedFeeId = form.watch("feeId");
  const selectedFee = studentFees.find((f) => f.id === selectedFeeId);
  const screenshotUrl = form.watch("paymentScreenshot");

  useEffect(() => {
    if (selectedFee) {
      form.setValue("amount", selectedFee.amount - selectedFee.paidAmount);
    }
  }, [selectedFee, form]);

  // Generate UPI URI
  // upi://pay?pa=upiid@bank&pn=PayeeName&am=Amount&tn=Note&cu=INR
  const upiUri = selectedFee
    ? `upi://pay?pa=${PAYMENT_CONFIG.upiId}&pn=${encodeURIComponent(PAYMENT_CONFIG.payeeName)}&am=${form.getValues("amount")}&tn=${encodeURIComponent(selectedFee.title)}&cu=${PAYMENT_CONFIG.currency}`
    : "";

  const copyUpiId = () => {
    navigator.clipboard.writeText(PAYMENT_CONFIG.upiId);
    toast.success("UPI ID copied to clipboard");
  };

  async function onSubmit(data: PayFeeValues) {
    if (!selectedFee) return;

    setLoading(true);
    try {
      const amountPaidNow = Number(data.amount) || 0;
      const pendingAmount = Math.max(
        0,
        (Number(selectedFee.amount) || 0) - (Number(selectedFee.paidAmount) || 0),
      );

      if (amountPaidNow > pendingAmount) {
        toast.error("Amount exceeds pending balance");
        setLoading(false);
        return;
      }

      await feeService.submitFeePaymentForVerification({
        feeId: data.feeId,
        amountPaid: amountPaidNow,
        transactionId: data.transactionId,
        paymentScreenshot: data.paymentScreenshot,
        paymentScreenshotFileKey: data.paymentScreenshotFileKey,
        remarks: `Parent Self-Reported: ${data.remarks || ""}`.trim(),
        paidBy: "parent",
      });

      toast.success("Payment details sent for admin verification");
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Pay Fee: {student?.fullName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Select Fee Section */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control as any}
                name="feeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Pending Fee</FormLabel>
                    <div className="space-y-2">
                      {studentFees.map((fee) => (
                        <div
                          key={fee.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => field.onChange(fee.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              field.onChange(fee.id);
                            }
                          }}
                          className={cn(
                            "p-3 rounded-lg border-2 cursor-pointer transition-all flex items-center justify-between",
                            field.value === fee.id
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border hover:border-primary/50",
                          )}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {fee.title}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {fee.category}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-sm block">
                              {formatCurrency(fee.amount - fee.paidAmount)}
                            </span>
                            {field.value === fee.id && (
                              <Badge className="text-[10px] h-4">
                                Selected
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {studentFees.length === 0 && (
                        <div className="p-4 text-sm text-muted-foreground text-center border-2 border-dashed rounded-lg">
                          No pending fees found for this student.
                        </div>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedFee && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Payment Section */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border shadow-inner flex flex-col items-center gap-4">
                    <div className="text-center space-y-1">
                      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                        Scan to Pay
                      </p>
                      <p className="text-2xl font-black text-primary">
                        {formatCurrency(form.getValues("amount"))}
                      </p>
                    </div>

                    <div className="p-4 bg-white rounded-2xl shadow-xl ring-8 ring-white/50">
                      <QRCodeSVG
                        value={upiUri}
                        size={180}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg border text-sm">
                        <span className="text-muted-foreground font-medium">
                          UPI ID:
                        </span>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-bold">
                            {PAYMENT_CONFIG.upiId}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={copyUpiId}
                          >
                            <Clipboard className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 bg-background rounded-lg border text-sm">
                        <span className="text-muted-foreground font-medium">
                          Name:
                        </span>
                        <span className="font-bold">
                          {PAYMENT_CONFIG.payeeName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Form */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="transactionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Transaction ID / UTR</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter 12-digit UTR or Ref No."
                              {...field}
                              className="h-11"
                            />
                          </FormControl>
                          <FormDescription>
                            Enter the reference number from your payment app
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentScreenshot"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Upload Screenshot</FormLabel>
                          <FormControl>
                            <div className="flex flex-col gap-3">
                              {screenshotUrl ? (
                                <div className="relative group rounded-xl overflow-hidden border aspect-video bg-muted flex items-center justify-center">
                                  {/* biome-ignore lint/a11y/useAltText: verified proof */}
                                  <img
                                    src={screenshotUrl}
                                    alt="Payment proof"
                                    className="max-h-full object-contain"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button
                                      type="button"
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        form.setValue("paymentScreenshot", "");
                                        form.setValue(
                                          "paymentScreenshotFileKey",
                                          "",
                                        );
                                      }}
                                    >
                                      Change Screenshot
                                    </Button>
                                  </div>
                                  <div className="absolute top-2 right-2">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500 fill-white" />
                                  </div>
                                </div>
                              ) : (
                                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center gap-3 bg-muted/50 transition-colors hover:bg-muted/80">
                                  <Upload className="h-8 w-8 text-muted-foreground" />
                                  <div className="text-center">
                                    <UploadButton
                                      endpoint="imageUploader"
                                      onClientUploadComplete={(res) => {
                                        if (res?.[0]) {
                                          form.setValue(
                                            "paymentScreenshot",
                                            res[0].url,
                                          );
                                          form.setValue(
                                            "paymentScreenshotFileKey",
                                            res[0].key,
                                          );
                                          toast.success("Screenshot uploaded");
                                        }
                                      }}
                                      onUploadError={(error: Error) => {
                                        toast.error(
                                          `Upload error: ${error.message}`,
                                        );
                                      }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                                    JPG, PNG up to 4MB
                                  </p>
                                </div>
                              )}
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="remarks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remarks (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Any notes for the admin"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-5 w-5" />
                        Submit Payment Details
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
