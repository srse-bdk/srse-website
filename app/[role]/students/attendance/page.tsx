"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BulkAttendanceForm } from "./_components/bulk-attendance-form";
import { AttendanceCalendar } from "./_components/attendance-calendar";
import { AttendanceTable } from "./_components/attendance-table";
import { AttendanceReports } from "./_components/attendance-reports";
import { Calendar, FileText, List, BarChart3 } from "lucide-react";

export default function StudentAttendancePage() {
  const [activeTab, setActiveTab] = useState("mark");

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
            <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Student Attendance
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1 font-medium">
              Mark and manage student records.
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 h-auto gap-2 p-1 sm:flex sm:w-auto sm:gap-0 sm:p-1">
          <TabsTrigger value="mark" className="py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <FileText className="mr-2 h-4 w-4" />
            <span className="truncate">Mark Attendance</span>
          </TabsTrigger>
          <TabsTrigger value="view" className="py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <List className="mr-2 h-4 w-4" />
            <span className="truncate">View Records</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Calendar className="mr-2 h-4 w-4" />
            <span className="truncate">Calendar View</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="py-2.5 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="mr-2 h-4 w-4" />
            <span className="truncate">Reports</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mark" className="space-y-4">
          <BulkAttendanceForm />
        </TabsContent>

        <TabsContent value="view" className="space-y-4">
          <AttendanceTable />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <AttendanceCalendar />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <AttendanceReports />
        </TabsContent>
      </Tabs>
    </div>
  );
}

