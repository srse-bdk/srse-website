"use client";

import { TimeTablePrintView } from "@/components/time-table/print-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { db } from "@/lib/firebase";
import { ref, update } from "firebase/database";
import { toast } from "sonner";
import type { DayOfWeek, TimeTable } from "@/lib/types/time-table.type";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Clock,
  Download,
  Layout,
  Loader2,
  Sparkles,
  Users,
  Edit2,
  Save,
  X,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";

const DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function ViewTimeTablePage() {
  const params = useParams();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);
  const [showTeacher, setShowTeacher] = useState(true);
  
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);

  const id = params.id as string;
  const role = params.role as string;
  
  const defaultNote = "Second Saturday in every month is holiday for school";

  const { data, loading } = useFirebaseRealtime<TimeTable>(
    `time-tables/${id}`,
    {
      asArray: false,
    },
  );

  const timeTable = data as unknown as TimeTable | null;
  const displayNote = timeTable?.note || defaultNote;

  const handleEditNote = () => {
    setNoteInput(displayNote);
    setIsEditingNote(true);
  };

  const handleSaveNote = async () => {
    if (!id) return;
    try {
      setIsSavingNote(true);
      const timetableRef = ref(db, `time-tables/${id}`);
      await update(timetableRef, { note: noteInput });
      setIsEditingNote(false);
      toast.success("Note updated successfully");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const searchParams = useSearchParams();

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `TimeTable_${timeTable?.className}_${timeTable?.section}`,
  });

  useEffect(() => {
    if (!loading && timeTable && searchParams.get("print") === "true") {
      const timer = setTimeout(() => {
        handlePrint();
        // Clear the print param to avoid re-triggering
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, timeTable, searchParams, handlePrint]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!timeTable) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Time Table not found</h2>
        <Button
          onClick={() => router.push(`/${role}/time-table`)}
          className="mt-4"
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-8 space-y-8 max-w-[1400px] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/${role}/time-table`)}
            className="rounded-full hover:bg-muted"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors uppercase font-bold tracking-widest text-[10px]">
                Active Schedule
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">
                {timeTable.academicYear}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight capitalize">
              {timeTable.className} - {timeTable.section}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Table Preview (Screen View) */}
      <Card className="shadow-2xl border-primary/10 bg-background/50 backdrop-blur-md overflow-hidden ring-1 ring-border/5">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pb-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {timeTable.config.startTime} - {timeTable.config.endTime}
              </span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Layout className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {timeTable.config.numberOfPeriods} Periods
              </span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">
                {timeTable.config.periodDuration}m Duration
              </span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="flex items-center gap-2">
              <Switch
                id="show-teacher"
                checked={showTeacher}
                onCheckedChange={setShowTeacher}
              />
              <Label
                htmlFor="show-teacher"
                className="text-sm font-semibold cursor-pointer"
              >
                Show Teacher Name
              </Label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/30">
                <th className="p-4 border-r text-left text-xs font-bold uppercase tracking-widest text-muted-foreground w-40">
                  Period / Day
                </th>
                {DAYS.map(
                  (day) =>
                    timeTable.config.daysOfWeek.includes(day) && (
                      <th
                        key={day}
                        className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[180px]"
                      >
                        {day}
                      </th>
                    ),
                )}
              </tr>
            </thead>
            <tbody>
              {(() => {
                const activeDay = timeTable.config.daysOfWeek[0] || "Monday";
                const rows = timeTable.schedule[activeDay] || [];
                let currentPeriodNumber = 1;

                return rows.map((templateSlot, rowIdx) => {
                  const isLunch = templateSlot.isLunchBreak;
                  const periodLabel = isLunch
                    ? "Break"
                    : `Period ${currentPeriodNumber++}`;

                  return (
                    <tr
                      key={rowIdx}
                      className={cn(
                        "border-t group transition-colors",
                        isLunch
                          ? "bg-orange-50/30 hover:bg-orange-50/50"
                          : "hover:bg-primary/[0.02]",
                      )}
                    >
                      <td
                        className={cn(
                          "p-4 border-r bg-muted/10",
                          isLunch && "bg-orange-100/10",
                        )}
                      >
                        <div className="flex flex-col gap-1">
                          <span
                            className={cn(
                              "text-sm font-bold",
                              isLunch ? "text-orange-600" : "text-primary",
                            )}
                          >
                            {periodLabel}
                          </span>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-bold">
                            <Clock className="h-3 w-3" />
                            {templateSlot.startTime} - {templateSlot.endTime}
                          </div>
                        </div>
                      </td>
                      {DAYS.map(
                        (day) =>
                          timeTable.config.daysOfWeek.includes(day) && (
                            <td key={`${day}-${rowIdx}`} className="p-4">
                              {isLunch ? (
                                <div className="py-3 px-4 rounded-xl bg-orange-100/20 border border-orange-200/30 text-orange-700 font-bold text-[10px] uppercase tracking-widest text-center">
                                  Lunch Break
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    "p-4 rounded-2xl border transition-all duration-300 h-full flex flex-col justify-center",
                                    timeTable.schedule[day]?.[rowIdx]?.subjectId
                                      ? "bg-card border-primary/10 shadow-sm hover:shadow-md hover:border-primary/20"
                                      : "bg-muted/20 border-border/50 border-dashed opacity-40",
                                  )}
                                >
                                  {timeTable.schedule[day]?.[rowIdx]
                                    ?.subjectId ? (
                                    <div className="space-y-2">
                                      <div className="text-sm font-extrabold leading-tight text-foreground/90">
                                        {
                                          timeTable.schedule[day][rowIdx]
                                            .subjectName
                                        }
                                      </div>
                                      {showTeacher && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/70">
                                          <Users className="h-2.5 w-2.5" />
                                          {
                                            timeTable.schedule[day][rowIdx]
                                              .staffName
                                          }
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[10px] font-bold text-muted-foreground tracking-widest uppercase text-center">
                                      Free Period
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          ),
                      )}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Note Section */}
      <Card className="shadow-2xl border-primary/10 bg-background/50 backdrop-blur-md overflow-hidden ring-1 ring-border/5">
        <CardHeader className="bg-gradient-to-r from-primary/5 via-transparent to-accent/5 py-4 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground/90">Note</h3>
            {role === "admin" && !isEditingNote && (
              <Button variant="ghost" size="sm" onClick={handleEditNote} className="h-8 gap-2">
                <Edit2 className="h-4 w-4" />
                Edit Note
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {isEditingNote ? (
            <div className="space-y-4">
              <Textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Enter note..."
                className="min-h-[100px] resize-y"
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingNote(false)}
                  disabled={isSavingNote}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNote}
                  disabled={isSavingNote}
                >
                  {isSavingNote ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-medium whitespace-pre-wrap">
              {displayNote}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Printable Component (Hidden from screen) */}
      <div className="absolute top-[-9999px] left-[-9999px] pointer-events-none">
        <TimeTablePrintView ref={printRef} timeTable={timeTable} showTeacher={showTeacher} />
      </div>
    </div>
  );
}
