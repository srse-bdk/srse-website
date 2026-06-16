"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, BookOpen, Users, Download, Trash2, MoreVertical, Eye, FileText, Search, Sparkles, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { TimeTable } from "@/lib/types/time-table.type";
import type { Class } from "@/lib/types/class.type";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { timeTableService } from "@/lib/services/time-table.service";
import { toast } from "sonner";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { TimeTablePrintView } from "@/components/time-table/print-view";
import { useAppStore } from "@/hooks/use-app-store";
import { studentService } from "@/lib/services";
import {
    classTokensMatch,
    timeTableMatchesStudentClass,
} from "@/lib/utils/class-section-match";

export default function TimeTablePage() {
    const router = useRouter();
    const params = useParams();
    const role = params.role as string;
    const user = useAppStore((state) => state.user);
    const isAdmin = user?.role === "admin";
    const isStudent = user?.role === "student";
    const [studentClass, setStudentClass] = useState<{
        currentClass?: string;
        currentSection?: string;
    } | null>(null);

    useEffect(() => {
        if (!isStudent) return;

        const profileClass = {
            currentClass: user?.currentClass,
            currentSection: user?.currentSection,
        };

        if (profileClass.currentClass) {
            setStudentClass(profileClass);
        }

        if (!user?.studentId) return;

        studentService.getById(user.studentId).then((student) => {
            if (!student) return;
            setStudentClass({
                currentClass: student.currentClass || user?.currentClass,
                currentSection: student.currentSection || user?.currentSection,
            });
        });
    }, [isStudent, user?.studentId, user?.currentClass, user?.currentSection]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTimeTable, setSelectedTimeTable] = useState<TimeTable | null>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: selectedTimeTable ? `TimeTable_${selectedTimeTable.className}_${selectedTimeTable.section}` : 'TimeTable',
    });

    useEffect(() => {
        if (selectedTimeTable && printRef.current) {
            handlePrint();
            // Reset selected timetable after a short delay to allow printing to start
            const timer = setTimeout(() => {
                setSelectedTimeTable(null);
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [selectedTimeTable, handlePrint]);

    const { data: timeTablesData, loading, error: timeTablesError } = useFirebaseRealtime<TimeTable>("time-tables", {
        asArray: true,
    });
    const { data: classesData } = useFirebaseRealtime<Class>("classes", {
        asArray: true,
        enabled: isStudent,
    });
    const timeTables = (timeTablesData as TimeTable[]) || [];
    const classes = (classesData as Class[]) || [];

    const resolvedStudentClassId = useMemo(() => {
        if (!isStudent || !studentClass?.currentClass) return undefined;
        const match = classes.find((cls) =>
            classTokensMatch(cls.name, studentClass.currentClass || ""),
        );
        return match?.id;
    }, [classes, isStudent, studentClass?.currentClass]);

    const roleScopedTimeTables = useMemo(() => {
        if (isStudent && studentClass?.currentClass) {
            return timeTables.filter((tt) =>
                timeTableMatchesStudentClass({
                    timetableClassName: tt.className,
                    timetableClassId: tt.classId,
                    timetableSection: tt.section,
                    studentClass: studentClass.currentClass,
                    studentSection: studentClass.currentSection,
                    resolvedClassId: resolvedStudentClassId,
                }),
            );
        }
        if (user?.role === "parent") {
            return timeTables;
        }
        return timeTables;
    }, [timeTables, user?.role, isStudent, studentClass, resolvedStudentClassId]);

    const filteredTimeTables = roleScopedTimeTables.filter(tt =>
        tt.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tt.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tt.academicYear.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this time table?")) {
            try {
                await timeTableService.delete(id);
                toast.success("Time table deleted");
            } catch (error) {
                toast.error("Failed to delete");
            }
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-8 space-y-8 max-w-7xl animate-in fade-in duration-500">
            {/* Header section with Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                        Time Tables
                    </h1>
                    <p className="text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {isAdmin
                            ? "Manage schedules for all classes and sections"
                            : user?.role === "student"
                              ? "Your class schedule"
                              : "View class schedules"}
                    </p>
                </div>
                {isAdmin ? (
                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-xl border border-primary/10">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <span className="text-sm font-semibold text-primary">{timeTables.length} Generated</span>
                        </div>
                        <Button onClick={() => router.push(`/${role}/time-table/generate`)} className="gap-2 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                            <Plus className="h-4 w-4" />
                            Generate New
                        </Button>
                    </div>
                ) : null}
            </div>

            {/* Search & Filter Bar */}
            <Card className="border-primary/10 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by class, section or year..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 h-12 bg-background/50 border-none shadow-inner"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Grid of Time Tables */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="h-64 animate-pulse bg-muted" />
                    ))}
                </div>
            ) : filteredTimeTables.length === 0 ? (
                <Card className="border-dashed h-[400px] flex items-center justify-center">
                    <CardContent className="flex flex-col items-center text-center space-y-4">
                        <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center">
                            <Calendar className="h-10 w-10 text-primary opacity-20" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-xl font-bold">No Time Tables Found</h3>
                            <p className="text-muted-foreground max-w-sm">
                                {timeTablesError
                                    ? timeTablesError.message
                                    : searchTerm
                                      ? "No results match your search."
                                      : isStudent && !studentClass?.currentClass
                                        ? "Your class and section are not set on your student profile yet. Please contact the school office."
                                        : isStudent && studentClass?.currentClass
                                          ? `No timetable has been generated for Class ${studentClass.currentClass}${studentClass.currentSection ? ` Section ${studentClass.currentSection}` : ""} yet.`
                                          : "Start by generating a new schedule for your class."}
                            </p>
                        </div>
                        {!searchTerm && isAdmin ? (
                            <Button onClick={() => router.push(`/${role}/time-table/generate`)} variant="outline" className="mt-4 gap-2">
                                <Plus className="h-4 w-4" />
                                Generate First Schedule
                            </Button>
                        ) : null}
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {filteredTimeTables.map((tt, index) => (
                            <motion.div
                                key={tt.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card className="group hover:border-primary/30 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden border-2 border-transparent bg-card/80 backdrop-blur">
                                    <div className="absolute top-0 right-0 p-2">
                                        {isAdmin ? (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => router.push(`/${role}/time-table/generate?editId=${tt.id}`)}>
                                                        <Pencil className="h-4 w-4 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.push(`/${role}/time-table/${tt.id}`)}>
                                                        <Eye className="h-4 w-4 mr-2" /> View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(tt.id)}>
                                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => router.push(`/${role}/time-table/${tt.id}`)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>

                                    <CardHeader className="pb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl ring-1 ring-primary/20">
                                                {tt.className[0]}
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl">{tt.className}</CardTitle>
                                                <CardDescription className="flex items-center gap-1.5 font-medium">
                                                    <Badge variant="secondary" className="px-1.5 py-0 h-5 text-[10px] uppercase font-bold tracking-tight">Section {tt.section}</Badge>
                                                    • {tt.academicYear}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Hours</span>
                                                <span className="text-xs font-semibold flex items-center gap-1">
                                                    <Clock className="h-3 w-3 text-primary" />
                                                    {tt.config.startTime} - {tt.config.endTime}
                                                </span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-muted/30 border border-border/50">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">Structure</span>
                                                <span className="text-xs font-semibold flex items-center gap-1">
                                                    <BookOpen className="h-3 w-3 text-primary" />
                                                    {tt.config.numberOfPeriods} Periods
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="bg-primary/5 hover:bg-primary/10 text-primary font-bold gap-2"
                                                onClick={() => router.push(`/${role}/time-table/${tt.id}`)}
                                            >
                                                <FileText className="h-4 w-4" />
                                                View Table
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-9 w-9 rounded-xl hover:bg-primary hover:text-white transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTimeTable(tt);
                                                }}
                                            >
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
            {/* Hidden Printable Component */}
            <div className="absolute top-[-9999px] left-[-9999px] pointer-events-none">
                {selectedTimeTable && (
                    <TimeTablePrintView
                        ref={printRef}
                        timeTable={selectedTimeTable}
                    />
                )}
            </div>
        </div>
    );
}
