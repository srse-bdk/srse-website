"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Student } from "@/lib/types/student.type";
import {
  formatClassSectionDisplay,
  formatGenderLabel,
  getStudentPrimaryContact,
} from "@/lib/utils/student-display";
import {
  sortStudentsByClassSection,
  type StudentListSortMode,
} from "@/lib/utils/student-roll-number";
import {
  ArrowDownAZ,
  CheckCircle,
  Edit,
  GraduationCap,
  Hash,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AssignRollNumbersButton } from "./assign-roll-numbers-dialog";
import { BulkDeleteStudentsDialog } from "./bulk-delete-students-dialog";
import { DeleteStudentDialog } from "./delete-student-dialog";
import { ExportStudentsButton } from "./export-students-button";
import { ImportStudentsDialog } from "./import-students-dialog";

interface StudentsTableProps {
  students: Student[];
}

function formatDoB(dateOfBirth?: string): string {
  if (!dateOfBirth) return "-";
  const date = new Date(dateOfBirth);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function renderContactNumCell(student: Student) {
  const contact = getStudentPrimaryContact(student);

  if (!contact.name && !contact.phone) {
    return <span className="text-sm text-muted-foreground">-</span>;
  }

  return (
    <div className="space-y-0.5 text-sm">
      {contact.name ? <div className="font-medium">{contact.name}</div> : null}
      {contact.phone ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          {contact.phone}
        </div>
      ) : null}
    </div>
  );
}

export function StudentsTable({ students }: StudentsTableProps) {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [sortMode, setSortMode] = useState<StudentListSortMode>("roll");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Filter students based on search term
  const filteredStudents = useMemo(() => {
    const filtered = students.filter(
      (student) =>
        student.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.scanId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admissionNumber
          ?.toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.phone?.includes(searchTerm),
    );

    return sortStudentsByClassSection(filtered, sortMode);
  }, [students, searchTerm, sortMode]);

  const activeStudentsMissingRoll = useMemo(() => {
    return students.filter(
      (student) =>
        student.status === "active" &&
        student.currentClass?.trim() &&
        student.currentSection?.trim() &&
        !String(student.rollNumber || "").trim(),
    ).length;
  }, [students]);

  const openDeleteDialog = (student: Student) => {
    setSelectedStudent(student);
    setDeleteDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setSelectedStudent(null);
    // Real-time hook will automatically update the data
  };

  const handleBulkDeleteSuccess = () => {
    setSelectedIds([]);
    // Real-time hook will automatically update the data
  };

  // Bulk selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredStudents.map((s) => s.id));
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Active
          </Badge>
        );
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "graduated":
        return (
          <Badge variant="outline" className="border-blue-300 text-blue-800">
            Graduated
          </Badge>
        );
      case "transferred":
        return (
          <Badge variant="outline" className="border-gray-300 text-gray-800">
            Transferred
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Modern Toolbar with Glassmorphism */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4 sm:p-6 transition-all duration-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input
              placeholder="Search by name, scan ID, roll, admission, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 h-11 text-sm sm:text-base border-border/50 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-200"
            />
          </div>
          <div className="flex items-center gap-2 sm:w-[220px] shrink-0">
            <Select
              value={sortMode}
              onValueChange={(value) =>
                setSortMode(value as StudentListSortMode)
              }
            >
              <SelectTrigger className="h-11 w-full" aria-label="Sort within class">
                <SelectValue placeholder="Sort within class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="roll">
                  <span className="inline-flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5" />
                    Roll no. in class
                  </span>
                </SelectItem>
                <SelectItem value="name">
                  <span className="inline-flex items-center gap-2">
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                    Name A–Z in class
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
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

      {/* Students Table Card with Modern Styling */}
      <Card className="border-2 border-gradient-to-r from-primary/20 via-transparent to-accent/20 shadow-xl transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="p-3 sm:p-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                  Student Management
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs mt-0.5 leading-tight">
                  {filteredStudents.length} of {students.length} students
                  {activeStudentsMissingRoll > 0
                    ? ` · ${activeStudentsMissingRoll} need roll numbers`
                    : ""}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button
                onClick={() => router.push(`/${role}/students/create`)}
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Student</span>
                <span className="sm:hidden">Add</span>
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
              <AssignRollNumbersButton disabled={students.length === 0} />
              <ExportStudentsButton students={filteredStudents} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredStudents.length === 0 ? (
            <div className="text-center py-8">
              <GraduationCap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                No students found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm
                  ? "Try adjusting your search terms."
                  : "Get started by adding your first student."}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => router.push(`/${role}/students/create`)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Student
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
                            selectedIds.length === filteredStudents.length &&
                            filteredStudents.length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Class-Sec</TableHead>
                      <TableHead className="text-right">Roll No.</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>PEN</TableHead>
                      <TableHead>DoB</TableHead>
                      <TableHead>Parent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(student.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(student.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium whitespace-nowrap">
                            {formatClassSectionDisplay(student)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="font-mono text-sm tabular-nums">
                            {student.rollNumber || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{student.fullName}</div>
                          {formatGenderLabel(student.gender) ? (
                            <div className="text-sm text-muted-foreground">
                              {formatGenderLabel(student.gender)}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm">
                            {student.pen || "-"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm whitespace-nowrap">
                            {formatDoB(student.dateOfBirth)}
                          </div>
                        </TableCell>
                        <TableCell>{renderContactNumCell(student)}</TableCell>
                        <TableCell>{getStatusBadge(student.status)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(`/${role}/students/${student.id}`)
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/${role}/students/${student.id}/edit`,
                                  )
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openDeleteDialog(student)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredStudents.map((student) => (
                  <Card key={student.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedIds.includes(student.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(student.id, checked as boolean)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              {formatClassSectionDisplay(student)}
                            </span>
                            <span className="text-xs text-muted-foreground tabular-nums">
                              Roll: {student.rollNumber || "-"}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-sm truncate">
                              {student.fullName}
                            </div>
                            {formatGenderLabel(student.gender) ? (
                              <div className="text-xs text-muted-foreground">
                                {formatGenderLabel(student.gender)}
                              </div>
                            ) : null}
                            <div className="text-xs text-muted-foreground truncate">
                              PEN: {student.pen || "-"} · DoB:{" "}
                              {formatDoB(student.dateOfBirth)}
                            </div>
                          </div>
                          <div className="text-xs">{renderContactNumCell(student)}</div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(student.status)}
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
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(`/${role}/students/${student.id}`)
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/${role}/students/${student.id}/edit`,
                              )
                            }
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(student)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DeleteStudentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        student={selectedStudent}
        onSuccess={handleDialogSuccess}
      />
      <ImportStudentsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleDialogSuccess}
      />
      <BulkDeleteStudentsDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedIds={selectedIds}
        onSuccess={handleBulkDeleteSuccess}
      />
    </div>
  );
}
