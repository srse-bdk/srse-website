"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { mutate } from "@atechhub/firebase";
import { getArrFromObj } from "@ashirbad/js-core";
import { useAppStore } from "@/hooks/use-app-store";
import { studentService } from "@/lib/services";
import type { Student } from "@/lib/types/student.type";
import type { FeeRecord } from "@/lib/types/fee.type";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Bell,
  CalendarClock,
  GraduationCap,
  Sparkles,
  User,
  Wallet,
} from "lucide-react";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function StudentDashboard() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const user = useAppStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [feeSummary, setFeeSummary] = useState({ total: 0, paid: 0, pending: 0 });

  useEffect(() => {
    async function load() {
      if (!user?.studentId) {
        setLoading(false);
        return;
      }

      try {
        const [studentRecord, feesData] = await Promise.all([
          studentService.getById(user.studentId),
          mutate({ action: "get", path: "feeIssued" }),
        ]);

        setStudent(studentRecord);

        const fees = getArrFromObj(feesData || {}) as unknown as FeeRecord[];
        const myFees = fees.filter((fee) => fee.studentId === user.studentId);
        const total = myFees.reduce((sum, fee) => sum + (Number(fee.amount) || 0), 0);
        const paid = myFees.reduce(
          (sum, fee) => sum + (Number(fee.paidAmount) || 0),
          0,
        );

        setFeeSummary({ total, paid, pending: Math.max(0, total - paid) });
      } catch (error) {
        console.error("Error loading student dashboard:", error);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.studentId]);

  const initials =
    student?.fullName
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "S";

  if (loading) {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    );
  }

  const quickLinks = [
    {
      title: "Fee Details",
      description: "View dues and payment history",
      icon: Wallet,
      href: `/${role}/fees`,
    },
    {
      title: "Class Time Table",
      description: "View your class schedule",
      icon: CalendarClock,
      href: `/${role}/time-table`,
    },
    {
      title: "Gate activity",
      description: "Arrival and dismissal history",
      icon: Bell,
      href: `/${role}/gate-activity`,
    },
    ...(user?.studentId
      ? [
          {
            title: "My Profile",
            description: "View your academic profile",
            icon: User,
            href: `/${role}/students/${user.studentId}`,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.name?.split(" ")[0] || student?.firstName || "Student"}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Your class info, fees, and schedule in one place.
          </p>
        </div>
      </div>

      {student ? (
        <Card>
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-16 w-16 border-2 border-border">
              <AvatarImage src={student.profilePicture} alt={student.fullName} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <CardTitle>{student.fullName}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {student.currentClass ? (
                  <Badge variant="secondary" className="gap-1">
                    <GraduationCap className="h-3 w-3" />
                    Class {student.currentClass}
                    {student.currentSection ? ` · ${student.currentSection}` : ""}
                  </Badge>
                ) : null}
                {student.rollNumber ? (
                  <Badge variant="outline">Roll {student.rollNumber}</Badge>
                ) : null}
                {student.admissionNumber ? (
                  <Badge variant="outline">Adm. {student.admissionNumber}</Badge>
                ) : null}
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">₹{feeSummary.total.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              ₹{feeSummary.paid.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">
              ₹{feeSummary.pending.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card
              key={link.title}
              className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
              onClick={() => router.push(link.href)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{link.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{link.description}</p>
                <Button variant="link" className="px-0 mt-2 h-auto">
                  Open →
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
