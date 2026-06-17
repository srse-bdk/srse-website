import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  StudentAttendance,
  StudentAttendanceInput,
  BulkAttendanceInput,
  StudentAttendanceUpdateInput,
  StudentAttendanceAnalytics,
  StudentAttendanceStats,
  ClassAttendanceStats,
  MonthlyAttendanceReport,
} from "@/lib/types/student-attendance.type";
import { enrollmentService } from "./enrollment.service";
import { studentService } from "./student.service";

class StudentAttendanceService {
  /**
   * Mark attendance for a single student
   */
  async markAttendance(data: StudentAttendanceInput, markedBy: string): Promise<string> {
    const nowISO = new Date().toISOString();
    const now = Date.now();

    // Validate enrollment exists
    const enrollment = await enrollmentService.getById(data.enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // Check if attendance already exists for this student on this date
    const existing = await this.getByStudentAndDate(data.studentId, data.date);
    if (existing) {
      throw new Error(`Attendance already marked for this student on ${data.date}`);
    }

    // Validate date is not in the future
    const today = new Date().toISOString().split("T")[0];
    if (data.date > today) {
      throw new Error("Cannot mark attendance for future dates");
    }

    const attendanceData = {
      studentId: data.studentId,
      enrollmentId: data.enrollmentId,
      classId: data.classId,
      section: data.section,
      date: data.date,
      status: data.status,
      markedBy,
      markedAt: now,
      notes: data.notes,
      ...(data.arrivalTime != null && { arrivalTime: data.arrivalTime }),
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const attendanceId = await mutate({
      action: "createWithId",
      path: "studentAttendance",
      data: attendanceData,
      actionBy: markedBy,
    });

    return attendanceId;
  }

  /**
   * Bulk mark attendance for multiple students
   */
  async bulkMarkAttendance(data: BulkAttendanceInput, markedBy: string): Promise<string[]> {
    const nowISO = new Date().toISOString();
    const now = Date.now();
    const attendanceIds: string[] = [];

    // Validate date is not in the future
    const today = new Date().toISOString().split("T")[0];
    if (data.date > today) {
      throw new Error("Cannot mark attendance for future dates");
    }

    // Get existing attendance records for this date and class/section
    const existingAttendance = await this.getByDate(data.date, data.classId, data.section);
    const existingStudentIds = new Set(existingAttendance.map((a) => a.studentId));

    // Process each attendance record
    for (const attendance of data.attendance) {
      // Skip if already marked
      if (existingStudentIds.has(attendance.studentId)) {
        continue;
      }

      // Validate enrollment
      const enrollment = await enrollmentService.getById(attendance.enrollmentId);
      if (!enrollment) {
        console.warn(`Enrollment not found for student ${attendance.studentId}`);
        continue;
      }

      const attendanceData = {
        studentId: attendance.studentId,
        enrollmentId: attendance.enrollmentId,
        classId: data.classId,
        section: data.section,
        date: data.date,
        status: attendance.status,
        markedBy,
        markedAt: now,
        notes: attendance.notes,
        createdAt: nowISO,
        updatedAt: nowISO,
      };

      const attendanceId = await mutate({
        action: "createWithId",
        path: "studentAttendance",
        data: attendanceData,
        actionBy: markedBy,
      });

      attendanceIds.push(attendanceId);
    }

    return attendanceIds;
  }

  /**
   * Get all student attendance records
   */
  async getAll(): Promise<StudentAttendance[]> {
    const data = await mutate({
      action: "get",
      path: "studentAttendance",
    });

    return getArrFromObj<StudentAttendance & Record<string, unknown>>(
      (data || {}) as Record<string, StudentAttendance & Record<string, unknown>>,
    );
  }

  /**
   * Get attendance by ID
   */
  async getById(id: string): Promise<StudentAttendance | null> {
    const data = await mutate({
      action: "get",
      path: `studentAttendance/${id}`,
    });

    return data ? { ...data, id } : null;
  }

  /**
   * Get attendance by student ID and date
   */
  async getByStudentAndDate(studentId: string, date: string): Promise<StudentAttendance | null> {
    const allAttendance = await this.getAll();
    return (
      allAttendance.find((a) => a.studentId === studentId && a.date === date) || null
    );
  }

  /**
   * Get attendance for a specific date
   */
  async getByDate(
    date: string,
    classId?: string,
    section?: string,
  ): Promise<StudentAttendance[]> {
    const allAttendance = await this.getAll();
    let filtered = allAttendance.filter((a) => a.date === date);

    if (classId) {
      filtered = filtered.filter((a) => a.classId === classId);
    }

    if (section) {
      filtered = filtered.filter((a) => a.section === section);
    }

    return filtered.sort((a, b) => {
      // Sort by roll number if available, otherwise by student name
      return a.studentId.localeCompare(b.studentId);
    });
  }

  /**
   * Get attendance by student ID
   */
  async getByStudentId(
    studentId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<StudentAttendance[]> {
    const allAttendance = await this.getAll();
    let filtered = allAttendance.filter((a) => a.studentId === studentId);

    if (startDate) {
      filtered = filtered.filter((a) => a.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((a) => a.date <= endDate);
    }

    return filtered.sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Get attendance by class and section
   */
  async getByClassAndSection(
    classId: string,
    section: string,
    startDate?: string,
    endDate?: string,
  ): Promise<StudentAttendance[]> {
    const allAttendance = await this.getAll();
    let filtered = allAttendance.filter(
      (a) => a.classId === classId && a.section === section,
    );

    if (startDate) {
      filtered = filtered.filter((a) => a.date >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((a) => a.date <= endDate);
    }

    return filtered.sort((a, b) => {
      if (a.date === b.date) {
        return a.studentId.localeCompare(b.studentId);
      }
      return b.date.localeCompare(a.date);
    });
  }

  /**
   * Get attendance by date range
   */
  async getByDateRange(
    startDate: string,
    endDate: string,
    classId?: string,
    section?: string,
  ): Promise<StudentAttendance[]> {
    const allAttendance = await this.getAll();
    let filtered = allAttendance.filter(
      (a) => a.date >= startDate && a.date <= endDate,
    );

    if (classId) {
      filtered = filtered.filter((a) => a.classId === classId);
    }

    if (section) {
      filtered = filtered.filter((a) => a.section === section);
    }

    return filtered.sort((a, b) => {
      if (a.date === b.date) {
        return a.studentId.localeCompare(b.studentId);
      }
      return b.date.localeCompare(a.date);
    });
  }

  /**
   * Update attendance record
   */
  async update(
    id: string,
    data: StudentAttendanceUpdateInput,
    actionBy = "admin",
  ): Promise<void> {
    const nowISO = new Date().toISOString();

    await mutate({
      action: "update",
      path: `studentAttendance/${id}`,
      data: {
        ...data,
        updatedAt: nowISO,
      },
      actionBy,
    });
  }

  /** Record gate exit scan on an existing attendance row for today. */
  async recordGateDismissal(
    attendanceId: string,
    markedBy: string,
  ): Promise<void> {
    const now = Date.now();
    await this.update(
      attendanceId,
      { dismissalTime: now },
      markedBy,
    );
  }

  /**
   * Delete attendance record
   */
  async delete(id: string): Promise<void> {
    await mutate({
      action: "delete",
      path: `studentAttendance/${id}`,
      actionBy: "admin",
    });
  }

  async deleteAll(actionBy = "admin"): Promise<number> {
    const records = await this.getAll();
    for (const record of records) {
      if (!record.id) continue;
      await mutate({
        action: "delete",
        path: `studentAttendance/${record.id}`,
        actionBy,
      });
    }
    return records.length;
  }

  /**
   * Get student attendance analytics
   */
  async getStudentAnalytics(
    studentId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<StudentAttendanceAnalytics> {
    const attendance = await this.getByStudentId(studentId, startDate, endDate);

    const totalDays = attendance.length;
    const presentDays = attendance.filter((a) => a.status === "present").length;
    const absentDays = attendance.filter((a) => a.status === "absent").length;
    const lateDays = attendance.filter((a) => a.status === "late").length;

    const attendancePercentage =
      totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 0;
    const presentPercentage =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    const absentPercentage =
      totalDays > 0 ? Math.round((absentDays / totalDays) * 100) : 0;
    const latePercentage = totalDays > 0 ? Math.round((lateDays / totalDays) * 100) : 0;

    return {
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendancePercentage,
      presentPercentage,
      absentPercentage,
      latePercentage,
    };
  }

  /**
   * Get class/section attendance stats for a specific date
   */
  async getClassStats(
    date: string,
    classId: string,
    section: string,
  ): Promise<ClassAttendanceStats> {
    const attendance = await this.getByDate(date, classId, section);

    // Get all enrolled students for this class/section
    const enrollments = await enrollmentService.getByClassAndSection(classId, section);
    const activeEnrollments = enrollments.filter((e) => e.status === "active");
    const totalStudents = activeEnrollments.length;

    const presentCount = attendance.filter((a) => a.status === "present").length;
    const absentCount = attendance.filter((a) => a.status === "absent").length;
    const lateCount = attendance.filter((a) => a.status === "late").length;

    const attendancePercentage =
      totalStudents > 0
        ? Math.round(((presentCount + lateCount) / totalStudents) * 100)
        : 0;

    // Get class name
    const { classService } = await import("./class.service");
    const classData = await classService.getById(classId);

    return {
      classId,
      className: classData?.name || "Unknown",
      section,
      date,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      attendancePercentage,
    };
  }

  /**
   * Get monthly attendance report
   */
  async getMonthlyReport(
    month: string, // YYYY-MM format
    classId?: string,
    section?: string,
  ): Promise<MonthlyAttendanceReport> {
    const startDate = `${month}-01`;
    const lastDay = new Date(
      parseInt(month.split("-")[0]),
      parseInt(month.split("-")[1]),
      0,
    ).getDate();
    const endDate = `${month}-${String(lastDay).padStart(2, "0")}`;

    const attendance = await this.getByDateRange(startDate, endDate, classId, section);

    // Group by date
    const dailyStatsMap = new Map<string, { present: number; absent: number; late: number; total: number }>();

    attendance.forEach((a) => {
      const existing = dailyStatsMap.get(a.date) || { present: 0, absent: 0, late: 0, total: 0 };
      if (a.status === "present") existing.present++;
      if (a.status === "absent") existing.absent++;
      if (a.status === "late") existing.late++;
      existing.total++;
      dailyStatsMap.set(a.date, existing);
    });

    const dailyStats = Array.from(dailyStatsMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalDays = dailyStats.length;
    const presentDays = dailyStats.reduce((sum, d) => sum + d.present, 0);
    const absentDays = dailyStats.reduce((sum, d) => sum + d.absent, 0);
    const lateDays = dailyStats.reduce((sum, d) => sum + d.late, 0);
    const totalRecords = presentDays + absentDays + lateDays;

    const attendancePercentage =
      totalRecords > 0 ? Math.round(((presentDays + lateDays) / totalRecords) * 100) : 0;

    return {
      month,
      totalDays,
      presentDays,
      absentDays,
      lateDays,
      attendancePercentage,
      dailyStats,
    };
  }
}

export const studentAttendanceService = new StudentAttendanceService();

