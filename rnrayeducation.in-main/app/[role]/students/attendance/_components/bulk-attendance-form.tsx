"use client";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Autocomplete, type AutocompleteOption } from "@/components/core/autocomplete";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Loader2, Save, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { studentAttendanceService, enrollmentService, classService } from "@/lib/services";
import { useAppStore } from "@/hooks/use-app-store";
import { toast } from "sonner";
import type { Enrollment } from "@/lib/types/enrollment.type";
import type { Class } from "@/lib/types/class.type";
import type { Student } from "@/lib/types/student.type";
import type { StudentAttendanceStatus } from "@/lib/types/student-attendance.type";
import type { StudentAttendance } from "@/lib/types/student-attendance.type";

interface StudentAttendanceRow {
  studentId: string;
  enrollmentId: string;
  studentName: string;
  rollNumber: string;
  status: StudentAttendanceStatus | null;
  notes: string;
  existingAttendance?: StudentAttendance;
}

export function BulkAttendanceForm() {
  const user = useAppStore((state) => state.user);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [students, setStudents] = useState<StudentAttendanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Fetch data
  const { data: enrollmentsData } = useFirebaseRealtime<Enrollment>("enrollments", {
    asArray: true,
  });
  const { data: classesData } = useFirebaseRealtime<Class>("classes", {
    asArray: true,
  });
  const { data: studentsData } = useFirebaseRealtime<Student>("students", {
    asArray: true,
  });

  const enrollments = (enrollmentsData as Enrollment[]) || [];
  const classes = (classesData as Class[]) || [];
  const allStudents = (studentsData as Student[]) || [];

  // Create stable keys for dependency tracking
  const enrollmentsKey = useMemo(
    () => enrollments.map((e) => `${e.id}-${e.classId}-${e.section}`).join(","),
    [enrollments],
  );
  const studentsKey = useMemo(
    () => allStudents.map((s) => s.id).join(","),
    [allStudents],
  );

  // Load students when class/section/date changes
  useEffect(() => {
    async function loadStudents() {
      if (!selectedClassId || !selectedSection || !selectedDate) {
        setStudents([]);
        return;
      }

      setIsLoading(true);
      try {
        const dateStr = format(selectedDate, "yyyy-MM-dd");

        // Get active enrollments for selected class and section
        const activeEnrollments = enrollments.filter(
          (e) =>
            e.classId === selectedClassId &&
            e.section === selectedSection &&
            e.status === "active",
        );

        // Get existing attendance for this date
        const existingAttendance = await studentAttendanceService.getByDate(
          dateStr,
          selectedClassId,
          selectedSection,
        );
        const attendanceMap = new Map(
          existingAttendance.map((a) => [a.studentId, a]),
        );

        // Build student rows
        const studentRows: StudentAttendanceRow[] = activeEnrollments.map((enrollment) => {
          const student = allStudents.find((s) => s.id === enrollment.studentId);
          const existing = attendanceMap.get(enrollment.studentId);

          return {
            studentId: enrollment.studentId,
            enrollmentId: enrollment.id,
            studentName: student?.fullName || "Unknown",
            rollNumber: enrollment.rollNumber,
            status: existing?.status || null,
            notes: existing?.notes || "",
            existingAttendance: existing,
          };
        });

        // Sort by roll number
        studentRows.sort((a, b) => {
          const aNum = parseInt(a.rollNumber) || 0;
          const bNum = parseInt(b.rollNumber) || 0;
          return aNum - bNum;
        });

        setStudents(studentRows);
        setSelectedStudentIds(new Set());
      } catch (error) {
        console.error("Error loading students:", error);
        toast.error("Failed to load students");
      } finally {
        setIsLoading(false);
      }
    }

    loadStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, selectedSection, selectedDate, enrollmentsKey, studentsKey]);

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = selectedClass?.sections || [];

  // Prepare options for autocomplete
  const classOptions: AutocompleteOption[] = useMemo(
    () =>
      classes
        .filter((c) => c.status === "active")
        .map((c) => ({
          value: c.id,
          label: c.name,
        })),
    [classes],
  );

  const sectionOptions: AutocompleteOption[] = useMemo(
    () =>
      availableSections.map((section) => ({
        value: section,
        label: `Section ${section}`,
      })),
    [availableSections],
  );

  const handleStatusChange = (studentId: string, status: StudentAttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, status } : s)),
    );
  };

  const handleNotesChange = (studentId: string, notes: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, notes } : s)),
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(new Set(students.map((s) => s.studentId)));
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const handleSelectStudent = (studentId: string, checked: boolean) => {
    const newSet = new Set(selectedStudentIds);
    if (checked) {
      newSet.add(studentId);
    } else {
      newSet.delete(studentId);
    }
    setSelectedStudentIds(newSet);
  };

  const handleBulkStatusChange = (status: StudentAttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) =>
        selectedStudentIds.has(s.studentId) ? { ...s, status } : s,
      ),
    );
  };

  const handleSave = async () => {
    // Validate inputs with detailed checks
    if (!selectedDate || !(selectedDate instanceof Date) || isNaN(selectedDate.getTime())) {
      toast.error("Please select a valid date");
      return;
    }

    if (!selectedClassId || selectedClassId.trim() === "") {
      toast.error("Please select a class");
      return;
    }

    if (!selectedSection || selectedSection.trim() === "") {
      toast.error("Please select a section");
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const studentsToSave = students.filter((s) => s.status !== null);

    if (studentsToSave.length === 0) {
      toast.error("Please mark attendance for at least one student");
      return;
    }

    setIsSaving(true);
    try {
      const attendanceData = studentsToSave.map((s) => ({
        studentId: s.studentId,
        enrollmentId: s.enrollmentId,
        status: s.status!,
        notes: s.notes || undefined,
      }));

      // Use user uid/id if available, otherwise use "admin" as fallback
      const userId = user?.uid || user?.id || "admin";

      await studentAttendanceService.bulkMarkAttendance(
        {
          date: dateStr,
          classId: selectedClassId,
          section: selectedSection,
          attendance: attendanceData,
        },
        userId,
      );

      toast.success(`Attendance marked for ${studentsToSave.length} student(s)`);

      // Reload students to show updated status
      const dateStrReload = format(selectedDate, "yyyy-MM-dd");
      const existingAttendance = await studentAttendanceService.getByDate(
        dateStrReload,
        selectedClassId,
        selectedSection,
      );
      const attendanceMap = new Map(
        existingAttendance.map((a) => [a.studentId, a]),
      );

      setStudents((prev) =>
        prev.map((s) => {
          const existing = attendanceMap.get(s.studentId);
          return {
            ...s,
            status: existing?.status || s.status,
            notes: existing?.notes || s.notes,
            existingAttendance: existing,
          };
        }),
      );
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save attendance",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusIcon = (status: StudentAttendanceStatus | null) => {
    if (status === "present") return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (status === "absent") return <XCircle className="h-4 w-4 text-red-600" />;
    if (status === "late") return <Clock className="h-4 w-4 text-orange-600" />;
    return null;
  };

  const getStatusBadge = (status: StudentAttendanceStatus | null) => {
    if (status === "present")
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Present</Badge>;
    if (status === "absent")
      return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Absent</Badge>;
    if (status === "late")
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Late</Badge>;
    return <Badge variant="outline">Not Marked</Badge>;
  };

  const stats = {
    total: students.length,
    present: students.filter((s) => s.status === "present").length,
    absent: students.filter((s) => s.status === "absent").length,
    late: students.filter((s) => s.status === "late").length,
    notMarked: students.filter((s) => s.status === null).length,
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Date, Class & Section</CardTitle>
          <CardDescription>
            Choose the date and class section to mark attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <DatePicker
                value={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <Autocomplete
                options={classOptions}
                value={selectedClassId}
                onChange={setSelectedClassId}
                placeholder="Select class"
                emptyMessage="No classes found"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Autocomplete
                options={sectionOptions}
                value={selectedSection}
                onChange={setSelectedSection}
                placeholder="Select section"
                emptyMessage="No sections found"
                disabled={!selectedClassId}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {students.length > 0 && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{stats.present}</div>
              <p className="text-xs text-muted-foreground">Present</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
              <p className="text-xs text-muted-foreground">Absent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-600">{stats.late}</div>
              <p className="text-xs text-muted-foreground">Late</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-muted-foreground">
                {stats.notMarked}
              </div>
              <p className="text-xs text-muted-foreground">Not Marked</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students Table */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : students.length > 0 ? (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Mark Attendance</CardTitle>
                <CardDescription>
                  Select students and mark their attendance status
                </CardDescription>
              </div>
              {selectedStudentIds.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange("present")}
                  >
                    Mark Selected as Present
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange("absent")}
                  >
                    Mark Selected as Absent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkStatusChange("late")}
                  >
                    Mark Selected as Late
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          students.length > 0 &&
                          selectedStudentIds.size === students.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Roll No.</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mark Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudentIds.has(student.studentId)}
                          onCheckedChange={(checked) =>
                            handleSelectStudent(student.studentId, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {student.rollNumber}
                      </TableCell>
                      <TableCell>{student.studentName}</TableCell>
                      <TableCell>{getStatusBadge(student.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant={
                              student.status === "present" ? "default" : "outline"
                            }
                            size="sm"
                            className="h-8"
                            onClick={() => handleStatusChange(student.studentId, "present")}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Present
                          </Button>
                          <Button
                            variant={
                              student.status === "absent" ? "default" : "outline"
                            }
                            size="sm"
                            className="h-8"
                            onClick={() => handleStatusChange(student.studentId, "absent")}
                          >
                            <XCircle className="h-3 w-3 mr-1" />
                            Absent
                          </Button>
                          <Button
                            variant={student.status === "late" ? "default" : "outline"}
                            size="sm"
                            className="h-8"
                            onClick={() => handleStatusChange(student.studentId, "late")}
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Late
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Notes (optional)"
                          value={student.notes}
                          onChange={(e) =>
                            handleNotesChange(student.studentId, e.target.value)
                          }
                          className="w-48"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !selectedDate || !selectedClassId || !selectedSection}
                size="lg"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Attendance
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : selectedClassId && selectedSection ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">
              No enrolled students found for this class and section
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

