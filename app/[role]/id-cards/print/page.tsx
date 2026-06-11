"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, CheckCircle2, CreditCard, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";
import { IdCardPrintExcludePicker } from "@/app/[role]/id-cards/_components/id-card-print-exclude-picker";
import { IdCardSettingsPanel } from "@/app/[role]/id-cards/_components/id-card-settings-panel";
import { IdCardThemePicker } from "@/app/[role]/id-cards/_components/id-card-theme-picker";
import { IdCardPrintPages } from "@/components/id-cards/id-card-print-pages";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { staffService, studentService } from "@/lib/services";
import {
  DEFAULT_ACADEMIC_YEAR,
  ID_CARD_PRINT_PAGE_STYLE,
} from "@/lib/config/id-card";
import { DEFAULT_ID_CARD_THEME_ID } from "@/lib/config/id-card-themes";
import type { IdCardSettings } from "@/lib/types/id-card-settings.type";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import {
  applyIdCardPrintFilters,
  buildIdCardPdfFilename,
  chunkIdCardPages,
  downloadIdCardPagesPdf,
  filterStaffForIdCardPrint,
  filterStudentsForIdCardPrint,
  getIdCardPrintFilterStats,
  getPrintableStaff,
  getPrintableStudents,
  getStudentClassOptions,
  getStudentSectionOptions,
  type IdCardPrintFilterOptions,
} from "@/lib/utils/id-card-print";
import {
  ID_CARD_SAMPLE_STAFF,
  ID_CARD_SAMPLE_STUDENT,
} from "@/lib/utils/id-card-preview-sample";

type PrintMode = "single" | "bulk";
type PersonTab = "student" | "staff";

