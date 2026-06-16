"use client";

import { useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReactToPrint } from "react-to-print";
import { Form } from "@/components/ui/form";
import {
  annualIncrementLetterSchema,
  termsConditionsLetterSchema,
} from "../_components/letter-types";
import type {
  AnnualIncrementLetterData,
  TermsConditionsLetterData,
} from "../_components/letter-types";
import { AnnualIncrementFormFields } from "../_components/annual-increment-form-fields";
import { TermsConditionsFormFields } from "../_components/terms-conditions-form-fields";
import { AnnualIncrementLetterPreview, COMPENSATION_PACKAGE_SUBJECT } from "../_components/annual-increment-letter-preview";
import { TermsConditionsLetterPreview } from "../_components/terms-conditions-letter-preview";
import { LetterPageLayout } from "../_components/letter-page-layout";
import { getDefaultSignatoryFields } from "../_components/letter-defaults";
import { letterPrintPageStyle } from "../_components/letter-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompensationPackagePage() {
  const printRef = useRef<HTMLDivElement>(null);

  const incrementForm = useForm<AnnualIncrementLetterData>({
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

  const termsForm = useForm<TermsConditionsLetterData>({
    resolver: zodResolver(termsConditionsLetterSchema) as any,
    defaultValues: {
      ...getDefaultSignatoryFields(),
      employeeName: "",
      jobTitle: "Assistant Teacher – Level 2",
      reportingTo: "Principal, S R School of Excellence",
      noticePeriodMonths: 2,
      acknowledgmentDate: "",
    },
  });

  const incrementData = incrementForm.watch();
  const termsData = termsForm.watch();

  useEffect(() => {
    if (
      incrementData.employeeName &&
      incrementData.employeeName !== termsData.employeeName
    ) {
      termsForm.setValue("employeeName", incrementData.employeeName);
    }
    if (incrementData.gender) {
      termsForm.setValue("gender", incrementData.gender);
    }
  }, [
    incrementData.employeeName,
    incrementData.gender,
    termsData.employeeName,
    termsForm,
  ]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Revised Compensation and Terms of Employment",
    pageStyle: letterPrintPageStyle,
  });

  return (
    <LetterPageLayout
      title="Compensation Package"
      description="Print the annual increment letter and terms & conditions together as a two-page package."
      printTitle="Compensation Package"
      printRef={printRef}
      onPrint={() => handlePrint()}
      form={
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Page 1 — Annual increment letter</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...incrementForm}>
                <form className="space-y-6">
                  <AnnualIncrementFormFields form={incrementForm} />
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Page 2 — Terms &amp; conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...termsForm}>
                <form className="space-y-6">
                  <TermsConditionsFormFields form={termsForm} />
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      }
      preview={
        <div className="space-y-4">
          <AnnualIncrementLetterPreview
            data={incrementData}
            subjectLine={COMPENSATION_PACKAGE_SUBJECT}
          />
          <TermsConditionsLetterPreview data={termsData} />
        </div>
      }
      hiddenPrintContent={
        <>
          <AnnualIncrementLetterPreview
            data={incrementData}
            isPrint
            subjectLine={COMPENSATION_PACKAGE_SUBJECT}
          />
          <TermsConditionsLetterPreview data={termsData} isPrint />
        </>
      }
    />
  );
}
