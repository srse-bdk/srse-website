"use client";

import type { DayOfWeek, TimeTable } from "@/lib/types/time-table.type";
import { cn } from "@/lib/utils";
import { Layout } from "lucide-react";
import { forwardRef } from "react";

interface TimeTablePrintViewProps {
  timeTable: TimeTable;
  showTeacher?: boolean;
}

const DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const TimeTablePrintView = forwardRef<
  HTMLDivElement,
  TimeTablePrintViewProps
>(({ timeTable, showTeacher = true }, ref) => {
  return (
    <div ref={ref} className="bg-white text-black overflow-hidden">
      <style>
        {`
                        @media print {
                            @page {
                                margin: 15mm !important;
                                size: A4 landscape;
                            }
                            body {
                                -webkit-print-color-adjust: exact;
                                print-color-adjust: exact;
                                margin: 0;
                                padding: 0;
                            }
                        }
                    `}
      </style>
      <div className="p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 border-b-2 border-primary pb-2">
          <div className="flex items-center gap-3 text-black">
            <div className="h-12 w-12 flex items-center justify-center overflow-hidden">
              <img
                src="/logo.png"
                alt="School Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="space-y-0">
              <h2 className="text-xl font-black uppercase tracking-tight text-black leading-none">
                S R School of Excellence
              </h2>
              <p>Bhadrak, Odisha</p>
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <div className="inline-block bg-black text-white px-2 py-0.5 font-black uppercase tracking-widest text-[8px]">
              Academic Schedule
            </div>
            <div className="text-xl font-black text-primary leading-none">
              {timeTable.academicYear}
            </div>
          </div>
        </div>

        <div className="flex items-end justify-between mb-2">
          <div className="space-y-0">
            <h3 className="text-2xl font-black tracking-tighter uppercase mb-1 text-black leading-none">
              {timeTable.className}
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                <Layout size={12} className="text-primary" />
                <span className="text-[10px] font-bold uppercase text-black">
                  Section {timeTable.section}
                </span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-right">
              <div className="text-[8px] font-black uppercase text-gray-400">
                Total Periods
              </div>
              <div className="text-base font-black text-black leading-none">
                {timeTable.config.numberOfPeriods}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[8px] font-black uppercase text-gray-400">
                Hours
              </div>
              <div className="text-base font-black text-black leading-none">
                {timeTable.config.startTime} - {timeTable.config.endTime}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-2 border-black border-collapse break-inside-avoid text-[9px]">
          <thead>
            <tr className="bg-black text-white">
              <th className="px-3 py-1 border-2 border-white text-left font-black uppercase tracking-widest w-28">
                Period
              </th>
              {DAYS.map(
                (day) =>
                  timeTable.config.daysOfWeek.includes(day) && (
                    <th
                      key={day}
                      className="p-1 border-2 border-white text-center font-black uppercase tracking-widest"
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
                  ? "LUNCH"
                  : `#${currentPeriodNumber++}`;

                return (
                  <tr key={rowIdx} className="border-t-[1px] border-black">
                    <td
                      className={cn(
                        "px-3 py-1 border-r-2 border-black",
                        isLunch ? "bg-gray-100" : "bg-gray-50",
                      )}
                    >
                      <div className="flex flex-col gap-0">
                        <span
                          className={cn(
                            "text-xs font-black",
                            isLunch ? "text-gray-400" : "text-primary",
                          )}
                        >
                          {periodLabel}
                        </span>
                        <div className="text-[8px] font-bold text-gray-500">
                          {templateSlot.startTime} - {templateSlot.endTime}
                        </div>
                      </div>
                    </td>
                    {DAYS.map(
                      (day) =>
                        timeTable.config.daysOfWeek.includes(day) && (
                          <td
                            key={`${day}-${rowIdx}`}
                            className="p-1 border-r-[1px] border-black"
                          >
                            {isLunch ? (
                              <div className="h-full flex items-center justify-center py-0.5">
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest italic">
                                  LUNCH BREAK
                                </span>
                              </div>
                            ) : timeTable.schedule[day]?.[rowIdx]?.subjectId ? (
                              <div className="space-y-0 text-center py-0.5">
                                <div className="text-[10px] font-black leading-none border-b-1 border-gray-100 pb-0.5 mb-0.5 text-black">
                                  {timeTable.schedule[day][rowIdx].subjectName}
                                </div>
                                {showTeacher && (
                                  <div className="text-[8px] font-bold text-gray-500 uppercase tracking-tight">
                                    {timeTable.schedule[day][rowIdx].staffName}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center">
                                <span className="text-[8px] font-black text-gray-200 uppercase tracking-widest">
                                  ---
                                </span>
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

        {/* Note */}
        <div className="mt-4 break-inside-avoid">
          <p className="text-[10px] font-black uppercase tracking-widest text-black mb-1">
            Note:
          </p>
          <p className="text-[9px] font-bold text-gray-600 whitespace-pre-wrap">
            {timeTable.note ||
              "Second Saturday in every month is holiday for school"}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-start justify-between break-inside-avoid">
          <div className="max-w-md">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
              Verification & Authority
            </p>
            <div className="flex gap-6">
              <div className="space-y-2">
                <div className="h-6 w-32 border-b-2 border-black"></div>
                <p className="text-[8px] font-black uppercase tracking-tighter text-black">
                  Class Teacher Signature
                </p>
              </div>
              <div className="space-y-2">
                <div className="h-6 w-32 border-b-2 border-black"></div>
                <p className="text-[8px] font-black uppercase tracking-tighter text-black">
                  Principal Signature
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

TimeTablePrintView.displayName = "TimeTablePrintView";
