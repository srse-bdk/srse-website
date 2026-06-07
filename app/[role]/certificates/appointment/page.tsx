"use client";

import { useRef, useState } from "react";
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReactToPrint } from "react-to-print";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { appointmentLetterSchema } from "../_components/certificate-types";

// ... imports ...
import type {
  AppointmentLetterData,
  CommonCertificateData,
} from "../_components/certificate-types";
import { CommonFormFields } from "../_components/common-form-fields";
import { AppointmentFormFields } from "../_components/appointment-form-fields";
import { CertificatePreview } from "../_components/certificate-preview";

export default function AppointmentLetterPage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  const form = useForm<AppointmentLetterData>({
    resolver: zodResolver(appointmentLetterSchema) as any,
    defaultValues: {
      schoolName: "S R School of Excellence",
      schoolLogo: "/logo.png",
      schoolAddress: "",
      headerFontSize: "medium",
      headerTextColor: "#000000",
      certificateTitle: "Appointment Letter",
      fontFamily: "Outfit",
      fontSize: "medium",
      textColor: "#000000",
      lineSpacing: "1.5",
      signatoryName: "",
      signatoryTitle: "",
      dateFormat: "DD/MM/YYYY",
      dateInputType: "picker",
      staffSelectionMode: "list",
      borderStyle: "solid",
      borderColor: "#000000",
      borderWidth: 2,
      backgroundColor: "#ffffff",
      padding: 20,
      textAlignment: "justify",
      termsAndConditions: `<p>Dear <strong>[Mr./Ms. Full Name]</strong>,</p><p>We are pleased to offer you the position of <strong>[Position Title]</strong> in the <strong>[Department]</strong> at <strong>[School Name]</strong>.</p><p>Your appointment will commence on <strong>[Start Date]</strong>. You will be reporting to <strong>[Reporting Manager]</strong>, and your starting salary will be <strong>[Salary]</strong> per month.</p><p>You will be on probation for a period of six months from the date of joining. During this period, your performance will be evaluated. Upon satisfactory completion of the probation period, your employment will be confirmed.</p><p>We look forward to welcoming you to our team and wish you a successful career with us.</p>`,
      staffName: "",
      gender: "male",
      positionTitle: "",
      department: "",
      startDate: "",
      salaryAmount: undefined,
      salaryCurrency: "₹",
      reportingManager: "",
    },
  });

  const { startUpload: startLogoUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: async (res) => {
      if (res?.[0]?.url) {
        form.setValue("schoolLogo", res[0].url);
        setIsUploadingLogo(false);
        toast.success("Logo uploaded successfully!");
      }
    },
    onUploadError: (error: Error) => {
      setIsUploadingLogo(false);
      toast.error(`Logo upload failed: ${error.message}`);
    },
  });

  const { startUpload: startSignatureUpload } = useUploadThing(
    "imageUploader",
    {
      onClientUploadComplete: async (res) => {
        if (res?.[0]?.url) {
          form.setValue("signatureImage", res[0].url);
          setIsUploadingSignature(false);
          toast.success("Signature uploaded successfully!");
        }
      },
      onUploadError: (error: Error) => {
        setIsUploadingSignature(false);
        toast.error(`Signature upload failed: ${error.message}`);
      },
    }
  );

  const handleLogoUpload = (file: File) => {
    setIsUploadingLogo(true);
    startLogoUpload([file]);
  };

  const handleSignatureUpload = (file: File) => {
    setIsUploadingSignature(true);
    startSignatureUpload([file]);
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Appointment Letter",
    pageStyle: `
      @page {
        margin: 0mm;
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

  const formData = form.watch();

  return (
    <div className="container mx-auto p-3 sm:p-6 space-y-6 sm:space-y-10 max-w-7xl pb-8">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 shadow-lg ring-1 ring-primary/20">
            <Download className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70">
              Appointment Letter
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground mt-1 font-medium leading-relaxed">
              Generate and customize professional appointment letters.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Form Section */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          <Form {...form}>
            <form className="space-y-6 sm:space-y-8">
              <AppointmentFormFields form={form} />
              <CommonFormFields
                form={form as unknown as UseFormReturn<CommonCertificateData>}
                isUploadingLogo={isUploadingLogo}
                isUploadingSignature={isUploadingSignature}
                onLogoUpload={handleLogoUpload}
                onSignatureUpload={handleSignatureUpload}
              />
            </form>
          </Form>
        </div>

        {/* Preview Section */}
        <div className="lg:col-span-5 space-y-4">
          <div className="lg:sticky lg:top-8">
            <div className="bg-muted/30 backdrop-blur-sm p-4 sm:p-8 rounded-[2rem] border ring-1 ring-border shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <h2 className="text-xl font-bold tracking-tight">Live Preview</h2>
                </div>
                <Badge variant="secondary" className="bg-background/80 text-[10px] font-bold uppercase tracking-widest px-3">Real-time Edition</Badge>
              </div>
              <div className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden border border-border/40">
                <div className="max-h-[60vh] lg:max-h-[75vh] overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50/50">
                  <div className="p-4 sm:p-6 lg:p-4 flex justify-center">
                    <div className="origin-top scale-[0.5] sm:scale-[0.7] md:scale-[0.8] lg:scale-[1.0] transition-transform duration-500 ease-out w-[200%] sm:w-[143%] md:w-[125%] lg:w-full">
                      <CertificatePreview data={formData} type="appointment" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] sm:text-xs text-primary/80 text-center font-semibold leading-relaxed">
                    The preview is scaled to fit your screen. Your document will use professional A4 resolution.
                  </p>
                </div>
                <Button onClick={handlePrint} size="lg" className="w-full gap-3 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 group">
                  <Download className="h-5 w-5 group-hover:animate-bounce" />
                  Print / Save as PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Hidden printable component */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={printRef}>
          <CertificatePreview
            data={formData}
            type="appointment"
            isPrint={true}
          />
        </div>
      </div>
    </div>
  );
}
