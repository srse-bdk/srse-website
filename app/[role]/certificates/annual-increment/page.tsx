"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReactToPrint } from "react-to-print";
import { Form } from "@/components/ui/form";
import { annualIncrementLetterSchema } from "../_components/letter-types";
import type { AnnualIncrementLetterData } from "../_components/letter-types";
import { AnnualIncrementFormFields } from "../_components/annual-increment-form-fields";
import { AnnualIncrementLetterPreview } from "../_components/annual-increment-letter-preview";
import { LetterPageLayout } from "../_components/letter-page-layout";
import { getDefaultSignatoryFields } from "../_components/letter-defaults";
import { letterPrintPageStyle } from "../_components/letter-utils";

export default function AnnualIncrementLetterPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const form = useForm<AnnualIncrementLetterData>({
    resolver: zodResolver(annualIncrementLetterSchema) as any,
    defaultValues: {
      ...getDefaultSignatoryFields(),
      letterDate: new Date().toISOString(),
      employeeId: "",
      employeeName: "",
      location: "Bhadrak",
      revisedSalary: undefined,
      effectiveDate: "",
      includeRetentionBonus: false,
      retentionBonusAmount: undefined,
      retentionBonusPayoutNote: "payout with March Salary",
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Annual Increment Letter",
    pageStyle: letterPrintPageStyle,
  });

  const formData = form.watch();

  return (
    <LetterPageLayout
      title="Annual Increment Letter"
      description="Official letterhead format for revised compensation and annual increment."
      printTitle="Annual Increment Letter"
      printRef={printRef}
      onPrint={() => handlePrint()}
      form={
        <Form {...form}>
          <form className="space-y-6">
            <AnnualIncrementFormFields form={form} />
          </form>
        </Form>
      }
      preview={<AnnualIncrementLetterPreview data={formData} />}
      hiddenPrintContent={
        <AnnualIncrementLetterPreview data={formData} isPrint />
      }
    />
  );
}
