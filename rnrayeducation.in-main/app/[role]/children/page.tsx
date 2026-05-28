"use client";

import React, { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
    Users,
    Calendar,
    Award,
    TrendingUp,
    UserCheck,
    UserX,
    Clock,
    ArrowRight,
    Info,
    CalendarDays,
    CheckCircle2,
    XCircle,
    AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { studentService } from "@/lib/services";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Student } from "@/lib/types/student.type";
import type { StudentAttendance } from "@/lib/types/student-attendance.type";

export default function ChildrenPage() {
    const params = useParams();
    const role = params.role as string;
    const user = useAppStore((state) => state.user);
    const validChildrenIds = user?.validChildrenIds || [];

    const { data: studentsData, loading: studentsLoading } = useFirebaseRealtime<Student>("students", {
        asArray: true,
    });
    const { data: attendanceData, loading: attendanceLoading } = useFirebaseRealtime<StudentAttendance>("studentAttendance", {
        asArray: true,
    });

    const [selectedChildId, setSelectedChildId] = useState<string | null>(validChildrenIds[0] || null);

    const children = useMemo(() => {
        const all = (studentsData as Student[]) || [];
        return all.filter(s => validChildrenIds.includes(s.id));
    }, [studentsData, validChildrenIds]);

    const selectedChild = useMemo(() =>
        children.find(c => c.id === selectedChildId) || children[0],
        [children, selectedChildId]);

    const childAttendance = useMemo(() => {
        if (!selectedChild) return [];
        const all = (attendanceData as StudentAttendance[]) || [];
        return all.filter(a => a.studentId === selectedChild.id).sort((a, b) => b.date.localeCompare(a.date));
    }, [attendanceData, selectedChild]);

    const attendanceStats = useMemo(() => {
        if (childAttendance.length === 0) return { present: 0, absent: 0, late: 0, percentage: 0 };
        const present = childAttendance.filter(a => a.status === "present").length;
        const absent = childAttendance.filter(a => a.status === "absent").length;
        const late = childAttendance.filter(a => a.status === "late").length;
        const percentage = Math.round(((present + late) / childAttendance.length) * 100);
        return { present, absent, late, percentage };
    }, [childAttendance]);

    if (studentsLoading || attendanceLoading) {
        return <div className="p-8 text-center">Loading children data...</div>;
    }

    if (children.length === 0) {
        return (
            <div className="flex h-[50vh] flex-col items-center justify-center p-4">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h1 className="text-2xl font-bold">No Children Linked</h1>
                <p className="text-muted-foreground">Please contact school administration to link your children to your account.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 sm:p-6 pb-20">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold tracking-tight">My Children</h1>
                <p className="text-muted-foreground">Monitor performance and daily activities.</p>
            </div>

            {/* Child Selector */}
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {children.map((child) => (
                    <Button
                        key={child.id}
                        variant={selectedChild?.id === child.id ? "default" : "outline"}
                        className={cn(
                            "flex-shrink-0 flex items-center gap-3 px-6 h-16 rounded-2xl transition-all shadow-sm",
                            selectedChild?.id === child.id ? "ring-2 ring-primary ring-offset-2" : "hover:bg-muted"
                        )}
                        onClick={() => setSelectedChildId(child.id)}
                    >
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center",
                            selectedChild?.id === child.id ? "bg-white/20" : "bg-primary/10"
                        )}>
                            <Users className={cn("h-5 w-5", selectedChild?.id === child.id ? "text-white" : "text-primary")} />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm leading-tight">{child.fullName}</p>
                            <p className={cn("text-[10px] opacity-80 uppercase font-bold", selectedChild?.id === child.id ? "text-white/80" : "text-muted-foreground")}>
                                {child.currentClass} - {child.currentSection}
                            </p>
                        </div>
                    </Button>
                ))}
            </div>

            {selectedChild && (
                <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
                    {/* Sidebar: Profile & Stats */}
                    <div className="space-y-6">
                        <Card className="border-none ring-1 ring-border bg-gradient-to-br from-primary/5 to-transparent text-foreground">
                            <CardHeader>
                                <div className="flex flex-col items-center text-center gap-4">
                                    <div className="h-24 w-24 rounded-full bg-primary/10 border-4 border-white shadow-xl flex items-center justify-center">
                                        <Users className="h-12 w-12 text-primary" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-2xl font-black italic">{selectedChild.fullName}</CardTitle>
                                        <Badge variant="secondary" className="mt-1 font-bold">Roll No: {selectedChild.rollNumber || "N/A"}</Badge>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 rounded-2xl bg-white/50 dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/5">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Class</p>
                                        <p className="text-lg font-bold">{selectedChild.currentClass}</p>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/50 dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/5">
                                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Section</p>
                                        <p className="text-lg font-bold">{selectedChild.currentSection}</p>
                                    </div>
                                </div>
                                <div className="p-3 rounded-2xl bg-white/50 dark:bg-black/20 ring-1 ring-black/5 dark:ring-white/5">
                                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1">Admission No</p>
                                    <p className="text-lg font-bold tracking-tight">{selectedChild.admissionNumber}</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Stats Overlay */}
                        <div className="grid grid-cols-2 gap-4">
                            <Card className="border-none ring-1 ring-border bg-green-500/5 transition-transform hover:scale-105">
                                <CardContent className="p-4 pt-6 text-center">
                                    <div className="h-10 w-10 mx-auto rounded-xl bg-green-500/20 flex items-center justify-center mb-2">
                                        <UserCheck className="h-5 w-5 text-green-600" />
                                    </div>
                                    <p className="text-2xl font-black text-green-600">{attendanceStats.percentage}%</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Attendance</p>
                                </CardContent>
                            </Card>
                            <Card className="border-none ring-1 ring-border bg-blue-500/5 transition-transform hover:scale-105">
                                <CardContent className="p-4 pt-6 text-center">
                                    <div className="h-10 w-10 mx-auto rounded-xl bg-blue-500/20 flex items-center justify-center mb-2">
                                        <Award className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <p className="text-2xl font-black text-blue-600">A+</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Grade</p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    {/* Main Content: Tabs */}
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs defaultValue="attendance" className="w-full">
                            <TabsList className="bg-muted/50 p-1 h-14 rounded-2xl mb-6">
                                <TabsTrigger value="attendance" className="flex items-center gap-2 rounded-xl py-2 px-6 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <CalendarDays className="h-4 w-4" /> Attendance
                                </TabsTrigger>
                                <TabsTrigger value="results" className="flex items-center gap-2 rounded-xl py-2 px-6 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <Award className="h-4 w-4" /> Results
                                </TabsTrigger>
                                <TabsTrigger value="performance" className="flex items-center gap-2 rounded-xl py-2 px-6 h-full data-[state=active]:bg-background data-[state=active]:shadow-sm">
                                    <TrendingUp className="h-4 w-4" /> Performance
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="attendance" className="space-y-6">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="p-4 rounded-xl bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-800">
                                        <p className="text-xs font-bold text-green-600 uppercase">Present</p>
                                        <p className="text-2xl font-black">{attendanceStats.present}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800">
                                        <p className="text-xs font-bold text-red-600 uppercase">Absent</p>
                                        <p className="text-2xl font-black">{attendanceStats.absent}</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-800">
                                        <p className="text-xs font-bold text-yellow-600 uppercase">Late</p>
                                        <p className="text-2xl font-black">{attendanceStats.late}</p>
                                    </div>
                                </div>

                                <Card className="border-none ring-1 ring-border shadow-md">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-lg">Recent History</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {childAttendance.length > 0 ? (
                                                childAttendance.slice(0, 10).map((a, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/30 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn(
                                                                "h-10 w-10 rounded-full flex items-center justify-center",
                                                                a.status === "present" ? "bg-green-100 text-green-600" :
                                                                    a.status === "absent" ? "bg-red-100 text-red-600" :
                                                                        "bg-yellow-100 text-yellow-600"
                                                            )}>
                                                                {a.status === "present" ? <CheckCircle2 className="h-5 w-5" /> :
                                                                    a.status === "absent" ? <XCircle className="h-5 w-5" /> :
                                                                        <Clock className="h-5 w-5" />}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-sm">{format(new Date(a.date), "EEEE, MMM dd")}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-wider">{a.status}</p>
                                                            </div>
                                                        </div>
                                                        {a.notes && (
                                                            <Badge variant="outline" className="text-[10px] invisible sm:visible">Note: {a.notes}</Badge>
                                                        )}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-muted-foreground">
                                                    No attendance history recorded yet for this session.
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            <TabsContent value="results">
                                <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                                    <div className="h-20 w-20 rounded-3xl bg-primary/5 flex items-center justify-center">
                                        <AlertCircle className="h-10 w-10 text-primary animate-bounce" />
                                    </div>
                                    <div className="max-w-xs">
                                        <h3 className="text-xl font-black">Coming Soon!</h3>
                                        <p className="text-sm text-muted-foreground mt-2">
                                            We are currently processing midterm results. You'll receive a notification once they are published.
                                        </p>
                                    </div>
                                    <Button variant="outline" className="rounded-full px-8">Set Reminder</Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="performance">
                                <Card className="border-none ring-1 ring-border shadow-md bg-muted/20">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Behavioral Overview</CardTitle>
                                        <CardDescription>Teacher notes and disciplinary records</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col items-center justify-center py-12 text-center">
                                            <Info className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                                            <p className="text-sm text-muted-foreground italic">No performance insights available for the current term.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            )}
        </div>
    );
}

