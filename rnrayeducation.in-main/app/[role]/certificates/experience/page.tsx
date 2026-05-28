"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useReactToPrint } from "react-to-print";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { experienceCertificateSchema } from "../_components/certificate-types";
import type {
  ExperienceCertificateData,
  CommonCertificateData,
} from "../_components/certificate-types";
import { UseFormReturn } from "react-hook-form";
import { CommonFormFields } from "../_components/common-form-fields";
import { ExperienceFormFields } from "../_components/experience-form-fields";
import { CertificatePreview } from "../_components/certificate-preview";

export default function ExperienceCertificatePage() {
  const printRef = useRef<HTMLDivElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingSignature, setIsUploadingSignature] = useState(false);

  const form = useForm<ExperienceCertificateData>({
    resolver: zodResolver(experienceCertificateSchema) as any,
    defaultValues: {
      schoolName: "S R School of Excellence",
      schoolLogo: "/logo.png",
      schoolAddress: "",
      headerFontSize: "medium",
      headerTextColor: "#000000",
      certificateTitle: "Experience Certificate",
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
      bodyContent: `<p>This is to certify that <strong>[Mr./Ms. Full Name]</strong> served as a <strong>[Subject/Grade]</strong> Teacher at <strong>[School Name]</strong> from <strong>[Start Date]</strong> to <strong>[End Date]</strong>. [He/She] was responsible for teaching [specific subjects or grades], planning lessons, and assessing student progress. [His/Her] dedication to student success and strong classroom management were evident throughout [his/her] tenure.</p><p><strong>[Mr./Ms. Last Name]</strong> consistently demonstrated professionalism, reliability, and a passion for teaching. [He/She] maintained positive relationships with students and colleagues, contributing to a supportive learning environment.</p><p>We are confident in [his/her] abilities and wish [him/her] continued success in [his/her] future endeavors.</p>`,
      staffName: "",
      gender: "male",
      staffPosition: "",
      startDate: "",
      endDate: "",
      duration: "",
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
    documentTitle: "Experience Certificate",
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
              Experience Certificate
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground mt-1 font-medium leading-relaxed">
              Generate and customize professional experience certificates.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Form Section */}
        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
          <Form {...form}>
            <form className="space-y-6 sm:space-y-8">
              <ExperienceFormFields
                form={form as unknown as UseFormReturn<ExperienceCertificateData>}
              />
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
                      <CertificatePreview data={formData} type="experience" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-[10px] sm:text-xs text-primary/80 text-center font-semibold leading-relaxed">
                    The preview is scaled to fit your screen. Your printed certificate will use professional A4 resolution and high-quality margins.
                  </p>
                </div>
                {/* Print Button Integrated in Sidebar for Desktop */}
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
            type="experience"
            isPrint={true}
          />
        </div>
      </div>
    </div>
  );
}
