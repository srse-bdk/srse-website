"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReactToPrint } from "react-to-print";
import { Form } from "@/components/ui/form";
import { officialExperienceLetterSchema } from "../_components/letter-types";
import type { OfficialExperienceLetterData } from "../_components/letter-types";
import { ExperienceLetterFormFields } from "../_components/experience-letter-form-fields";
import { ExperienceLetterPreview } from "../_components/experience-letter-preview";
import { LetterPageLayout } from "../_components/letter-page-layout";
import { getDefaultSignatoryFields } from "../_components/letter-defaults";
import { letterPrintPageStyle } from "../_components/letter-utils";

export default function ExperienceCertificatePage() {
  const printRef = useRef<HTMLDivElement>(null);

  const form = useForm<OfficialExperienceLetterData>({
    resolver: zodResolver(officialExperienceLetterSchema) as any,
    defaultValues: {
      ...getDefaultSignatoryFields(),
      personName: "",
      designation: "",
      startDate: "",
      endDate: "",
      additionalParagraph: "",
      skipLetterhead: false,
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Experience Letter",
    pageStyle: letterPrintPageStyle,
  });

  const formData = form.watch();

  return (
    <LetterPageLayout
      title="Experience Letter"
      description="Official experience certificate for staff or any person not in the staff register."
      printTitle="Experience Letter"
      printRef={printRef}
      onPrint={() => handlePrint()}
      form={
        <Form {...form}>
          <form className="space-y-6">
            <ExperienceLetterFormFields form={form} />
          </form>
        </Form>
      }
      preview={<ExperienceLetterPreview data={formData} />}
      hiddenPrintContent={<ExperienceLetterPreview data={formData} isPrint />}
    />
  );
}
