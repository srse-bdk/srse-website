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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAppStore } from "@/hooks/use-app-store";
import type { FeeConfiguration, FeeRecord } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { formatCurrency } from "@/lib/utils";
import {
    getAcademicYearForDate,
    getAcademicYearRange,
} from "@/lib/utils/fee-dues";
import { filterApplicableFeesForStudent } from "@/lib/utils/fee-bill-rules";
import { isStudentRte } from "@/lib/utils/student-rte";
import {
    CreditCard,
    Download,
    Eye,
    MoreHorizontal,
    Search,
    Settings2,
    Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { CollectFeeDialog } from "./collect-fee-dialog";
import { ManageStudentExtraFeesDialog } from "./manage-student-extra-fees-dialog";
import { ParentPayFeeDialog } from "./parent-pay-fee-dialog";
import { StudentFeeDetailsDialog } from "./student-fee-details-dialog";

interface FeesTableProps {
  students: Student[];
  fees: FeeRecord[]; // Flat list of all fee records
  feeConfigs?: FeeConfiguration[];
  selectedMonth?: Date;
  selectedAcademicYear?: string;
  viewMode?: "monthly" | "yearly";
}

export function FeesTable({ 
  students, 
  fees,
  feeConfigs = [],
  selectedMonth = new Date(), 
  selectedAcademicYear = "2023-2024",
  viewMode = "monthly",
}: FeesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "paid" | "partial" | "pending" | "pending_verification" | "rte"
  >("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [isParentPayOpen, setIsParentPayOpen] = useState(false);
  const [isExtraFeesOpen, setIsExtraFeesOpen] = useState(false);
  const user = useAppStore((state) => state.user);
  const isParent = user?.role === "parent";
  const canManageExtraFees =
    user?.role === "admin" || user?.role === "accounts";

  // Student Fee Details always shows academic-year totals (not a single month),
  // so Total / Paid / Pending are not misleadingly small.
  const academicYear =
    viewMode === "yearly"
      ? selectedAcademicYear
      : getAcademicYearForDate(selectedMonth);
  const ayRange = useMemo(
    () => getAcademicYearRange(academicYear),
    [academicYear],
  );

  // Aggregate stats per student across the full academic year
  // RTE students are listed with govt-claim status; their balance is not school pending.
  // Totals respect admission XOR readmission and May tuition for continuing students.
  const studentFeeMap = students.map((student) => {
    const rte = isStudentRte(student);
    const applicable = filterApplicableFeesForStudent(
      fees,
      student,
      feeConfigs,
      academicYear,
    );
    const studentFees = applicable.filter((f) => {
      const matchesCategory =
        selectedCategory === "all" || f.category === selectedCategory;
      if (f.studentId !== student.id || !matchesCategory) return false;
      if (!f.dueDate) return false;
      const dueDate = new Date(f.dueDate);
      return dueDate >= ayRange.start && dueDate <= ayRange.end;
    });

    const filteredDue = studentFees.reduce(
      (acc, curr) => acc + (Number(curr.amount) || 0),
      0,
    );
    const filteredPaid = studentFees.reduce(
      (acc, curr) => acc + (Number(curr.paidAmount) || 0),
      0,
    );

    const totalDue = filteredDue;
    const totalPaid = filteredPaid;
    const balance = Math.max(0, filteredDue - filteredPaid);

    // Determine status
    let status:
      | "paid"
      | "partial"
      | "pending"
      | "pending_verification"
      | "overdue"
      | "no_fee"
      | "rte" = "no_fee";
    const hasPendingVerification = studentFees.some(
      (fee) => fee.status === "pending_verification",
    );

    if (rte) {
      status = "rte";
    } else if (totalDue > 0) {
      if (balance <= 0) {
        status = "paid";
      } else if (hasPendingVerification) {
        status = "pending_verification";
      } else if (totalPaid > 0) {
        status = "partial";
      } else {
        status = "pending";
      }
    }

    // Get primary guardian
    const guardian =
      student.guardians?.find((g) => g.isPrimary) || student.guardians?.[0];

    return {
      student,
      guardian,
      totalDue,
      totalPaid,
      // School collectable pending is 0 for RTE
      balance: rte ? 0 : balance,
      govtOutstanding: rte ? balance : 0,
      status,
      lastPaymentDate: studentFees
        .filter((f) => f.paidDate)
        .sort(
          (a, b) =>
            new Date(b.paidDate!).getTime() - new Date(a.paidDate!).getTime(),
        )[0]?.paidDate,
    };
  });

  // Filter by status
  const statusFilteredData = studentFeeMap.filter((item) => {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  // Filter by search
  const filteredData = statusFilteredData.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (item.student.fullName || "").toLowerCase().includes(searchLower) ||
      (item.student.admissionNumber || "")
        .toLowerCase()
        .includes(searchLower) ||
      (item.student.rollNumber || "").toLowerCase().includes(searchLower) ||
      (item.guardian?.name || "").toLowerCase().includes(searchLower) ||
      (item.guardian?.phone || "").includes(searchTerm)
    );
  });

  // Count by status for tabs
  const statusCounts = {
    all: studentFeeMap.length,
    paid: studentFeeMap.filter((item) => item.status === "paid").length,
    partial: studentFeeMap.filter((item) => item.status === "partial").length,
    pending: studentFeeMap.filter((item) => item.status === "pending").length,
    pending_verification: studentFeeMap.filter(
      (item) => item.status === "pending_verification",
    ).length,
    rte: studentFeeMap.filter((item) => item.status === "rte").length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "no_fee":
        return (
          <Badge variant="secondary" className="border-none">
            No fee
          </Badge>
        );
      case "rte":
        return (
          <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-200 border-none">
            RTE / Govt
          </Badge>
        );
      case "paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">
            Paid
          </Badge>
        );
      case "partial":
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 border-none">
            Partial
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
            Due
          </Badge>
        );
      case "pending_verification":
        return (
          <Badge className="bg-sky-100 text-sky-800 hover:bg-sky-200 border-none">
            Pending Verification
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-200 border-none">
            Overdue
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1">
          <TabsTrigger value="all" className="gap-2">
            All <Badge variant="secondary" className="ml-1">{statusCounts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            Pending <Badge variant="secondary" className="ml-1">{statusCounts.pending}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending_verification" className="gap-2">
            Verify <Badge variant="secondary" className="ml-1">{statusCounts.pending_verification}</Badge>
          </TabsTrigger>
          <TabsTrigger value="partial" className="gap-2">
            Partial <Badge variant="secondary" className="ml-1">{statusCounts.partial}</Badge>
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-2">
            Paid <Badge variant="secondary" className="ml-1">{statusCounts.paid}</Badge>
          </TabsTrigger>
          <TabsTrigger value="rte" className="gap-2">
            RTE <Badge variant="secondary" className="ml-1">{statusCounts.rte}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, roll number, or guardian..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fees</SelectItem>
              <SelectItem value="tuition">Tuition</SelectItem>
              <SelectItem value="transport">Transport</SelectItem>
              <SelectItem value="library">Library</SelectItem>
              <SelectItem value="exam">Exam</SelectItem>
              <SelectItem value="donation">Donation</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select> */}
          <Button variant="outline" className="hidden sm:flex">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Student Fee Details
          </CardTitle>
          <CardDescription>
            Academic year {academicYear} totals (all issued fees for the
            session). Monthly/Yearly above only filters collection stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Info</TableHead>
                <TableHead>Guardian Details</TableHead>
                <TableHead>Total Fee (AY)</TableHead>
                <TableHead>Paid (AY)</TableHead>
                <TableHead>Pending (AY)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center h-24 text-muted-foreground"
                  >
                    No students found matching your search.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow
                    key={item.student.id}
                    className="group hover:bg-muted/50 transition-colors"
                  >
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {item.student.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {item.student.admissionNumber} • Class{" "}
                          {item.student.currentClass}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.guardian ? (
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {item.guardian.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {item.guardian.phone}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(item.totalDue)}
                    </TableCell>
                    <TableCell className="text-green-600">
                      {formatCurrency(item.totalPaid)}
                    </TableCell>
                    <TableCell className="text-red-600 font-semibold">
                      {item.status === "rte" ? (
                        <span className="text-violet-700 dark:text-violet-400">
                          {formatCurrency(item.govtOutstanding)}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            (govt)
                          </span>
                        </span>
                      ) : (
                        formatCurrency(item.balance)
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedStudent(item.student);
                              setIsDetailsOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          {item.status !== "rte" && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(item.student);
                                setIsCollectOpen(true);
                              }}
                            >
                              <CreditCard className="mr-2 h-4 w-4" /> Collect Fee
                            </DropdownMenuItem>
                          )}
                          {isParent && item.status !== "rte" && (
                            <DropdownMenuItem
                              className="text-primary font-bold"
                              onClick={() => {
                                setSelectedStudent(item.student);
                                setIsParentPayOpen(true);
                              }}
                            >
                              <Wallet className="mr-2 h-4 w-4" /> Pay Now
                            </DropdownMenuItem>
                          )}
                          {canManageExtraFees && (
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedStudent(item.student);
                                setIsExtraFeesOpen(true);
                              }}
                            >
                              <Settings2 className="mr-2 h-4 w-4" />{" "}
                              Admission / Uniform / Transport
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StudentFeeDetailsDialog
        student={selectedStudent}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      <CollectFeeDialog
        student={selectedStudent}
        open={isCollectOpen}
        onOpenChange={setIsCollectOpen}
      />

      <ParentPayFeeDialog
        student={selectedStudent}
        open={isParentPayOpen}
        onOpenChange={setIsParentPayOpen}
      />

      <ManageStudentExtraFeesDialog
        student={selectedStudent}
        open={isExtraFeesOpen}
        onOpenChange={setIsExtraFeesOpen}
      />
    </div>
  );
}
