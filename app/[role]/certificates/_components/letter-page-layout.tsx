"use client";

import { ReactNode, RefObject } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface LetterPageLayoutProps {
  title: string;
  description: string;
  form: ReactNode;
  preview: ReactNode;
  printRef: RefObject<HTMLDivElement | null>;
  printTitle: string;
  onPrint: () => void;
  hiddenPrintContent?: ReactNode;
}

export function LetterPageLayout({
  title,
  description,
  form,
  preview,
  printRef,
  printTitle,
  onPrint,
  hiddenPrintContent,
}: LetterPageLayoutProps) {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-3 pb-8 sm:space-y-10 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 shadow-lg ring-1 ring-primary/20 sm:h-14 sm:w-14">
          <Download className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
        </div>
        <div>
          <h1 className="bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1 text-sm font-medium leading-relaxed text-muted-foreground sm:text-lg">
            {description}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12">
        <div className="space-y-6 sm:space-y-8 lg:col-span-7">{form}</div>

        <div className="space-y-4 lg:col-span-5">
          <div className="lg:sticky lg:top-8">
            <div className="rounded-[2rem] border bg-muted/30 p-4 shadow-2xl ring-1 ring-border backdrop-blur-sm sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <h2 className="text-xl font-bold tracking-tight">Live preview</h2>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-background/80 px-3 text-[10px] font-bold uppercase tracking-widest"
                >
                  A4 letterhead
                </Badge>
              </div>

              <div className="overflow-hidden rounded-2xl border border-border/40 bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
                <div className="custom-scrollbar max-h-[60vh] overflow-x-hidden overflow-y-auto bg-slate-50/50 lg:max-h-[75vh]">
                  <div className="flex justify-center p-4 sm:p-6">
                    <div className="w-[200%] origin-top scale-[0.45] transition-transform duration-500 ease-out sm:w-[143%] sm:scale-[0.65] md:w-[125%] md:scale-[0.75] lg:w-full lg:scale-[1]">
                      {preview}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="rounded-xl border border-primary/10 bg-primary/5 p-3">
                  <p className="text-center text-[10px] font-semibold leading-relaxed text-primary/80 sm:text-xs">
                    Preview is scaled on screen. Print / Save as PDF uses full A4
                    resolution with school letterhead.
                  </p>
                </div>
                <Button
                  onClick={onPrint}
                  size="lg"
                  className="group w-full gap-3 bg-primary shadow-lg shadow-primary/20 transition-all duration-300 hover:scale-[1.02] hover:bg-primary/90 active:scale-95"
                >
                  <Download className="h-5 w-5 group-hover:animate-bounce" />
                  Print / Save as PDF
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={printRef}>{hiddenPrintContent}</div>
      </div>
    </div>
  );
}
