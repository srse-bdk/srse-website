"use client";

import { useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { motion } from "motion/react";
import Image from "next/image";
import { Download, BookOpen, Clock, Users, Calculator, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { marketingSite } from "@/lib/config/marketing";

// Printable component
const PrintableFeeStructure = () => {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white text-black">
      {/* Header with Logo */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b-2 border-red-600">
        <Image
          src="/logo.png"
          alt="S R School of Excellence Logo"
          width={80}
          height={80}
          className="object-contain"
        />
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ABACUS Program - Fee Structure
          </h1>
          <p className="text-lg font-semibold text-gray-700">
            S R School of Excellence
          </p>
          <p className="text-sm text-gray-600">{marketingSite.address.full}</p>
        </div>
      </div>

      {/* Program Overview */}
      <div className="bg-gray-50 p-6 rounded-lg mb-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Program Overview
        </h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Total Levels</p>
            <p className="text-lg font-bold text-gray-900">9 levels</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Duration per Level</p>
            <p className="text-lg font-bold text-gray-900">~3 months</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Class Schedule</p>
            <p className="text-lg font-bold text-gray-900">2 hours/week</p>
          </div>
        </div>
      </div>

      {/* Curriculum */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          Program Levels and Curriculum
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Bud Level (Pre-school, 4-5 years)
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Introduction to Abacus</li>
              <li>Manipulating the bead</li>
              <li>Basic addition, subtraction with Abacus</li>
              <li>Mental Learning games and activities</li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Level 1-8 (Upto STD-VII, 6-14 years)
            </h3>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>
                Addition, subtraction, multiplication & division with Abacus
              </li>
              <li>Mental Visualization, oral and speed training</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Fee Structure */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-red-600 mb-6">Fee Structure</h2>

        <div className="grid grid-cols-2 gap-6">
          {/* One Time Fee */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              One Time Fee
            </h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="p-3 text-left border border-gray-300">Item</th>
                  <th className="p-3 text-right border border-gray-300">
                    Amount (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="p-3 border border-gray-300">Admission Fee</td>
                  <td className="p-3 text-right border border-gray-300">
                    700.00
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3 border border-gray-300">Abacus Tool</td>
                  <td className="p-3 text-right border border-gray-300">
                    80.00
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3 border border-gray-300">T-Shirt</td>
                  <td className="p-3 text-right border border-gray-300">
                    120.00
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3 border border-gray-300">Bag</td>
                  <td className="p-3 text-right border border-gray-300">
                    100.00
                  </td>
                </tr>
                <tr className="bg-gray-100 font-bold">
                  <td className="p-3 border border-gray-300">
                    Total One Time Fee
                  </td>
                  <td className="p-3 text-right border border-gray-300 text-red-600">
                    1,000.00
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Each Level Fee */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Each Level Fee
            </h3>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-red-600 text-white">
                  <th className="p-3 text-left border border-gray-300">Item</th>
                  <th className="p-3 text-right border border-gray-300">
                    Amount (₹)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-300">
                  <td className="p-3 border border-gray-300">Course Fee</td>
                  <td className="p-3 text-right border border-gray-300">
                    1,250.00
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3 border border-gray-300">
                    2 Abacus Books (with Pencil & Eraser)
                  </td>
                  <td className="p-3 text-right border border-gray-300">
                    200.00
                  </td>
                </tr>
                <tr className="border-b border-gray-300">
                  <td className="p-3 border border-gray-300">
                    Certificate Fee
                  </td>
                  <td className="p-3 text-right border border-gray-300">
                    100.00
                  </td>
                </tr>
                <tr className="bg-gray-100 font-bold">
                  <td className="p-3 border border-gray-300">
                    Total Each Level Fee
                  </td>
                  <td className="p-3 text-right border border-gray-300 text-red-600">
                    1,550.00
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-300 text-sm text-gray-600">
        <p className="mb-2">
          <strong>Contact:</strong> {marketingSite.contactEmail}
        </p>
        <p>
          <strong>Phone:</strong> {marketingSite.contactPhones.join(", ")}
        </p>
        {marketingSite.landline && (
          <p>
            <strong>Landline:</strong> {marketingSite.landline}
          </p>
        )}
      </div>
    </div>
  );
};

export default function FeeStructurePage() {
  const componentRef = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: "ABACUS Program Fee Structure - S R School of Excellence",
    pageStyle: `
      @page {
        margin: 20mm;
        size: A4;
      }
      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const handleDownloadClick = () => {
    setShowPreview(true);
  };

  const handlePrintFromDialog = () => {
    setShowPreview(false);
    // Small delay to ensure dialog closes before print
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  return (
    <section className="relative w-full min-h-screen bg-gradient-to-b from-background via-background to-muted/20 py-16 sm:py-20 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 right-10 h-96 w-96 rounded-full bg-primary/10 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-20 left-10 h-96 w-96 rounded-full bg-accent/10 blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-block"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              <span className="size-2 rounded-full bg-primary animate-pulse" />
              Fee Structure
            </span>
          </motion.div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground">
            <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
              ABACUS Program
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed">
            Transparent fee structure for our comprehensive ABACUS program
            designed to enhance mental math skills and cognitive development.
          </p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button
              onClick={handleDownloadClick}
              size="lg"
              className="inline-flex items-center gap-2"
            >
              <Download className="size-5" />
              Download Fee Structure
            </Button>
          </motion.div>
        </motion.header>

        {/* Program Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-lg">
            <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
              <BookOpen className="size-6 text-primary" />
              Program Overview
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Calculator className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Levels
                  </p>
                  <p className="text-xl font-bold text-foreground">9 levels</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Duration per Level
                  </p>
                  <p className="text-xl font-bold text-foreground">~3 months</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Class Schedule
                  </p>
                  <p className="text-xl font-bold text-foreground">
                    2 hours/week
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Curriculum */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-lg h-full">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Bud Level
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Pre-school (4-5 years)
              </p>
              <ul className="space-y-2">
                {[
                  "Introduction to Abacus",
                  "Manipulating the bead",
                  "Basic addition, subtraction with Abacus",
                  "Mental Learning games and activities",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-lg h-full">
              <h2 className="text-xl font-bold text-foreground mb-4">
                Level 1-8
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                Upto STD-VII (6-14 years)
              </p>
              <ul className="space-y-2">
                {[
                  "Addition, subtraction, multiplication & division with Abacus",
                  "Mental Visualization, oral and speed training",
                ].map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </motion.div>
        </div>

        {/* Fee Structure */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Calculator className="size-6 text-primary" />
                One Time Fee
              </h2>
              <div className="space-y-3">
                {[
                  { item: "Admission Fee", amount: "700.00" },
                  { item: "Abacus Tool", amount: "80.00" },
                  { item: "T-Shirt", amount: "120.00" },
                  { item: "Bag", amount: "100.00" },
                ].map((fee) => (
                  <div
                    key={fee.item}
                    className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                  >
                    <span className="text-sm sm:text-base text-foreground">
                      {fee.item}
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-foreground">
                      ₹{fee.amount}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-primary">
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    Total One Time Fee
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-primary">
                    ₹1,000.00
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Card className="border-border/60 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Calculator className="size-6 text-primary" />
                Each Level Fee
              </h2>
              <div className="space-y-3">
                {[
                  { item: "Course Fee", amount: "1,250.00" },
                  {
                    item: "2 Abacus Books (with Pencil & Eraser)",
                    amount: "200.00",
                  },
                  { item: "Certificate Fee", amount: "100.00" },
                ].map((fee) => (
                  <div
                    key={fee.item}
                    className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
                  >
                    <span className="text-sm sm:text-base text-foreground">
                      {fee.item}
                    </span>
                    <span className="text-sm sm:text-base font-semibold text-foreground">
                      ₹{fee.amount}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-4 mt-4 border-t-2 border-primary">
                  <span className="text-base sm:text-lg font-bold text-foreground">
                    Total Each Level Fee
                  </span>
                  <span className="text-lg sm:text-xl font-bold text-primary">
                    ₹1,550.00
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center"
        >
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm p-8 shadow-lg">
            <p className="text-muted-foreground mb-4">
              Have questions about the fee structure or want to enroll?
            </p>
            <Button asChild size="lg" variant="outline">
              <a href="/contact">Contact Us</a>
            </Button>
          </Card>
        </motion.div>
      </div>

      {/* Hidden printable component */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={componentRef}>
          <PrintableFeeStructure />
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="lg:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Fee Structure Preview</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreview(false)}
              >
                <X className="size-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <div className="p-8 max-w-4xl mx-auto bg-white text-black">
              <PrintableFeeStructure />
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Cancel
              </Button>
              <Button onClick={handlePrintFromDialog} className="gap-2">
                <Download className="size-4" />
                Print / Save as PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
