"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReactToPrint } from "react-to-print";
import { Form } from "@/components/ui/form";
import { termsConditionsLetterSchema } from "../_components/letter-types";
import type { TermsConditionsLetterData } from "../_components/letter-types";
import { TermsConditionsFormFields } from "../_components/terms-conditions-form-fields";
import { TermsConditionsLetterPreview } from "../_components/terms-conditions-letter-preview";
import { LetterPageLayout } from "../_components/letter-page-layout";
import { getDefaultTermsConditionsFields } from "../_components/letter-defaults";
import { letterPrintPageStyle } from "../_components/letter-utils";

export default function TermsConditionsLetterPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const form = useForm<TermsConditionsLetterData>({
    resolver: zodResolver(termsConditionsLetterSchema) as any,
    defaultValues: getDefaultTermsConditionsFields(),
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Terms and Conditions",
    pageStyle: letterPrintPageStyle,
  });

  const formData = form.watch();

  return (
    <LetterPageLayout
      title="Terms & Conditions"
      description="Employment terms acknowledgement page with signature lines for staff."
      printTitle="Terms and Conditions"
      printRef={printRef}
      onPrint={() => handlePrint()}
      form={
        <Form {...form}>
          <form className="space-y-6">
            <TermsConditionsFormFields form={form} />
          </form>
        </Form>
      }
      preview={<TermsConditionsLetterPreview data={formData} />}
      hiddenPrintContent={
        <TermsConditionsLetterPreview data={formData} isPrint />
      }
    />
  );
}
