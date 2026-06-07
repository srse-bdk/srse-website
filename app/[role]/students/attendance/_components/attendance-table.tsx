"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Autocomplete,
  type AutocompleteOption,
} from "@/components/core/autocomplete";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Trash2, Loader2, Search, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { studentAttendanceService } from "@/lib/services";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { toast } from "sonner";
import type { StudentAttendance } from "@/lib/types/student-attendance.type";
import type { Class } from "@/lib/types/class.type";
import type { Student } from "@/lib/types/student.type";
import type { Enrollment } from "@/lib/types/enrollment.type";
import { ImportAttendanceDialog } from "./import-attendance-dialog";
import { ExportAttendanceButton } from "./export-attendance-button";

interface AttendanceTableRow extends StudentAttendance {
  studentName: string;
  className: string;
  rollNumber: string;
}

export function AttendanceTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Fetch data using real-time hooks
  const { data: classesData, loading: classesLoading } =
    useFirebaseRealtime<Class>("classes", {
      asArray: true,
    });
  const { data: studentsData, loading: studentsLoading } =
    useFirebaseRealtime<Student>("students", {
      asArray: true,
    });
  const { data: enrollmentsData, loading: enrollmentsLoading } =
    useFirebaseRealtime<Enrollment>("enrollments", {
      asArray: true,
    });
  const { data: attendanceData, loading: attendanceLoading } =
    useFirebaseRealtime<StudentAttendance>("studentAttendance", {
      asArray: true,
    });

  const classes = (classesData as Class[]) || [];
  const students = (studentsData as Student[]) || [];
  const enrollments = (enrollmentsData as Enrollment[]) || [];
  const allAttendance = (attendanceData as StudentAttendance[]) || [];

  const isLoading =
    classesLoading ||
    studentsLoading ||
    enrollmentsLoading ||
    attendanceLoading;

  // Prepare options for autocomplete
  const classOptions: AutocompleteOption[] = classes
    .filter((c) => c.status === "active")
    .map((c) => ({
      value: c.id,
      label: c.name,
    }));

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = selectedClass?.sections || [];
  const sectionOptions: AutocompleteOption[] = availableSections.map(
    (section) => ({
      value: section,
      label: `Section ${section}`,
    })
  );

  // Enrich and filter attendance data using useMemo
  const attendance = useMemo<AttendanceTableRow[]>(() => {
    // Apply date range filter
    let filtered = allAttendance;
    if (startDate && endDate) {
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");
      filtered = filtered.filter((a) => a.date >= startStr && a.date <= endStr);
    }

    // Apply class filter
    if (selectedClassId) {
      filtered = filtered.filter((a) => a.classId === selectedClassId);
    }

    // Apply section filter
    if (selectedSection) {
      filtered = filtered.filter((a) => a.section === selectedSection);
    }

    // Enrich with student and class data
    const enriched: AttendanceTableRow[] = filtered.map((a) => {
      const student = students.find((s) => s.id === a.studentId);
      const classData = classes.find((c) => c.id === a.classId);
      const enrollment = enrollments.find((e) => e.id === a.enrollmentId);

      return {
        ...a,
        studentName: student?.fullName || "Unknown",
        className: classData?.name || "Unknown",
        rollNumber: enrollment?.rollNumber || "-",
      };
    });

    // Apply search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      return enriched.filter(
        (a) =>
          a.studentName.toLowerCase().includes(lowerSearch) ||
          a.rollNumber.toLowerCase().includes(lowerSearch) ||
          a.className.toLowerCase().includes(lowerSearch)
      );
    }

    return enriched;
  }, [
    allAttendance,
    startDate,
    endDate,
    selectedClassId,
    selectedSection,
    searchTerm,
    classes,
    students,
    enrollments,
  ]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this attendance record?")) {
      return;
    }

    try {
      await studentAttendanceService.delete(id);
      toast.success("Attendance record deleted");
      // Real-time hook will automatically update the data
    } catch (error) {
      console.error("Error deleting attendance:", error);
      toast.error("Failed to delete attendance record");
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === "present")
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          Present
        </Badge>
      );
    if (status === "absent")
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          Absent
        </Badge>
      );
    if (status === "late")
      return (
        <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
          Late
        </Badge>
      );
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter attendance records by date, class, and section
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Autocomplete
                options={[
                  { value: "all", label: "All classes" },
                  ...classOptions,
                ]}
                value={selectedClassId || "all"}
                onChange={(value) =>
                  setSelectedClassId(value === "all" ? "" : value)
                }
                placeholder="All classes"
                emptyMessage="No classes found"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Autocomplete
                options={[
                  { value: "all", label: "All sections" },
                  ...sectionOptions,
                ]}
                value={selectedSection || "all"}
                onChange={(value) =>
                  setSelectedSection(value === "all" ? "" : value)
                }
                placeholder="All sections"
                emptyMessage="No sections found"
                disabled={!selectedClassId}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                {attendance.length} record(s) found
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <ExportAttendanceButton
                attendance={attendance.map((a) => ({
                  id: a.id,
                  studentId: a.studentId,
                  enrollmentId: a.enrollmentId,
                  classId: a.classId,
                  section: a.section,
                  date: a.date,
                  status: a.status,
                  markedBy: a.markedBy,
                  markedAt: a.markedAt,
                  notes: a.notes,
                  createdAt: a.createdAt,
                  updatedAt: a.updatedAt,
                }))}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No attendance records found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {format(parseISO(record.date), "PPP")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {record.rollNumber}
                      </TableCell>
                      <TableCell>{record.studentName}</TableCell>
                      <TableCell>{record.className}</TableCell>
                      <TableCell>{record.section}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                      <TableCell className="max-w-xs truncate">
                        {record.notes || "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <ImportAttendanceDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={() => {
          // Real-time hook will automatically update the data
          toast.success("Attendance records imported successfully");
        }}
      />
    </div>
  );
}
