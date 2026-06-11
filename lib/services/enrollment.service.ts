import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  Enrollment,
  EnrollmentInput,
  EnrollmentUpdateInput,
} from "@/lib/types/enrollment.type";
import { classService } from "./class.service";

class EnrollmentService {
  /**
   * Enroll a student in a class
   */
  async enroll(data: EnrollmentInput): Promise<string> {
    const nowISO = new Date().toISOString();

    // Validate class exists
    const classData = await classService.getById(data.classId);
    if (!classData) {
      throw new Error("Class not found");
    }

    // Validate section exists in class
    if (!classData.sections.includes(data.section)) {
      throw new Error("Section does not exist in this class");
    }

    // Check if roll number already exists in this class+section+academicYear
    const isRollNumberAvailable = await this.validateRollNumber(
      data.classId,
      data.section,
      data.rollNumber,
    );
    if (!isRollNumberAvailable) {
      throw new Error("Roll number already exists in this class and section");
    }

    // Check if student is already enrolled in the same academic year
    const existingEnrollments = await this.getByStudentId(data.studentId);
    const activeEnrollment = existingEnrollments.find(
      (e) => e.academicYear === data.academicYear && e.status === "active",
    );
    if (activeEnrollment) {
      throw new Error(
        "Student is already enrolled in this academic year. Please transfer or withdraw the existing enrollment first.",
      );
    }

    const enrollmentData = {
      studentId: data.studentId,
      classId: data.classId,
      section: data.section,
      rollNumber: data.rollNumber,
      academicYear: data.academicYear,
      enrollmentDate: data.enrollmentDate || nowISO,
      status: (data.status || "active") as Enrollment["status"],
      previousEnrollmentId: data.previousEnrollmentId,
      notes: data.notes,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const enrollmentId = await mutate({
      action: "createWithId",
      path: "enrollments",
      data: enrollmentData,
      actionBy: "admin",
    });

    // Update student's current class information
    await mutate({
      action: "update",
      path: `students/${data.studentId}`,
      data: {
        currentClass: classData.name,
        currentSection: data.section,
        rollNumber: data.rollNumber,
        updatedAt: nowISO,
      },
      actionBy: "admin",
    });

    return enrollmentId;
  }

  /**
   * Import multiple enrollments (bulk create)
   * Returns an array of results with success/error status for each enrollment
   */
  async importEnrollments(enrollments: EnrollmentInput[]): Promise<
    Array<{
      success: boolean;
      enrollmentId?: string;
      error?: string;
      index: number;
    }>
  > {
    const results: Array<{
      success: boolean;
      enrollmentId?: string;
      error?: string;
      index: number;
    }> = [];

    for (let i = 0; i < enrollments.length; i++) {
      const enrollment = enrollments[i];
      try {
        const enrollmentId = await this.enroll(enrollment);
        results.push({
          success: true,
          enrollmentId,
          index: i,
        });
      } catch (error) {
        results.push({
          success: false,
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
          index: i,
        });
      }
    }

    return results;
  }

  /**
   * Get all enrollments
   */
  async getAll(): Promise<Enrollment[]> {
    const data = await mutate({
      action: "get",
      path: "enrollments",
      actionBy: "admin",
    });

    return getArrFromObj<Enrollment & Record<string, unknown>>(
      (data || {}) as Record<string, Enrollment & Record<string, unknown>>,
    );
  }

  /**
   * Get enrollment by ID
   */
  async getById(id: string): Promise<Enrollment | null> {
    const data = await mutate({
      action: "get",
      path: `enrollments/${id}`,
      actionBy: "admin",
    });

    return data ? { ...data, id } : null;
  }

  /**
   * Get enrollments by student ID (full history)
   */
  async getByStudentId(studentId: string): Promise<Enrollment[]> {
    const allEnrollments = await this.getAll();
    return allEnrollments.filter((e) => e.studentId === studentId);
  }

  /**
   * Get current active enrollment for a student
   */
  async getCurrentEnrollment(studentId: string): Promise<Enrollment | null> {
    const enrollments = await this.getByStudentId(studentId);
    return enrollments.find((e) => e.status === "active") || null;
  }

  /**
   * Get enrollments by class ID
   */
  async getByClassId(classId: string, section?: string): Promise<Enrollment[]> {
    const allEnrollments = await this.getAll();
    let filtered = allEnrollments.filter((e) => e.classId === classId);
    if (section) {
      filtered = filtered.filter((e) => e.section === section);
    }
    return filtered;
  }

  /**
   * Get enrollments by class and section
   */
  async getByClassAndSection(
    classId: string,
    section: string,
  ): Promise<Enrollment[]> {
    return this.getByClassId(classId, section);
  }

  /**
   * Get enrollments by academic year
   */
  async getByAcademicYear(academicYear: string): Promise<Enrollment[]> {
    const allEnrollments = await this.getAll();
    return allEnrollments.filter((e) => e.academicYear === academicYear);
  }

  /**
   * Update enrollment
   */
  async update(id: string, data: EnrollmentUpdateInput): Promise<void> {
    const nowISO = new Date().toISOString();

    // If roll number is being updated, validate it
    if (data.rollNumber) {
      const enrollment = await this.getById(id);
      if (!enrollment) {
        throw new Error("Enrollment not found");
      }

      const isAvailable = await this.validateRollNumber(
        data.classId || enrollment.classId,
        data.section || enrollment.section,
        data.rollNumber,
        id,
      );
      if (!isAvailable) {
        throw new Error("Roll number already exists in this class and section");
      }
    }

    const updateData: Partial<Enrollment> = {
      ...data,
      updatedAt: nowISO,
    };

    await mutate({
      action: "update",
      path: `enrollments/${id}`,
      data: updateData,
      actionBy: "admin",
    });

    // If class or section changed, update student record
    if (data.classId || data.section || data.rollNumber) {
      const enrollment = await this.getById(id);
      if (enrollment) {
        const classData = await classService.getById(
          data.classId || enrollment.classId,
        );
        if (classData) {
          await mutate({
            action: "update",
            path: `students/${enrollment.studentId}`,
            data: {
              currentClass: classData.name,
              currentSection: data.section || enrollment.section,
              rollNumber: data.rollNumber || enrollment.rollNumber,
              updatedAt: nowISO,
            },
            actionBy: "admin",
          });
        }
      }
    }
  }

  /**
   * Transfer student to a different class/section
   */
  async transfer(
    enrollmentId: string,
    newClassId: string,
    newSection: string,
    newRollNumber?: string,
  ): Promise<void> {
    const enrollment = await this.getById(enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // Get next roll number if not provided
    let rollNumber = newRollNumber;
    if (!rollNumber) {
      rollNumber = await this.getNextRollNumber(newClassId, newSection);
    }

    // Validate roll number
    const isAvailable = await this.validateRollNumber(
      newClassId,
      newSection,
      rollNumber,
    );
    if (!isAvailable) {
      throw new Error("Roll number already exists in this class and section");
    }

    // Create new enrollment
    await this.enroll({
      studentId: enrollment.studentId,
      classId: newClassId,
      section: newSection,
      rollNumber,
      academicYear: enrollment.academicYear,
      previousEnrollmentId: enrollmentId,
      notes: `Transferred from ${enrollment.classId}`,
    });

    // Mark old enrollment as transferred
    await this.update(enrollmentId, {
      status: "transferred",
      notes: `Transferred to ${newClassId} - Section ${newSection}`,
    });
  }

  /**
   * Promote student to next class
   */
  async promote(
    enrollmentId: string,
    newClassId: string,
    newSection: string,
    newRollNumber?: string,
  ): Promise<void> {
    const enrollment = await this.getById(enrollmentId);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // Get next academic year (increment by 1)
    const currentYear = parseInt(enrollment.academicYear.split("-")[0]);
    const nextYear = currentYear + 1;
    const newAcademicYear = `${nextYear}-${String(nextYear + 1).slice(-2)}`;

    // Get next roll number if not provided
    let rollNumber = newRollNumber;
    if (!rollNumber) {
      rollNumber = await this.getNextRollNumber(newClassId, newSection);
    }

    // Validate roll number
    const isAvailable = await this.validateRollNumber(
      newClassId,
      newSection,
      rollNumber,
    );
    if (!isAvailable) {
      throw new Error("Roll number already exists in this class and section");
    }

    // Create new enrollment for next academic year
    await this.enroll({
      studentId: enrollment.studentId,
      classId: newClassId,
      section: newSection,
      rollNumber,
      academicYear: newAcademicYear,
      previousEnrollmentId: enrollmentId,
      notes: `Promoted from ${enrollment.classId}`,
    });

    // Mark old enrollment as promoted
    await this.update(enrollmentId, {
      status: "promoted",
      notes: `Promoted to ${newClassId} - Section ${newSection}`,
    });
  }

  /**
   * Withdraw student
   */
  async withdraw(enrollmentId: string, reason?: string): Promise<void> {
    await this.update(enrollmentId, {
      status: "withdrawn",
      notes: reason || "Student withdrawn",
    });

    // Clear student's current class information
    const enrollment = await this.getById(enrollmentId);
    if (enrollment) {
      await mutate({
        action: "update",
        path: `students/${enrollment.studentId}`,
        data: {
          currentClass: undefined,
          currentSection: undefined,
          rollNumber: undefined,
          status: "inactive",
          updatedAt: new Date().toISOString(),
        },
        actionBy: "admin",
      });
    }
  }

  /**
   * Remove enrollments whose student record no longer exists.
   */
  async deleteOrphanedEnrollments(validStudentIds: Set<string>): Promise<number> {
    const enrollments = await this.getAll();
    let deletedCount = 0;

    for (const enrollment of enrollments) {
      if (validStudentIds.has(enrollment.studentId)) continue;
      await mutate({
        action: "delete",
        path: `enrollments/${enrollment.id}`,
        actionBy: "admin",
      });
      deletedCount += 1;
    }

    return deletedCount;
  }

  /**
   * Delete all enrollments for a student (used when removing the student).
   */
  async deleteByStudentId(studentId: string): Promise<void> {
    const enrollments = await this.getByStudentId(studentId);
    for (const enrollment of enrollments) {
      await mutate({
        action: "delete",
        path: `enrollments/${enrollment.id}`,
        actionBy: "admin",
      });
    }
  }

  /**
   * Delete enrollment (hard delete)
   */
  async delete(id: string): Promise<void> {
    const enrollment = await this.getById(id);
    if (!enrollment) {
      throw new Error("Enrollment not found");
    }

    // Check if this was the active enrollment for the student
    if (enrollment.status === "active") {
      const studentEnrollment = await this.getCurrentEnrollment(
        enrollment.studentId,
      );
      // If this is indeed the current active enrollment (double check consistent state)
      if (studentEnrollment && studentEnrollment.id === id) {
        // Clear student's current class info
        await mutate({
          action: "update",
          path: `students/${enrollment.studentId}`,
          data: {
            currentClass: undefined,
            currentSection: undefined,
            rollNumber: undefined,
            status: "inactive", // Or should we revert to previous? Simplest is inactive.
            updatedAt: new Date().toISOString(),
          },
          actionBy: "admin",
        });
      }
    }

    await mutate({
      action: "delete",
      path: `enrollments/${id}`,
      actionBy: "admin",
    });
  }

  /**
   * Get next available roll number for a class and section
   */
  async getNextRollNumber(classId: string, section: string): Promise<string> {
    const enrollments = await this.getByClassAndSection(classId, section);
    const activeEnrollments = enrollments.filter((e) => e.status === "active");

    if (activeEnrollments.length === 0) {
      return "1";
    }

    // Extract numeric roll numbers and find the max
    const rollNumbers = activeEnrollments
      .map((e) => {
        const num = parseInt(e.rollNumber);
        return Number.isNaN(num) ? 0 : num;
      })
      .filter((n) => n > 0);

    if (rollNumbers.length === 0) {
      return "1";
    }

    const maxRollNumber = Math.max(...rollNumbers);
    return String(maxRollNumber + 1);
  }

  /**
   * Validate if roll number is available in a class and section
   */
  async validateRollNumber(
    classId: string,
    section: string,
    rollNumber: string,
    excludeEnrollmentId?: string,
  ): Promise<boolean> {
    const enrollments = await this.getByClassAndSection(classId, section);
    const activeEnrollments = enrollments.filter(
      (e) => e.status === "active" && e.id !== excludeEnrollmentId,
    );

    return !activeEnrollments.some((e) => e.rollNumber === rollNumber);
  }
}

export const enrollmentService = new EnrollmentService();
