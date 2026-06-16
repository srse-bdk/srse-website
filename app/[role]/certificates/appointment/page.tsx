"use client";

import { useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReactToPrint } from "react-to-print";
import { Form } from "@/components/ui/form";
import { officialAppointmentLetterSchema } from "../_components/letter-types";
import type { OfficialAppointmentLetterData } from "../_components/letter-types";
import { AppointmentLetterFormFields } from "../_components/appointment-letter-form-fields";
import { AppointmentLetterPreview } from "../_components/appointment-letter-preview";
import { LetterPageLayout } from "../_components/letter-page-layout";
import { getDefaultSignatoryFields } from "../_components/letter-defaults";
import { letterPrintPageStyle } from "../_components/letter-utils";

export default function AppointmentLetterPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const form = useForm<OfficialAppointmentLetterData>({
    resolver: zodResolver(officialAppointmentLetterSchema) as any,
    defaultValues: {
      ...getDefaultSignatoryFields(),
      letterDate: new Date().toISOString(),
      employeeId: "",
      employeeName: "",
      location: "Bhadrak",
      positionTitle: "",
      reportingTo: "Principal, S R School of Excellence",
      startDate: "",
      monthlySalary: undefined,
      probationMonths: 6,
    },
  });

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Appointment Letter",
    pageStyle: letterPrintPageStyle,
  });

  const formData = form.watch();

  return (
    <LetterPageLayout
      title="Appointment Letter"
      description="Official appointment letter on school letterhead for new hires."
      printTitle="Appointment Letter"
      printRef={printRef}
      onPrint={() => handlePrint()}
      form={
        <Form {...form}>
          <form className="space-y-6">
            <AppointmentLetterFormFields form={form} />
          </form>
        </Form>
      }
      preview={<AppointmentLetterPreview data={formData} />}
      hiddenPrintContent={<AppointmentLetterPreview data={formData} isPrint />}
    />
  );
}
