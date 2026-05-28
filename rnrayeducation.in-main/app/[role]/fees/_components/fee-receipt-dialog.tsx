"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import { formatCurrency } from "@/lib/utils";
import { Download, Printer } from "lucide-react";
import { useRef } from "react";

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

  const printReceipt = () => {
    if (!payment || !receiptRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const receiptHTML = receiptRef.current.innerHTML;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Fee Receipt ${payment.receiptNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Times New Roman', Times, serif;
              padding: 20px;
              background: white;
              color: #000;
            }
            .receipt-container {
              max-width: 700px;
              margin: 0 auto;
              border: 2px solid #000;
              padding: 0;
            }
            .receipt-header {
              text-align: center;
              padding: 20px 20px;
              border-bottom: 2px solid #000;
            }
            .school-name {
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 4px;
              letter-spacing: 3px;
              text-transform: uppercase;
            }
            .school-tagline {
              font-size: 11px;
              font-style: italic;
              margin-bottom: 8px;
              color: #333;
            }
            .receipt-title {
              font-size: 14px;
              font-weight: 700;
              margin-top: 8px;
              letter-spacing: 2px;
              text-transform: uppercase;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              padding: 6px 0;
              display: inline-block;
              min-width: 250px;
            }
            .receipt-body {
              padding: 20px;
            }
            .receipt-number {
              text-align: center;
              font-size: 12px;
              margin-bottom: 20px;
              font-weight: 600;
            }
            .info-section {
              margin-bottom: 20px;
            }
            .info-row {
              display: flex;
              padding: 6px 0;
              border-bottom: 1px dotted #ccc;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .info-label {
              width: 150px;
              font-size: 12px;
              font-weight: 600;
              color: #000;
            }
            .info-value {
              flex: 1;
              font-size: 12px;
              color: #000;
            }
            .amount-section {
              margin: 20px 0;
              padding: 15px 0;
              border-top: 2px solid #000;
              border-bottom: 2px solid #000;
            }
            .amount-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }
            .amount-label {
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
            }
            .amount-value {
              font-size: 15px;
              font-weight: 700;
            }
            .remarks-section {
              margin: 15px 0;
              padding: 12px;
              border: 1px solid #000;
            }
            .remarks-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              margin-bottom: 6px;
            }
            .remarks-text {
              font-size: 12px;
              line-height: 1.4;
            }
            .footer {
              margin-top: 20px;
              padding-top: 12px;
              border-top: 1px solid #000;
              text-align: center;
              font-size: 9px;
              line-height: 1.5;
            }
            @media print {
              body { padding: 15px; }
              .receipt-container { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          ${receiptHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const downloadReceipt = async () => {
    if (!payment || !receiptRef.current) return;

    try {
      // Use html2canvas and jspdf for PDF generation
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`Receipt_${payment.receiptNumber}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      // Fallback to print
      printReceipt();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fee Receipt</DialogTitle>
        </DialogHeader>

        {!payment ? null : (
          <div className="space-y-4">
            {/* Receipt Preview */}
            <div ref={receiptRef} className="receipt-container border-2 border-black bg-white">
              {/* Header */}
              <div className="receipt-header text-center py-4 px-5 border-b-2 border-black">
                <div className="school-name text-2xl font-bold mb-1 tracking-[0.2em] uppercase">
                  S R School of Excellence
                </div>
                <div className="school-tagline text-[11px] italic text-gray-700 mb-2">
                  Nurturing Excellence, Building Future
                </div>
                <div className="receipt-title inline-block text-sm font-bold mt-2 tracking-[0.15em] uppercase border-t border-b border-black py-1.5 px-6">
                  Fee Payment Receipt
                </div>
              </div>

              {/* Body */}
              <div className="receipt-body p-5">
                {/* Receipt Number */}
                <div className="receipt-number text-center text-xs font-semibold mb-5">
                  Receipt No: <span className="text-sm font-bold">{payment.receiptNumber}</span>
                </div>

                {/* Student & Payment Info */}
                <div className="info-section mb-5">
                  <div className="info-row flex py-1.5 border-b border-dotted border-gray-400">
                    <div className="info-label w-36 text-xs font-semibold">
                      Student Name:
                    </div>
                    <div className="info-value flex-1 text-xs">
                      {payment.studentName}
                    </div>
                  </div>

                  <div className="info-row flex py-1.5 border-b border-dotted border-gray-400">
                    <div className="info-label w-36 text-xs font-semibold">
                      Payment Date:
                    </div>
                    <div className="info-value flex-1 text-xs">
                      {safeDate(payment.paymentDate)}
                    </div>
                  </div>

                  <div className="info-row flex py-1.5 border-b border-dotted border-gray-400">
                    <div className="info-label w-36 text-xs font-semibold">
                      Fee Type:
                    </div>
                    <div className="info-value flex-1 text-xs">
                      {payment.feeTitle}
                    </div>
                  </div>

                  <div className="info-row flex py-1.5 border-b border-dotted border-gray-400">
                    <div className="info-label w-36 text-xs font-semibold">
                      Category:
                    </div>
                    <div className="info-value flex-1 text-xs capitalize">
                      {payment.feeCategory}
                    </div>
                  </div>

                  <div className="info-row flex py-1.5 border-b border-dotted border-gray-400">
                    <div className="info-label w-36 text-xs font-semibold">
                      Payment Method:
                    </div>
                    <div className="info-value flex-1 text-xs uppercase">
                      {payment.paymentMethod}
                    </div>
                  </div>

                  <div className="info-row flex py-1.5">
                    <div className="info-label w-36 text-xs font-semibold">
                      Transaction ID:
                    </div>
                    <div className="info-value flex-1 text-xs">
                      {payment.transactionId || "N/A"}
                    </div>
                  </div>
                </div>

                {/* Amount Section */}
                <div className="amount-section my-5 py-4 border-t-2 border-b-2 border-black">
                  <div className="amount-row flex justify-between py-2">
                    <div className="amount-label text-xs font-bold uppercase">
                      Amount Paid:
                    </div>
                    <div className="amount-value text-base font-bold">
                      {formatCurrency(payment.amountPaid || payment.paidAmount || 0)}
                    </div>
                  </div>
                  <div className="amount-row flex justify-between py-2">
                    <div className="amount-label text-xs font-bold uppercase">
                      Pending Balance:
                    </div>
                    <div className="amount-value text-base font-bold">
                      {formatCurrency(payment.pendingAfterPayment || 0)}
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                {payment.remarks && (
                  <div className="remarks-section my-4 p-3 border border-black">
                    <div className="remarks-label text-[10px] font-bold uppercase mb-1.5">
                      Remarks:
                    </div>
                    <div className="remarks-text text-xs leading-relaxed">
                      {payment.remarks}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div className="footer mt-5 pt-3 border-t border-black text-center text-[9px] leading-relaxed">
                  <p>This is a computer-generated receipt and does not require a physical signature.</p>
                  <p className="mt-0.5">For any queries, please contact the school office.</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={downloadReceipt} className="gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button onClick={printReceipt} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
