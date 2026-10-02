"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { schoolLetterheadDefaults } from "@/lib/config/school-letterhead";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import type { IdCardSettings } from "@/lib/types/id-card-settings.type";
import { formatCurrency } from "@/lib/utils";
import { amountInWordsInr } from "@/lib/utils/amount-in-words";
import { buildReceiptParticularRows } from "@/lib/utils/fee-receipt-particulars";
import { getAcademicYearForDate } from "@/lib/utils/fee-dues";
import { Download, Printer } from "lucide-react";
import { useMemo, useRef } from "react";

interface FeeReceiptDialogProps {
  payment: FeePayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const safeDate = (iso?: string) =>
  new Date(iso || new Date().toISOString()).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export function FeeReceiptDialog({
  payment,
  open,
  onOpenChange,
}: FeeReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { data: idCardSettingsData } = useFirebaseRealtime<IdCardSettings>(
    "settings/idCard",
    { asArray: false },
  );
  const principalSignatureUrl =
    (idCardSettingsData as IdCardSettings | null)?.principalSignatureUrl?.trim() ||
    "";

  const rows = useMemo(() => {
    if (!payment) return [];
    return buildReceiptParticularRows({
      feeTitle: payment.feeTitle || payment.title,
      feeCategory: String(payment.feeCategory || payment.category || ""),
      amountPaid: Number(payment.amountPaid || payment.paidAmount || 0),
    });
  }, [payment]);

  const total = Number(payment?.amountPaid || payment?.paidAmount || 0);
  const session =
    payment?.session ||
    getAcademicYearForDate(new Date(payment?.paymentDate || Date.now()));
  const words = amountInWordsInr(total);

  const printReceipt = () => {
    if (!payment || !receiptRef.current) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Receipt ${payment.receiptNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; padding: 12px; color: #000; }
            img { max-width: 100%; }
            table { border-collapse: collapse; width: 100%; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body>${receiptRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  const downloadReceipt = async () => {
    if (!payment || !receiptRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      pdf.save(`Receipt_${payment.receiptNumber}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
      printReceipt();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fee Receipt</DialogTitle>
        </DialogHeader>

        {!payment ? null : (
          <div className="space-y-4">
            <div
              ref={receiptRef}
              className="bg-white text-black border border-black mx-auto"
              style={{
                width: "100%",
                maxWidth: "640px",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontSize: "12px",
              }}
            >
              {/* Header */}
              <div className="flex gap-3 items-start p-3 border-b border-black">
                <img
                  src={schoolLetterheadDefaults.schoolLogo}
                  alt="School logo"
                  width={72}
                  height={72}
                  className="w-[72px] h-[72px] object-contain shrink-0"
                />
                <div className="flex-1 text-center pr-2">
                  <div className="text-xl font-extrabold tracking-wide uppercase leading-tight">
                    {schoolLetterheadDefaults.schoolName}
                  </div>
                  <div className="text-[10px] mt-0.5">
                    A venture of Rama Narayan Ray Educational Charitable Trust
                  </div>
                  <div className="text-[10px]">(Regd. No. 40231600212)</div>
                  <div className="text-[10px] mt-0.5">
                    At-Acharya Nagar, Bonth Chhak, Bhadrak-756100
                  </div>
                </div>
                <div className="text-right text-[11px] font-semibold shrink-0 w-[110px]">
                  <div>Receipt No.</div>
                  <div className="text-base font-bold mt-1 border border-black px-2 py-1 inline-block min-w-[72px]">
                    {payment.receiptNumber}
                  </div>
                </div>
              </div>

              {/* Student meta */}
              <div className="px-4 py-3 space-y-2 border-b border-black text-[12px]">
                <div className="flex gap-2">
                  <span className="font-semibold w-28 shrink-0">Date</span>
                  <span className="flex-1 border-b border-dotted border-gray-600">
                    {safeDate(payment.paymentDate)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold w-28 shrink-0">Name</span>
                  <span className="flex-1 border-b border-dotted border-gray-600 font-medium">
                    {payment.studentName}
                  </span>
                </div>
                <div className="flex gap-4">
                  <div className="flex gap-2 flex-1">
                    <span className="font-semibold w-28 shrink-0">Class/Level</span>
                    <span className="flex-1 border-b border-dotted border-gray-600">
                      {payment.studentClass || "—"}
                    </span>
                  </div>
                  <div className="flex gap-2 w-40">
                    <span className="font-semibold shrink-0">Roll No.</span>
                    <span className="flex-1 border-b border-dotted border-gray-600">
                      {payment.rollNumber || "—"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <span className="font-semibold w-28 shrink-0">Abacus / Drawing</span>
                  <span className="flex-1 border-b border-dotted border-gray-600">
                    {payment.abacusDrawing || ""}
                  </span>
                </div>
              </div>

              {/* Particulars table */}
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left font-bold px-3 py-1.5 w-[70%]">
                      PARTICULARS
                    </th>
                    <th className="text-right font-bold px-3 py-1.5 w-[30%]">
                      AMOUNT ₹
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-gray-300">
                      <td className="px-3 py-1">{row.label}</td>
                      <td className="px-3 py-1 text-right tabular-nums">
                        {row.amount != null && row.amount > 0
                          ? row.amount.toLocaleString("en-IN")
                          : ""}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-black">
                    <td className="px-3 py-2 font-bold">TOTAL</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums">
                      {total.toLocaleString("en-IN")}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in words + footer boxes */}
              <div className="px-4 py-3 space-y-3">
                <div className="text-[12px]">
                  <span className="font-semibold">Rupees </span>
                  <span className="border-b border-dotted border-gray-600 px-1">
                    {words}
                  </span>
                  <span className="font-semibold"> Only.</span>
                </div>

                <div className="flex items-end justify-between gap-4 pt-2">
                  <div className="flex items-stretch gap-0 border border-black">
                    <div className="px-2 py-2 font-bold border-r border-black flex items-center">
                      ₹
                    </div>
                    <div className="px-3 py-2 min-w-[100px] font-bold tabular-nums flex items-center">
                      {total.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div className="border border-black px-3 py-1.5 text-center min-w-[120px]">
                    <div className="text-[10px] font-bold tracking-wide">
                      SESSION
                    </div>
                    <div className="text-sm font-semibold">{session}</div>
                  </div>

                  <div className="flex flex-col items-center min-w-[140px]">
                    {principalSignatureUrl ? (
                      <img
                        src={principalSignatureUrl}
                        alt="Principal signature"
                        crossOrigin="anonymous"
                        className="h-12 w-[120px] object-contain object-bottom"
                      />
                    ) : (
                      <div className="h-12 w-[120px] border-b border-dotted border-gray-600" />
                    )}
                    <div className="text-[11px] font-semibold border-t border-black pt-1 mt-1 w-full text-center">
                      Principal
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={downloadReceipt} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button onClick={printReceipt} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>

            {/* keep formatCurrency import used for a11y summary */}
            <p className="sr-only">
              Receipt total {formatCurrency(total)} for {payment.studentName}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
