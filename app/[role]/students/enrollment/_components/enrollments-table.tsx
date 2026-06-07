"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Search,
  Eye,
  Edit,
  Plus,
  Upload,
  CheckCircle,
  XCircle,
  GraduationCap,
  Trash2,
} from "lucide-react";
import type { Enrollment } from "@/lib/types/enrollment.type";
import type { Class } from "@/lib/types/class.type";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { Student } from "@/lib/types/student.type";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ImportEnrollmentsDialog } from "./import-enrollments-dialog";
import { ExportEnrollmentsButton } from "./export-enrollments-button";
import { BulkDeleteEnrollmentsDialog } from "./bulk-delete-enrollments-dialog";

interface EnrollmentsTableProps {
  enrollments: Enrollment[];
  classes: Class[];
}

export function EnrollmentsTable({
  enrollments,
  classes,
}: EnrollmentsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const role = pathname.split("/")[1];
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Fetch all students to get names
  const { data: studentsData } = useFirebaseRealtime<Student>("students", {
    asArray: true,
  });
  const students = (studentsData as Student[]) || [];

  // Create lookup maps
  const classMap = new Map(classes.map((c) => [c.id, c]));
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Filter enrollments
  const filteredEnrollments = enrollments.filter((enrollment) => {
    if (!searchQuery) return true;

    const student = studentMap.get(enrollment.studentId);
    const classData = classMap.get(enrollment.classId);

    const searchLower = searchQuery.toLowerCase();
    return (
      student?.fullName.toLowerCase().includes(searchLower) ||
      student?.admissionNumber.toLowerCase().includes(searchLower) ||
      classData?.name.toLowerCase().includes(searchLower) ||
      enrollment.section.toLowerCase().includes(searchLower) ||
      enrollment.rollNumber.toLowerCase().includes(searchLower) ||
      enrollment.academicYear.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: Enrollment["status"]) => {
    const variants: Record<
      Enrollment["status"],
      { variant: "default" | "secondary" | "destructive" | "outline" }
    > = {
      active: { variant: "default" },
      transferred: { variant: "secondary" },
      promoted: { variant: "outline" },
      withdrawn: { variant: "destructive" },
    };

    return (
      <Badge
        variant={variants[status]?.variant || "default"}
        className={
          status === "active"
            ? "bg-green-100 text-green-800"
            : status === "withdrawn"
              ? "bg-red-100 text-red-800"
              : ""
        }
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Bulk selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredEnrollments.map((e) => e.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }
  };

  const handleDialogSuccess = () => {
    // Real-time hook will automatically update the data
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedIds([]);
    // Real-time hook will automatically update the data
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Modern Toolbar with Glassmorphism */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4 sm:p-6 transition-all duration-200">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Search by name, admission number, class, section, roll number, or academic year..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 h-11 text-sm sm:text-base border-border/50 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-200"
          />
        </div>
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                  className="text-xs sm:text-sm text-muted-foreground font-medium"
                >
                  {selectedIds.length} selected
                </motion.span>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  className="flex gap-2"
                >
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.info("Bulk activate feature coming soon");
                    }}
                    className="flex items-center gap-1 bg-emerald-500 text-white hover:bg-emerald-600 text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Activate</span>
                    <span className="sm:hidden">Act</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.info("Bulk deactivate feature coming soon");
                    }}
                    className="flex items-center gap-1 bg-rose-500 text-white hover:bg-rose-600 text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                  >
                    <XCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Deactivate</span>
                    <span className="sm:hidden">Deact</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setBulkDeleteDialogOpen(true)}
                    className="flex items-center gap-1 bg-red-600 text-white hover:bg-red-700 text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Delete</span>
                    <span className="sm:hidden">Del</span>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Enrollments Table Card with Modern Styling */}
      <Card className="border-2 border-gradient-to-r from-primary/20 via-transparent to-accent/20 shadow-xl transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="p-3 sm:p-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                  Enrollment Management
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs mt-0.5 leading-tight">
                  {filteredEnrollments.length} of {enrollments.length}{" "}
                  enrollments
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button
                onClick={() =>
                  router.push(`/${role}/students/enrollment/enroll`)
                }
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Enroll Student</span>
                <span className="sm:hidden">Enroll</span>
              </Button>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>

              <ExportEnrollmentsButton enrollments={filteredEnrollments} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredEnrollments.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                No enrollments found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search terms."
                  : "Get started by enrolling your first student."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() =>
                    router.push(`/${role}/students/enrollment/enroll`)
                  }
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Enroll Student
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedIds.length === filteredEnrollments.length &&
                            filteredEnrollments.length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission No</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Section</TableHead>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollments.map((enrollment) => {
                      const student = studentMap.get(enrollment.studentId);
                      const classData = classMap.get(enrollment.classId);

                      return (
                        <TableRow key={enrollment.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(enrollment.id)}
                              onCheckedChange={(checked) =>
                                handleSelectOne(
                                  enrollment.id,
                                  checked as boolean,
                                )
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {student?.fullName || "Unknown"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {student?.admissionNumber || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {classData?.name || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {enrollment.section}
                          </TableCell>
                          <TableCell className="text-sm">
                            {enrollment.rollNumber}
                          </TableCell>
                          <TableCell className="text-sm">
                            {enrollment.academicYear}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(enrollment.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(
                              enrollment.enrollmentDate,
                            ).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() =>
                                    router.push(
                                      `/${role}/students/${enrollment.studentId}`,
                                    )
                                  }
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Student
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    toast.info(
                                      "Edit enrollment feature coming soon",
                                    );
                                  }}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Enrollment
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredEnrollments.map((enrollment) => {
                  const student = studentMap.get(enrollment.studentId);
                  const classData = classMap.get(enrollment.classId);

                  return (
                    <Card key={enrollment.id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <Checkbox
                            checked={selectedIds.includes(enrollment.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(enrollment.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <div className="font-medium text-sm truncate">
                                {student?.fullName || "Unknown"}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {student?.admissionNumber || "-"}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <p className="text-muted-foreground">Class</p>
                                <p className="font-medium">
                                  {classData?.name || "-"}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Section</p>
                                <p className="font-medium">
                                  {enrollment.section}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Roll Number
                                </p>
                                <p className="font-medium">
                                  {enrollment.rollNumber}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">
                                  Academic Year
                                </p>
                                <p className="font-medium">
                                  {enrollment.academicYear}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(enrollment.status)}
                            </div>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 flex-shrink-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/${role}/students/${enrollment.studentId}`,
                                )
                              }
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Student
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                toast.info(
                                  "Edit enrollment feature coming soon",
                                );
                              }}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Enrollment
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ImportEnrollmentsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleDialogSuccess}
      />
      <BulkDeleteEnrollmentsDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedIds={selectedIds}
        onSuccess={handleBulkDeleteSuccess}
      />
    </div>
  );
}
