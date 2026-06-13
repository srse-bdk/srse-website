"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRightLeft,
  Calendar,
  ClipboardList,
  Tags,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/use-app-store";
import { leaveTypeService, staffLeaveAccrualService } from "@/lib/services";
import { QUARTERLY_ACCRUAL_DESCRIPTION } from "@/lib/config/leave-accrual";
import { StaffLeaveDashboard } from "./_components/staff-leave-dashboard";

const ADMIN_SECTIONS = [
  {
    title: "School Calendar",
    description: "Sundays, second Saturdays, national/state holidays, vacations.",
    href: "calendar",
    icon: Calendar,
  },
  {
    title: "Leave Types",
    description: "Quarterly accrual: 2 CL, 2 SL, 1 EL per quarter.",
    href: "types",
    icon: Tags,
  },
  {
    title: "Applications",
    description: "Review and approve staff leave requests.",
    href: "applications",
    icon: ClipboardList,
  },
  {
    title: "Convert Absences",
    description: "Mark recorded absences as approved leave.",
    href: "convert",
    icon: ArrowRightLeft,
  },
];

export default function LeavePage() {
  const params = useParams();
  const role = params.role as string;
  const user = useAppStore((state) => state.user);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isAdmin) return;
    void (async () => {
      await leaveTypeService.ensureDefaults();
      await leaveTypeService.syncAccrualAnnualLimits();
      await staffLeaveAccrualService.ensureQuarterlyAccrualsForAllStaff();
    })();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <StaffLeaveDashboard />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leave Management</h1>
        <p className="text-muted-foreground">
          Configure holidays, leave types, and staff applications.{" "}
          {QUARTERLY_ACCRUAL_DESCRIPTION}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.href}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Icon className="size-5" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <Link href={`/${role}/leave/${section.href}`}>Open</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
