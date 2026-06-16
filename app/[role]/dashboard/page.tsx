"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  UserCheck,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Award,
  Plus,
  CalendarClock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, Cell, XAxis, YAxis, Legend } from "recharts";
import { useAppStore } from "@/hooks/use-app-store";
import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import {
  studentService,
  enrollmentService,
  classService,
  attendanceService,
  blogService,
  staffService,
} from "@/lib/services";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types/student.type";
import { StaffDashboard } from "./_components/staff-dashboard";
import { StudentDashboard } from "./_components/student-dashboard";

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalEnrollments: number;
  activeEnrollments: number;
  totalClasses: number;
  activeClasses: number;
  totalStaff: number;
  todayAttendance: number;
  totalBlogs: number;
  publishedBlogs: number;
}

const enrollmentChartConfig = {
  count: {
    label: "Enrollments",
    color: "#3b82f6",
  },
} satisfies ChartConfig;

const attendanceChartConfig = {
  present: {
    label: "Present",
    color: "#22c55e",
  },
  absent: {
    label: "Absent",
    color: "#ef4444",
  },
} satisfies ChartConfig;

const statusChartConfig = {
  Active: {
    label: "Active",
    color: "#22c55e",
  },
  Inactive: {
    label: "Inactive",
    color: "#ef4444",
  },
  Graduated: {
    label: "Graduated",
    color: "#3b82f6",
  },
  Transferred: {
    label: "Transferred",
    color: "#f59e0b",
  },
} satisfies ChartConfig;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

const statCards = [
  {
    title: "Total Students",
    value: "totalStudents",
    subtitle: "activeStudents",
    subtitleLabel: "active students",
    icon: Users,
    gradient: "from-blue-500 to-blue-600",
    bgGradient: "from-blue-500/10 to-blue-600/5",
  },
  {
    title: "Active Enrollments",
    value: "activeEnrollments",
    subtitle: "totalEnrollments",
    subtitleLabel: "total enrollments",
    icon: GraduationCap,
    gradient: "from-green-500 to-green-600",
    bgGradient: "from-green-500/10 to-green-600/5",
  },
  {
    title: "Classes",
    value: "activeClasses",
    subtitle: "totalClasses",
    subtitleLabel: "total classes",
    icon: BookOpen,
    gradient: "from-purple-500 to-purple-600",
    bgGradient: "from-purple-500/10 to-purple-600/5",
  },
  {
    title: "Today's Attendance",
    value: "todayAttendance",
    subtitle: null,
    subtitleLabel: "staff members present",
    icon: Calendar,
    gradient: "from-orange-500 to-orange-600",
    bgGradient: "from-orange-500/10 to-orange-600/5",
  },
  {
    title: "Published Blogs",
    value: "publishedBlogs",
    subtitle: "totalBlogs",
    subtitleLabel: "total blogs",
    icon: FileText,
    gradient: "from-pink-500 to-pink-600",
    bgGradient: "from-pink-500/10 to-pink-600/5",
  },
  {
    title: "Total Staff",
    value: "totalStaff",
    subtitle: null,
    subtitleLabel: "active staff members",
    icon: UserCheck,
    gradient: "from-indigo-500 to-indigo-600",
    bgGradient: "from-indigo-500/10 to-indigo-600/5",
  },
];