export default function IdCardPrintPage() {
  const searchParams = useSearchParams();
  const printRef = useRef<HTMLDivElement>(null);

  const [printMode, setPrintMode] = useState<PrintMode>("bulk");
  const [classFilter, setClassFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<PersonTab>("student");
  const themeId = DEFAULT_ID_CARD_THEME_ID;
  const [academicYear, setAcademicYear] = useState(DEFAULT_ACADEMIC_YEAR);
  const [hasPhotoOnly, setHasPhotoOnly] = useState(true);
  const [excludeAlreadyPrinted, setExcludeAlreadyPrinted] = useState(true);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  const [markAsPrintedAfterExport, setMarkAsPrintedAfterExport] = useState(true);
  const [isMarkingPrinted, setIsMarkingPrinted] = useState(false);

  const {
    data: studentsData,
    loading: studentsLoading,
    error: studentsError,
  } = useFirebaseRealtime<Student>("students", { asArray: true });

  const {
    data: staffData,
    loading: staffLoading,
    error: staffError,
  } = useFirebaseRealtime<User>("users", {
    asArray: true,
    filter: (user) => user.role === "staff",
  });

  const { data: settingsData, loading: settingsLoading } =
    useFirebaseRealtime<IdCardSettings>("settings/idCard", { asArray: false });

  const settings = settingsData as IdCardSettings | null;
  const principalSignatureUrl = settings?.principalSignatureUrl?.trim() || "";

  useEffect(() => {
    if (settings?.academicYear?.trim()) {
      setAcademicYear(settings.academicYear.trim());
    }
  }, [settings?.academicYear]);

  const activeStudents = useMemo(() => {
    const students = (studentsData as Student[]) || [];
    return students.filter((student) => student.status === "active");
  }, [studentsData]);

  const activeStaff = useMemo(() => {
    const staffs = (staffData as User[]) || [];
    return staffs.filter((staff) => staff.status === "active");
  }, [staffData]);

  const printableStudents = useMemo(
    () => getPrintableStudents(activeStudents),
    [activeStudents],
  );

  const printableStaff = useMemo(
    () => getPrintableStaff(activeStaff),
    [activeStaff],
  );

  useEffect(() => {
    const studentId = searchParams.get("studentId");
    const staffId = searchParams.get("staffId");

    if (staffId) {
      setActiveTab("staff");
      setPrintMode("single");
      setSelectedStaffId(staffId);
      return;
    }

    if (studentId) {
      setActiveTab("student");
      setPrintMode("single");
      setSelectedStudentId(studentId);
    }
  }, [searchParams]);

  const classOptions = useMemo(
    () => getStudentClassOptions(activeStudents),
    [activeStudents],
  );

  const sectionOptions = useMemo(
    () => getStudentSectionOptions(activeStudents, classFilter),
    [activeStudents, classFilter],
  );

  const bulkStudents = useMemo(
    () =>
      filterStudentsForIdCardPrint(
        activeStudents,
        classFilter,
        sectionFilter,
      ),
    [activeStudents, classFilter, sectionFilter],
  );

  const bulkStaff = useMemo(
    () => filterStaffForIdCardPrint(activeStaff),
    [activeStaff],
  );

  const printFilterOptions: IdCardPrintFilterOptions = useMemo(
    () => ({
      hasPhotoOnly: printMode === "bulk" && hasPhotoOnly,
      excludeAlreadyPrinted: printMode === "bulk" && excludeAlreadyPrinted,
      excludeIds: new Set(excludedIds),
    }),
    [printMode, hasPhotoOnly, excludeAlreadyPrinted, excludedIds],
  );

  const baseStudents = useMemo(() => {
    if (printMode === "single") {
      const student = printableStudents.find(
        (item) => item.id === selectedStudentId,
      );
      return student ? [student] : [];
    }
    return bulkStudents;
  }, [printMode, printableStudents, selectedStudentId, bulkStudents]);

  const baseStaff = useMemo(() => {
    if (printMode === "single") {
      const staff = printableStaff.find((item) => item.id === selectedStaffId);
      return staff ? [staff] : [];
    }
    return bulkStaff;
  }, [printMode, printableStaff, selectedStaffId, bulkStaff]);

  const filteredStudents = useMemo(
    () => applyIdCardPrintFilters(baseStudents, printFilterOptions),
    [baseStudents, printFilterOptions],
  );

  const filteredStaff = useMemo(
    () => applyIdCardPrintFilters(baseStaff, printFilterOptions),
    [baseStaff, printFilterOptions],
  );

  const studentFilterStats = useMemo(
    () => getIdCardPrintFilterStats(baseStudents, filteredStudents, printFilterOptions),
    [baseStudents, filteredStudents, printFilterOptions],
  );

  const staffFilterStats = useMemo(
    () => getIdCardPrintFilterStats(baseStaff, filteredStaff, printFilterOptions),
    [baseStaff, filteredStaff, printFilterOptions],
  );

  const excludeOptions = useMemo(() => {
    const pool = activeTab === "student" ? baseStudents : baseStaff;
    return pool.map((person) => ({
      value: person.id,
      label:
        activeTab === "student"
          ? (person as Student).fullName || "Student"
          : (person as User).name || "Staff",
      subLabel:
        activeTab === "student"
          ? [
              (person as Student).currentClass,
              (person as Student).currentSection,
            ]
              .filter(Boolean)
              .join("-") || undefined
          : (person as User).position,
    }));
  }, [activeTab, baseStudents, baseStaff]);

  useEffect(() => {
    setExcludedIds([]);
  }, [activeTab, classFilter, sectionFilter, printMode]);

  useEffect(() => {
    const validIds = new Set(excludeOptions.map((option) => option.value));
    setExcludedIds((current) => current.filter((id) => validIds.has(id)));
  }, [excludeOptions]);

  const markCurrentSelectionAsPrinted = async () => {
    const ids =
      activeTab === "student"
        ? filteredStudents.map((student) => student.id)
        : filteredStaff.map((staff) => staff.id);

    if (ids.length === 0) {
      toast.error("No cards selected to mark as printed");
      return;
    }

    setIsMarkingPrinted(true);
    try {
      const count =
        activeTab === "student"
          ? await studentService.markIdCardPrinted(ids)
          : await staffService.markIdCardPrinted(ids);
      toast.success(`Marked ${count} ID card(s) as printed`);
    } catch (error) {
      console.error("Failed to mark ID cards as printed:", error);
      toast.error("Failed to mark as printed. Please try again.");
    } finally {
      setIsMarkingPrinted(false);
    }
  };

  const studentPages = useMemo(
    () => chunkIdCardPages(filteredStudents),
    [filteredStudents],
  );

  const staffPages = useMemo(
    () => chunkIdCardPages(filteredStaff),
    [filteredStaff],
  );

  const previewStudent = useMemo(() => {
    if (printMode === "single" && selectedStudentId) {
      return (
        printableStudents.find((student) => student.id === selectedStudentId) ??
        ID_CARD_SAMPLE_STUDENT
      );
    }
    return ID_CARD_SAMPLE_STUDENT;
  }, [printMode, selectedStudentId, printableStudents]);

  const previewStaff = useMemo(() => {
    if (printMode === "single" && selectedStaffId) {
      return (
        printableStaff.find((staff) => staff.id === selectedStaffId) ??
        ID_CARD_SAMPLE_STAFF
      );
    }
    return ID_CARD_SAMPLE_STAFF;
  }, [printMode, selectedStaffId, printableStaff]);

  const previewLabel = useMemo(() => {
    if (printMode !== "single") {
      return "Sample card (bulk print uses the same theme for all cards)";
    }
    if (activeTab === "student" && selectedStudentId) {
      return `Previewing: ${previewStudent.fullName}`;
    }
    if (activeTab === "staff" && selectedStaffId) {
      return `Previewing: ${previewStaff.name}`;
    }
    return "Select a student or staff member to preview their card";
  }, [
    printMode,
    activeTab,
    selectedStudentId,
    selectedStaffId,
    previewStudent.fullName,
    previewStaff.name,
  ]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: buildIdCardPdfFilename({
      kind: activeTab,
      mode: printMode,
      personName:
        activeTab === "student"
          ? printableStudents.find((s) => s.id === selectedStudentId)?.fullName
          : printableStaff.find((s) => s.id === selectedStaffId)?.name,
      classFilter,
      sectionFilter,
    }).replace(/\.pdf$/i, ""),
    pageStyle: ID_CARD_PRINT_PAGE_STYLE,
    onPrintError: (error) => {
      console.error("Print failed:", error);
      toast.error("Print failed. Please try again.");
    },
    onAfterPrint: () => {
      if (markAsPrintedAfterExport) {
        void markCurrentSelectionAsPrinted();
      }
    },
  });

  const handleDownloadPdf = async () => {
    const container = printRef.current;
    if (!container) return;

    const pageElements = Array.from(
      container.querySelectorAll<HTMLElement>(".id-card-print-page"),
    );

    if (pageElements.length === 0) {
      toast.error("No ID cards to export");
      return;
    }

    const selectedStudent = printableStudents.find(
      (student) => student.id === selectedStudentId,
    );
    const selectedStaffMember = printableStaff.find(
      (staff) => staff.id === selectedStaffId,
    );

    const filename = buildIdCardPdfFilename({
      kind: activeTab,
      mode: printMode,
      personName:
        activeTab === "student"
          ? selectedStudent?.fullName
          : selectedStaffMember?.name,
      classFilter,
      sectionFilter,
    });

    setIsExportingPdf(true);
    try {
      await downloadIdCardPagesPdf(pageElements, filename);
      toast.success(`Downloaded ${filename}`);
      if (markAsPrintedAfterExport) {
        await markCurrentSelectionAsPrinted();
      }
    } catch (error) {
      console.error("ID card PDF export failed:", error);
      const message =
        error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to generate PDF: ${message}`);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const isLoading = studentsLoading || staffLoading || settingsLoading;
  const hasError = studentsError || staffError;
  const currentCount =
    activeTab === "student" ? filteredStudents.length : filteredStaff.length;
  const currentPages =
    activeTab === "student" ? studentPages.length : staffPages.length;
  const isSingleCard = printMode === "single";
  const isBulk = printMode === "bulk";
  const filterStats =
    activeTab === "student" ? studentFilterStats : staffFilterStats;

  if (isLoading) {
    return (
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <p className="text-destructive">
          Failed to load data for ID card printing. Please refresh and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner sm:h-12 sm:w-12">
            <CreditCard className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
              Print ID Cards
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground sm:mt-1 sm:text-base">
              Choose a theme, preview a card, then print or export PDF for one
              person or a whole class.
            </p>
          </div>
        </div>
        <Button variant="outline" asChild className="shrink-0">
          <Link href="../id-cards">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ID Card Data
          </Link>
        </Button>
      </div>

      <IdCardSettingsPanel />

      <Card className="id-card-print-toolbar">
        <CardHeader>
          <CardTitle>Print options</CardTitle>
          <CardDescription>
            Active records with a scan ID. In bulk mode you can require a photo,
            skip already-printed cards, and exclude individuals for phased runs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as PersonTab)}
          >
            <TabsList>
              <TabsTrigger value="student">Students</TabsTrigger>
              <TabsTrigger value="staff">Staff</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label>Print mode</Label>
                <RadioGroup
                  value={printMode}
                  onValueChange={(value) => setPrintMode(value as PrintMode)}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="single" id="print-single" />
                    <Label htmlFor="print-single" className="font-normal">
                      Single card
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="bulk" id="print-bulk" />
                    <Label htmlFor="print-bulk" className="font-normal">
                      Bulk print
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <TabsContent value="student" className="mt-0 space-y-4">
                {printMode === "single" ? (
                  <div className="space-y-2 lg:max-w-md">
                    <Label>Select student</Label>
                    <Select
                      value={selectedStudentId}
                      onValueChange={setSelectedStudentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {printableStudents.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.fullName}
                            {student.currentClass
                              ? ` — ${student.currentClass}`
                              : ""}
                            {student.currentSection
                              ? `-${student.currentSection}`
                              : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select
                        value={classFilter}
                        onValueChange={(value) => {
                          setClassFilter(value);
                          setSectionFilter("all");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All classes</SelectItem>
                          {classOptions.map((cls) => (
                            <SelectItem key={cls} value={cls}>
                              {cls}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Section</Label>
                      <Select
                        value={sectionFilter}
                        onValueChange={setSectionFilter}
                        disabled={classFilter === "all"}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              classFilter === "all"
                                ? "Select a class first"
                                : "All sections"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All sections</SelectItem>
                          {sectionOptions.map((section) => (
                            <SelectItem key={section} value={section}>
                              {section}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="staff" className="mt-0 space-y-4">
                {printMode === "single" ? (
                  <div className="space-y-2 lg:max-w-md">
                    <Label>Select staff member</Label>
                    <Select
                      value={selectedStaffId}
                      onValueChange={setSelectedStaffId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a staff member" />
                      </SelectTrigger>
                      <SelectContent>
                        {printableStaff.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    All active staff with a scan ID ({bulkStaff.length}).
                  </p>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {isBulk ? (
            <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">Bulk filters</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={hasPhotoOnly}
                    onCheckedChange={(checked) =>
                      setHasPhotoOnly(checked === true)
                    }
                  />
                  Only with profile photo
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={excludeAlreadyPrinted}
                    onCheckedChange={(checked) =>
                      setExcludeAlreadyPrinted(checked === true)
                    }
                  />
                  Exclude already printed
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={markAsPrintedAfterExport}
                    onCheckedChange={(checked) =>
                      setMarkAsPrintedAfterExport(checked === true)
                    }
                  />
                  Mark as printed after print / PDF
                </label>
              </div>

              <IdCardPrintExcludePicker
                options={excludeOptions}
                excludedIds={excludedIds}
                onExcludedIdsChange={setExcludedIds}
              />

              <p className="text-xs text-muted-foreground">
                Pool: {filterStats.afterBase} with scan ID
                {hasPhotoOnly && filterStats.withoutPhoto > 0
                  ? ` · ${filterStats.withoutPhoto} without photo skipped`
                  : ""}
                {excludeAlreadyPrinted && filterStats.alreadyPrinted > 0
                  ? ` · ${filterStats.alreadyPrinted} already printed in pool`
                  : ""}
                {excludedIds.length > 0
                  ? ` · ${excludedIds.length} manually excluded`
                  : ""}
              </p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button onClick={() => handlePrint()} disabled={currentCount === 0}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadPdf}
              disabled={currentCount === 0 || isExportingPdf}
            >
              <FileDown
                className={`mr-2 h-4 w-4 ${isExportingPdf ? "animate-pulse" : ""}`}
              />
              {isExportingPdf ? "Generating PDF…" : "Download PDF"}
            </Button>
            {isBulk ? (
              <Button
                variant="outline"
                onClick={() => void markCurrentSelectionAsPrinted()}
                disabled={currentCount === 0 || isMarkingPrinted}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isMarkingPrinted ? "Marking…" : "Mark as printed"}
              </Button>
            ) : null}
            <p className="text-sm text-muted-foreground">
              {currentCount} card(s) · {currentPages} sheet(s)
            </p>
          </div>
        </CardContent>
      </Card>

      <IdCardThemePicker
        academicYear={academicYear}
        principalSignatureUrl={principalSignatureUrl}
        previewKind={activeTab}
        previewStudent={previewStudent}
        previewStaff={previewStaff}
        previewLabel={previewLabel}
        onAcademicYearChange={setAcademicYear}
      />

      {currentCount === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {printMode === "single"
              ? "Select a student or staff member with a scan ID to enable print and PDF export."
              : "No ID cards match the current filters. Ensure students/staff have a scan ID assigned."}
          </CardContent>
        </Card>
      ) : null}

      <div
        ref={printRef}
        aria-hidden
        className="id-card-print-only pointer-events-none fixed -left-[9999px] top-0 z-[-1] bg-white print:static print:z-auto print:pointer-events-auto"
      >
        {activeTab === "student" ? (
          <IdCardPrintPages
            kind="student"
            studentPages={studentPages}
            themeId={themeId}
            academicYear={academicYear}
            principalSignatureUrl={principalSignatureUrl}
            singleCard={isSingleCard}
          />
        ) : (
          <IdCardPrintPages
            kind="staff"
            staffPages={staffPages}
            themeId={themeId}
            academicYear={academicYear}
            principalSignatureUrl={principalSignatureUrl}
            singleCard={isSingleCard}
          />
        )}
      </div>
    </div>
  );
}