const parentQuickActions = [
  {
    title: "Fees",
    description: "View and pay installments",
    icon: FileText,
    href: (role: string) => `/${role}/fees`,
    gradient: "from-blue-500 to-blue-600",
  },
  {
    title: "Attendance",
    description: "Track daily attendance",
    icon: UserCheck,
    href: (role: string) => `/${role}/children`,
    gradient: "from-green-500 to-green-600",
  },
  {
    title: "Results",
    description: "View exam performance",
    icon: Award,
    href: (role: string) => `/${role}/children`,
    gradient: "from-purple-500 to-purple-600",
  },
  {
    title: "Time Table",
    description: "Class & exam schedules",
    icon: CalendarClock,
    href: (role: string) => `/${role}/time-table`,
    gradient: "from-orange-500 to-orange-600",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const user = useAppStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalEnrollments: 0,
    activeEnrollments: 0,
    totalClasses: 0,
    activeClasses: 0,
    totalStaff: 0,
    todayAttendance: 0,
    totalBlogs: 0,
    publishedBlogs: 0,
  });
  const [enrollmentData, setEnrollmentData] = useState<Array<{ month: string; count: number }>>([]);
  const [attendanceData, setAttendanceData] = useState<Array<{ day: string; present: number; absent: number }>>([]);
  const [statusData, setStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [children, setChildren] = useState<Student[]>([]);
  const [parentStats, setParentStats] = useState({
    totalFees: 0,
    paidFees: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);

        if (user?.role === "staff" || user?.role === "student") {
          return;
        }

        const isParent = user?.role === "parent";

        if (isParent) {
          const [allStudents, allBlogs, allFees, allAttendance] = await Promise.all([
            studentService.getAll(),
            blogService.getPublished(),
            mutate({ action: "get", path: "feePayments" }),
            mutate({ action: "get", path: "studentAttendance" })
          ]);

          const linkedChildren = allStudents.filter(s => user?.validChildrenIds?.includes(s.id));
          setChildren(linkedChildren);

          const schoolNotices = allBlogs.filter(b => b.category === "notice");
          setNotices(schoolNotices);

          // Calculate some parent stats
          const feesList = getArrFromObj(allFees || {}) as any[];
          const attendanceList = getArrFromObj(allAttendance || {}) as any[];

          const childFees = feesList.filter(f => user?.validChildrenIds?.includes(f.studentId));
          const totalFees = childFees.reduce((sum, f) => sum + (Number(f.amount) || 0), 0);
          const paidFees = childFees.reduce((sum, f) => sum + (Number(f.paidAmount) || 0), 0);

          const childAttendance = attendanceList.filter(a => user?.validChildrenIds?.includes(a.studentId));
          const presentDays = childAttendance.filter(a => a.status === "present").length;
          const attendanceRate = childAttendance.length > 0 ? (presentDays / childAttendance.length) * 100 : 0;

          setParentStats({
            totalFees,
            paidFees,
            attendanceRate
          });
        } else {
          // Fetch all data in parallel
          const [students, enrollments, classes, attendance, blogs, staff] = await Promise.all([
            studentService.getAll(),
            enrollmentService.getAll(),
            classService.getAll(),
            attendanceService.getAll(),
            blogService.getAll(),
            staffService.getAll(),
          ]);

          // Calculate stats
          const activeStudents = students.filter((s) => s.status === "active").length;
          const activeEnrollments = enrollments.filter((e) => e.status === "active").length;
          const activeClasses = classes.filter((c) => c.status === "active").length;
          const today = format(new Date(), "yyyy-MM-dd");
          const todayAttendance = attendance.filter((a) => a.date === today && a.status === "present").length;
          const publishedBlogs = blogs.filter((b) => b.status === "published").length;

          // Calculate status distribution
          const statusCounts = {
            active: students.filter((s) => s.status === "active").length,
            inactive: students.filter((s) => s.status === "inactive").length,
            graduated: students.filter((s) => s.status === "graduated").length,
            transferred: students.filter((s) => s.status === "transferred").length,
          };

          const statusChartData = [
            { name: "Active", value: statusCounts.active, color: "#22c55e" },
            { name: "Inactive", value: statusCounts.inactive, color: "#ef4444" },
            { name: "Graduated", value: statusCounts.graduated, color: "#3b82f6" },
            { name: "Transferred", value: statusCounts.transferred, color: "#f59e0b" },
          ].filter((item) => item.value > 0);

          // Calculate enrollment trends (last 6 months)
          const enrollmentTrends = new Map<string, number>();
          const now = new Date();
          for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = format(date, "MMM yyyy");
            enrollmentTrends.set(monthKey, 0);
          }

          enrollments.forEach((enrollment) => {
            const enrollmentDate = new Date(enrollment.enrollmentDate);
            const monthKey = format(enrollmentDate, "MMM yyyy");
            if (enrollmentTrends.has(monthKey)) {
              enrollmentTrends.set(monthKey, (enrollmentTrends.get(monthKey) || 0) + 1);
            }
          });

          const enrollmentChartData = Array.from(enrollmentTrends.entries()).map(([month, count]) => ({
            month,
            count,
          }));

          // Calculate attendance trends (last 7 days)
          const attendanceTrends: Array<{ day: string; present: number; absent: number }> = [];
          for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dayKey = format(date, "yyyy-MM-dd");
            const dayLabel = format(date, "EEE");

            const dayAttendance = attendance.filter((a) => a.date === dayKey);
            const present = dayAttendance.filter((a) => a.status === "present").length;
            const absent = dayAttendance.filter((a) => a.status === "absent").length;

            attendanceTrends.push({
              day: dayLabel,
              present,
              absent,
            });
          }

          setStats({
            totalStudents: students.length,
            activeStudents,
            totalEnrollments: enrollments.length,
            activeEnrollments,
            totalClasses: classes.length,
            activeClasses,
            totalStaff: staff.length,
            todayAttendance,
            totalBlogs: blogs.length,
            publishedBlogs,
          });

          setEnrollmentData(enrollmentChartData);
          setAttendanceData(attendanceTrends);
          setStatusData(statusChartData);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [user?.role]);

  const quickActions = [
    {
      title: "Student",
      description: "Manage student records",
      icon: Plus,
      href: "#",
      gradient: "from-blue-500 to-blue-600",
      subActions: [
        { label: "Add Student", href: `/${role}/students/create` },
        { label: "Student List", href: `/${role}/students` },
      ],
    },
    {
      title: "Attendance",
      description: "Manage attendance records",
      icon: UserCheck,
      href: "#",
      gradient: "from-green-500 to-green-600",
      subActions: [
        { label: "Staff Attendance", href: `/${role}/attendance` },
        { label: "Student Attendance", href: `/${role}/students/attendance` },
      ],
    },
    {
      title: "Blog",
      description: "Manage blog posts",
      icon: FileText,
      href: "#",
      gradient: "from-purple-500 to-purple-600",
      subActions: [
        { label: "Create Blog", href: `/${role}/blogs/create` },
        { label: "View Blogs", href: `/${role}/blogs` },
      ],
    },
    {
      title: "Classes",
      description: "View and manage classes",
      icon: GraduationCap,
      href: "#",
      gradient: "from-orange-500 to-orange-600",
      subActions: [
        { label: "Class Enrollment", href: `/${role}/students/enrollment` },
        { label: "Class Management", href: `/${role}/students/enrollment/classes` },
      ],
    },
    {
      title: "Certificates",
      description: "Generate staff certificates",
      icon: Award,
      href: "#",
      gradient: "from-cyan-500 to-cyan-600",
      subActions: [
        {
          label: "Compensation Package",
          href: `/${role}/certificates/compensation-package`,
        },
        {
          label: "Annual Increment",
          href: `/${role}/certificates/annual-increment`,
        },
        {
          label: "Terms & Conditions",
          href: `/${role}/certificates/terms-conditions`,
        },
        { label: "Experience Letter", href: `/${role}/certificates/experience` },
        { label: "Appointment Letter", href: `/${role}/certificates/appointment` },
      ],
    },
    {
      title: "Time Table",
      description: "Manage class schedules",
      icon: CalendarClock,
      href: "#",
      gradient: "from-pink-500 to-pink-600",
      subActions: [
        { label: "View Time Table", href: `/${role}/time-table` },
        { label: "Generate Time Table", href: `/${role}/time-table/generate` },
      ],
    },
  ];

  if (user?.role === "staff") {
    return <StaffDashboard />;
  }

  if (user?.role === "student") {
    return <StudentDashboard />;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border shadow-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-12 sm:w-16" />
                  <Skeleton className="h-5 sm:h-6 w-6 sm:w-8" />
                </div>
                <Skeleton className="h-8 w-8 sm:h-9 sm:w-9 rounded-full" />
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-1">
                <Skeleton className="h-2 w-16 sm:w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (user?.role === "parent") {
    return (
      <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {getGreeting()}, {user?.name?.split(" ")[0] || "Parent"}! 👋
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1 font-medium">
                Here's what's happening with your children today.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {parentQuickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className="group relative overflow-hidden border-none ring-1 ring-border bg-background/50 backdrop-blur-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1 cursor-pointer"
                onClick={() => router.push(action.href(role))}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-10", action.gradient)} />
                <CardHeader className="p-4 flex flex-row items-center gap-4">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg", action.gradient)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold">{action.title}</CardTitle>
                    <CardDescription className="text-xs truncate">{action.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
          {/* Children Summary */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight">My Children</h2>
              <Button variant="ghost" size="sm" onClick={() => router.push(`/${role}/children`)}>
                View Profiles <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {children.map((child) => (
                <Card key={child.id} className="relative overflow-hidden border-none ring-1 ring-border bg-background shadow-md transition-all hover:shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{child.fullName}</CardTitle>
                        <CardDescription>Roll No: {child.rollNumber || "N/A"}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground text-[10px] uppercase font-bold">Class</p>
                        <p className="font-bold">{child.currentClass || "N/A"}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-muted-foreground text-[10px] uppercase font-bold">Section</p>
                        <p className="font-bold">{child.currentSection || "N/A"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Fees Stats */}
            <Card className="border-none ring-1 ring-border bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Fee Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Total Fee</p>
                    <p className="text-2xl font-black">₹{parentStats.totalFees}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-black text-green-600">₹{parentStats.paidFees}</p>
                  </div>
                </div>
                <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(parentStats.paidFees / parentStats.totalFees) * 100 || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* School Notices */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">Important Notices</h2>
            <div className="space-y-4">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <Card key={notice.id} className="border-none ring-1 ring-border bg-orange-50/30 dark:bg-orange-900/10">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[10px] font-bold uppercase text-orange-600 tracking-wider">Announcement</span>
                      </div>
                      <CardTitle className="text-base">{notice.title}</CardTitle>
                      <CardDescription className="text-xs">{format(new Date(notice.publishedAt), "MMM dd, yyyy")}</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <p className="text-sm line-clamp-3 text-muted-foreground">{notice.excerpt}</p>
                      <Button variant="link" className="p-0 h-auto text-xs mt-2" onClick={() => router.push(`/${role}/blogs/${notice.id}`)}>
                        Read More
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground">
                  No active notices
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              {getGreeting()}, {user?.name?.split(" ")[0] || "User"}! 👋
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1 font-medium">
              Here's what's happening today.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((statCard) => {
          const Icon = statCard.icon;
          const value = stats[statCard.value as keyof DashboardStats] as number;
          const subtitleValue = statCard.subtitle
            ? (stats[statCard.subtitle as keyof DashboardStats] as number)
            : null;

          return (
            <Card
              key={statCard.title}
              className="group relative overflow-hidden border-none bg-background/50 backdrop-blur-sm ring-1 ring-border transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-10", statCard.bgGradient)} />
              <CardHeader className="relative flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
                <div className="flex flex-col space-y-0.5 sm:space-y-1 z-10">
                  <CardTitle className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    {statCard.title}
                  </CardTitle>
                  <div className={cn("text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r", statCard.gradient)}>
                    {value}
                  </div>
                </div>
                <div className={cn("flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-gradient-to-br shadow-sm opacity-90 transition-transform duration-500 group-hover:rotate-12", statCard.gradient)}>
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative p-3 sm:p-4 pt-1">
                {subtitleValue !== null ? (
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate font-semibold">
                    <span className="text-foreground/70">{subtitleValue}</span> {statCard.subtitleLabel}
                  </p>
                ) : (
                  <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate font-semibold">{statCard.subtitleLabel}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Quick Actions</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">Commonly used tools and features</p>
          </div>
          <TrendingUp className="h-5 w-5 text-primary opacity-50" />
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card
                key={action.title}
                className={cn(
                  "group relative overflow-hidden border-none ring-1 ring-border bg-background/50 backdrop-blur-sm transition-all duration-500 hover:shadow-2xl hover:-translate-y-1.5 flex flex-col justify-between h-full min-h-[160px]",
                  !action.subActions && "cursor-pointer"
                )}
                onClick={() => !action.subActions && router.push(action.href)}
              >
                <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-500 group-hover:opacity-10", action.gradient)} />

                {/* Watermark Icon */}
                <div className="absolute -bottom-10 -right-10 opacity-[0.03] transition-all duration-700 group-hover:opacity-[0.08] group-hover:scale-125 group-hover:-rotate-12 group-hover:translate-x-4 group-hover:translate-y-4">
                  <Icon className="h-48 w-48" />
                </div>

                <CardHeader className="relative z-10 pb-0">
                  <div className={cn("mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br text-white shadow-lg transition-transform duration-500 group-hover:scale-110", action.gradient)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-base sm:text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{action.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm line-clamp-2 mt-1 font-medium">{action.description}</CardDescription>
                </CardHeader>

                {action.subActions && (
                  <CardContent className="relative z-10 pt-4 mt-auto">
                    <div className="flex flex-col gap-2">
                      {action.subActions.map((sub) => (
                        <Button
                          key={sub.label}
                          variant="secondary"
                          size="sm"
                          className="w-full justify-between text-[11px] sm:text-xs h-8 sm:h-9 bg-background/80 hover:bg-primary hover:text-primary-foreground border-none font-semibold transition-all duration-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(sub.href);
                          }}
                        >
                          <span className="truncate">{sub.label}</span>
                          <ArrowRight className="h-3 w-3 opacity-70 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Enrollment Trends */}
        <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold tracking-tight">Enrollment Trends</CardTitle>
            <CardDescription className="text-xs font-medium">New enrollments over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {enrollmentData.length > 0 && enrollmentData.some((d) => d.count > 0) ? (
              <ChartContainer config={enrollmentChartConfig} className="h-[250px] sm:h-[300px] w-full">
                <AreaChart
                  data={enrollmentData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="fillEnrollments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="line" />}
                    cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#fillEnrollments)"
                    dot={{ fill: "#3b82f6", r: 4, strokeWidth: 2, stroke: "#fff" }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] sm:h-[300px] items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                <div className="text-center p-6">
                  <p className="text-sm font-semibold">No enrollment data</p>
                  <p className="text-[10px] mt-1 opacity-70">Enrollments will appear here once students are added</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Status Distribution */}
        <Card className="border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold tracking-tight">Student Status</CardTitle>
            <CardDescription className="text-xs font-medium">Distribution of students by status</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {statusData.length > 0 ? (
              <ChartContainer config={statusChartConfig} className="h-[250px] sm:h-[300px] w-full">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      if (percent < 0.1) return "";
                      return `${(percent * 100).toFixed(0)}%`;
                    }}
                    outerRadius={80}
                    innerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                    nameKey="name"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={4} />
                    ))}
                  </Pie>
                  <ChartTooltip
                    content={<ChartTooltipContent />}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={40}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{value}</span>
                    )}
                    wrapperStyle={{ paddingTop: "20px" }}
                  />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] sm:h-[300px] items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                <div className="text-center p-6">
                  <p className="text-sm font-semibold">No student data</p>
                  <p className="text-[10px] mt-1 opacity-70">Status metrics will appear here once students are added</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Attendance Trends */}
        <Card className="lg:col-span-2 border-none bg-background/50 backdrop-blur-sm ring-1 ring-border shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-bold tracking-tight">Attendance Overview</CardTitle>
            <CardDescription className="text-xs font-medium">Staff attendance for the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {attendanceData.length > 0 ? (
              <ChartContainer config={attendanceChartConfig} className="h-[250px] sm:h-[300px] w-full">
                <BarChart
                  data={attendanceData}
                  margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                  barGap={8}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent indicator="dashed" />}
                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.2 }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    height={30}
                    wrapperStyle={{ paddingBottom: "20px" }}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="present"
                    fill="var(--color-present)"
                    radius={[4, 4, 0, 0]}
                    name="Present"
                    barSize={20}
                  />
                  <Bar
                    dataKey="absent"
                    fill="var(--color-absent)"
                    radius={[4, 4, 0, 0]}
                    name="Absent"
                    barSize={20}
                  />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="flex h-[250px] sm:h-[300px] items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                <div className="text-center p-6">
                  <p className="text-sm font-semibold">No attendance records</p>
                  <p className="text-[10px] mt-1 opacity-70">Attendance metrics will show here after data entry</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
