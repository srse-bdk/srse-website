import type {
    Guardian,
    Student,
    StudentAddress,
    StudentDocument,
    StudentInput,
    StudentUpdateInput,
} from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import { getStudentLoginEmailFromPen, normalizePen } from "@/lib/utils/student-login";
import {
  getClassSectionGroupKey,
  getNextRollNumberForClassSection,
} from "@/lib/utils/student-roll-number";
import type { Enrollment } from "@/lib/types/enrollment.type";
import type { Class } from "@/lib/types/class.type";
import { ensureUniqueScanId, generateUniqueScanId } from "@/lib/utils/scan-id";
import { getArrFromObj } from "@ashirbad/js-core";
import { createUser, mutate } from "@atechhub/firebase";

class StudentService {
  /**
   * Create a new student
   */
  async create(data: StudentInput): Promise<string> {
    const nowISO = new Date().toISOString();
    const pen = data.pen ? normalizePen(data.pen) : "";
    const scanId = data.scanId
      ? await ensureUniqueScanId(data.scanId)
      : await generateUniqueScanId("STU");
    let studentAuthUid: string | null = null;
    let studentAuthEmail: string | null = null;

    // Check if admission number already exists
    if (data.admissionNumber) {
      const existing = await this.getByAdmissionNumber(data.admissionNumber);
      if (existing) {
        throw new Error("Admission number already exists");
      }
    }

    // Validate guardians if provided
    if (data.guardians && data.guardians.length > 0) {
      const primaryGuardians = data.guardians.filter((g) => g.isPrimary);
      if (primaryGuardians.length !== 1) {
        throw new Error(
          "Exactly one primary guardian is required if guardians are provided",
        );
      }
    }

    // Compute full name
    const fullName = `${data.firstName} ${data.lastName}`.trim();

    let rollNumber = data.rollNumber?.trim();
    if (
      !rollNumber &&
      data.currentClass?.trim() &&
      data.currentSection?.trim()
    ) {
      const students = await this.getAll();
      rollNumber = getNextRollNumberForClassSection(
        students,
        data.currentClass.trim(),
        data.currentSection.trim(),
      );
    }

    if (pen) {
      studentAuthEmail = getStudentLoginEmailFromPen(pen);

      try {
        const authResponse = await createUser(studentAuthEmail, pen);
        studentAuthUid = authResponse.localId;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message.toLowerCase() : "";

        if (errorMessage.includes("email-already-in-use")) {
          const existingUser = await this.getUserByEmail(studentAuthEmail);
          if (existingUser?.uid) {
            studentAuthUid = existingUser.uid;
          }
        } else {
          throw error;
        }
      }
    }

    const studentData = {
      scanId,
      admissionNumber: data.admissionNumber,
      admissionDate: data.admissionDate || nowISO, // Use current date if not provided
      firstName: data.firstName,
      lastName: data.lastName,
      fullName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      email: data.email,
      phone: data.phone,
      alternatePhone: data.alternatePhone,
      address: data.address,
      guardians: data.guardians,
      profilePicture: data.profilePicture,
      profilePictureFileKey: data.profilePictureFileKey,
      documents: data.documents || [], // Include documents from input
      status: data.status || "active",
      currentClass: data.currentClass,
      currentSection: data.currentSection,
      rollNumber: rollNumber || data.rollNumber,
      siblingIds: data.siblingIds || [],
      pen: pen || undefined,
      socialCategory: data.socialCategory,
      socialCategoryCode: data.socialCategoryCode,
      fatherName: data.fatherName,
      motherName: data.motherName,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const studentId = await mutate({
      action: "createWithId",
      path: "students",
      data: {
        ...studentData,
        optionalFeeIds: data.optionalFeeIds || [],
        optionalFeeAmounts: data.optionalFeeAmounts || {},
      },
      actionBy: "admin",
    });

    if (pen && studentAuthUid && studentAuthEmail) {
      const userPayload = {
        uid: studentAuthUid,
        scanId,
        name: fullName,
        email: studentAuthEmail,
        password: pen,
        role: "student" as const,
        status: "active" as const,
        gender: data.gender,
        studentId,
        pen,
        fatherName: data.fatherName,
        motherName: data.motherName,
        socialCategory: data.socialCategory,
        socialCategoryCode: data.socialCategoryCode,
        currentClass: data.currentClass,
        currentSection: data.currentSection,
      };

      const existingUser = await this.getUserById(studentAuthUid);
      await mutate({
        action: existingUser ? "update" : "create",
        path: `users/${studentAuthUid}`,
        data: userPayload,
        actionBy: "admin",
      });
    }

    return studentId;
  }

  private async getUserById(id: string): Promise<User | null> {
    const data = await mutate({
      action: "get",
      path: `users/${id}`,
    });
    return (data as unknown as User) || null;
  }

  private async getUserByEmail(email: string): Promise<User | null> {
    const users = (await mutate({
      action: "get",
      path: "users",
    })) as Record<string, User> | null;

    return (
      Object.values(users || {}).find(
        (user) => user?.email?.toLowerCase() === email.toLowerCase(),
      ) || null
    );
  }

  /**
   * Import multiple students (bulk create)
   * Returns an array of results with success/error status for each student
   */
  async importStudents(students: StudentInput[]): Promise<
    Array<{
      success: boolean;
      studentId?: string;
      error?: string;
      index: number;
    }>
  > {
    const results: Array<{
      success: boolean;
      studentId?: string;
      error?: string;
      index: number;
    }> = [];

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      try {
        const studentId = await this.create(student);
        results.push({
          success: true,
          studentId,
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
   * Get all students
   */
  async getAll(): Promise<Student[]> {
    const data = await mutate({
      action: "get",
      path: "students",
    });
    return getArrFromObj(data || {}) as unknown as Student[];
  }

  /**
   * Get a student by ID
   */
  async getById(id: string): Promise<Student | null> {
    const data = await mutate({
      action: "get",
      path: `students/${id}`,
    });
    return (data as unknown as Student) || null;
  }

  /**
   * Get student by admission number
   */
  async getByAdmissionNumber(admissionNumber: string): Promise<Student | null> {
    const students = await this.getAll();
    return (
      students.find(
        (student) =>
          student.admissionNumber?.toLowerCase() ===
          admissionNumber.toLowerCase(),
      ) || null
    );
  }

  /**
   * Update a student
   */
  async update(id: string, data: StudentUpdateInput): Promise<void> {
    const nowISO = new Date().toISOString();

    // If admission number is being updated, check uniqueness
    if (data.admissionNumber) {
      const existing = await this.getByAdmissionNumber(data.admissionNumber);
      if (existing && existing.id !== id) {
        throw new Error("Admission number already exists");
      }
    }

    // If name fields are updated, recompute fullName
    const { address, ...restData } = data;

    const updateData: Partial<Student> = { ...restData };

    // Fetch current student if needed for name or address updates
    const needsCurrent = data.firstName || data.lastName || address;
    const current = needsCurrent ? await this.getById(id) : null;

    if (address && current) {
      // If address is provided, merge with current address if exists
      if (current.address) {
        updateData.address = {
          ...current.address,
          ...address,
        } as StudentAddress;
      } else {
        updateData.address = address as StudentAddress;
      }
    } else if (address) {
      updateData.address = address as StudentAddress;
    }

    if (data.firstName || data.lastName) {
      if (current) {
        const firstName = data.firstName || current.firstName;
        const lastName = data.lastName || current.lastName;
        updateData.fullName = `${firstName} ${lastName}`.trim();
      }
    }

    // Validate guardians if provided
    if (data.guardians) {
      if (data.guardians.length === 0) {
        throw new Error("At least one guardian is required");
      }
      const primaryGuardians = data.guardians.filter((g) => g.isPrimary);
      if (primaryGuardians.length !== 1) {
        throw new Error("Exactly one primary guardian is required");
      }
    }

    await mutate({
      action: "update",
      path: `students/${id}`,
      data: {
        ...updateData,
        updatedAt: nowISO,
      },
      actionBy: "admin",
    });
  }

  /**
   * Delete a student (with document cleanup)
   */
  async delete(id: string): Promise<void> {
    const student = await this.getById(id);
    if (!student) {
      throw new Error("Student not found");
    }

    // Delete profile picture if exists
    if (student.profilePictureFileKey) {
      try {
        await this.deleteFile(student.profilePictureFileKey);
      } catch (error) {
        console.error("Error deleting profile picture:", error);
        // Continue with deletion even if file deletion fails
      }
    }

    // Delete all documents
    if (student.documents && student.documents.length > 0) {
      for (const doc of student.documents) {
        try {
          await this.deleteFile(doc.fileKey);
        } catch (error) {
          console.error(`Error deleting document ${doc.id}:`, error);
          // Continue with deletion even if file deletion fails
        }
      }
    }

    // Delete student record
    await mutate({
      action: "delete",
      path: `students/${id}`,
      actionBy: "admin",
    });
  }

  /**
   * Add a guardian to a student
   */
  async addGuardian(studentId: string, guardian: Guardian): Promise<void> {
    const student = await this.getById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const guardians = [...(student.guardians || [])];

    // If this is the first guardian or if it's marked as primary, ensure only one primary
    if (guardian.isPrimary) {
      guardians.forEach((g) => {
        g.isPrimary = false;
      });
    }

    guardians.push(guardian);

    await this.update(studentId, { guardians });
  }

  /**
   * Update a guardian
   */
  async updateGuardian(
    studentId: string,
    guardianId: string,
    guardian: Partial<Guardian>,
  ): Promise<void> {
    const student = await this.getById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const guardians = [...(student.guardians || [])];
    const index = guardians.findIndex((g) => g.id === guardianId);
    if (index === -1) {
      throw new Error("Guardian not found");
    }

    // If making this guardian primary, unset others
    if (guardian.isPrimary) {
      guardians.forEach((g) => {
        if (g.id !== guardianId) {
          g.isPrimary = false;
        }
      });
    }

    guardians[index] = { ...guardians[index], ...guardian };

    await this.update(studentId, { guardians });
  }

  /**
   * Remove a guardian
   */
  async removeGuardian(studentId: string, guardianId: string): Promise<void> {
    const student = await this.getById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const guardians = (student.guardians || []).filter(
      (g) => g.id !== guardianId,
    );

    if (guardians.length === 0) {
      throw new Error("Cannot remove the last guardian");
    }

    // If we removed the primary guardian, make the first one primary
    const hadPrimary = student.guardians.some((g) => g.isPrimary);
    if (hadPrimary && !guardians.some((g) => g.isPrimary)) {
      guardians[0].isPrimary = true;
    }

    await this.update(studentId, { guardians });
  }

  /**
   * Add a document to a student
   */
  async addDocument(
    studentId: string,
    document: StudentDocument,
  ): Promise<void> {
    const student = await this.getById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const documents = [...(student.documents || []), document];

    await mutate({
      action: "update",
      path: `students/${studentId}`,
      data: {
        documents,
        updatedAt: new Date().toISOString(),
      },
      actionBy: "admin",
    });
  }

  /**
   * Remove a document (with file deletion)
   */
  async removeDocument(studentId: string, documentId: string): Promise<void> {
    const student = await this.getById(studentId);
    if (!student) {
      throw new Error("Student not found");
    }

    const document = student.documents?.find((d) => d.id === documentId);
    if (!document) {
      throw new Error("Document not found");
    }

    // Delete file from UploadThing
    try {
      await this.deleteFile(document.fileKey);
    } catch (error) {
      console.error("Error deleting document file:", error);
      // Continue with removal even if file deletion fails
    }

    const documents = (student.documents || []).filter(
      (d) => d.id !== documentId,
    );

    await mutate({
      action: "update",
      path: `students/${studentId}`,
      data: {
        documents,
        updatedAt: new Date().toISOString(),
      },
      actionBy: "admin",
    });
  }

  /**
   * Assign roll numbers alphabetically within each class-section group.
   * Intended once per academic year. Overwrites existing roll numbers.
   */
  async assignRollNumbersAlphabetically(): Promise<{
    updatedCount: number;
    skippedCount: number;
    groupCount: number;
  }> {
    const nowISO = new Date().toISOString();
    const [students, enrollmentsRaw, classesRaw] = await Promise.all([
      this.getAll(),
      mutate({ action: "get", path: "enrollments" }),
      mutate({ action: "get", path: "classes" }),
    ]);

    const enrollments = getArrFromObj<Enrollment & Record<string, unknown>>(
      (enrollmentsRaw || {}) as Record<string, Enrollment & Record<string, unknown>>,
    );
    const classes = getArrFromObj<Class & Record<string, unknown>>(
      (classesRaw || {}) as Record<string, Class & Record<string, unknown>>,
    );
    const classNameById = new Map(classes.map((cls) => [cls.id, cls.name]));

    const grouped = new Map<string, Array<Student & { groupClass: string; groupSection: string }>>();
    let skippedCount = 0;

    for (const student of students) {
      if (student.status !== "active") continue;

      let groupClass = student.currentClass?.trim() || "";
      let groupSection = student.currentSection?.trim() || "";

      if (!groupClass || !groupSection) {
        const activeEnrollment = enrollments
          .filter(
            (enrollment) =>
              enrollment.studentId === student.id &&
              enrollment.status === "active",
          )
          .sort((left, right) =>
            right.enrollmentDate.localeCompare(left.enrollmentDate),
          )[0];

        if (activeEnrollment) {
          groupClass =
            classNameById.get(activeEnrollment.classId) || groupClass;
          groupSection = activeEnrollment.section || groupSection;
        }
      }

      if (!groupClass || !groupSection) {
        skippedCount += 1;
        continue;
      }

      const key = getClassSectionGroupKey(groupClass, groupSection);
      const list = grouped.get(key) || [];
      list.push({
        ...student,
        groupClass,
        groupSection,
      });
      grouped.set(key, list);
    }

    let updatedCount = 0;
    const tempPrefix = "ROLL-TEMP-";

    for (const groupStudents of grouped.values()) {
      const sortedStudents = [...groupStudents].sort((left, right) =>
        (left.fullName || "").localeCompare(right.fullName || "", undefined, {
          sensitivity: "base",
        }),
      );

      for (const student of sortedStudents) {
        await mutate({
          action: "update",
          path: `students/${student.id}`,
          data: {
            rollNumber: `${tempPrefix}${student.id}`,
            updatedAt: nowISO,
          },
          actionBy: "admin",
        });

        for (const enrollment of enrollments) {
          if (
            enrollment.studentId === student.id &&
            enrollment.status === "active"
          ) {
            await mutate({
              action: "update",
              path: `enrollments/${enrollment.id}`,
              data: {
                rollNumber: `${tempPrefix}${student.id}`,
                updatedAt: nowISO,
              },
              actionBy: "admin",
            });
          }
        }
      }

      for (let index = 0; index < sortedStudents.length; index += 1) {
        const student = sortedStudents[index];
        const rollNumber = String(index + 1);

        await mutate({
          action: "update",
          path: `students/${student.id}`,
          data: {
            currentClass: student.groupClass,
            currentSection: student.groupSection,
            rollNumber,
            updatedAt: nowISO,
          },
          actionBy: "admin",
        });

        for (const enrollment of enrollments) {
          if (
            enrollment.studentId === student.id &&
            enrollment.status === "active"
          ) {
            await mutate({
              action: "update",
              path: `enrollments/${enrollment.id}`,
              data: {
                rollNumber,
                updatedAt: nowISO,
              },
              actionBy: "admin",
            });
          }
        }

        updatedCount += 1;
      }
    }

    return {
      updatedCount,
      skippedCount,
      groupCount: grouped.size,
    };
  }

  /**
   * Delete file from UploadThing
   */
  private async deleteFile(fileKey: string): Promise<void> {
    try {
      const response = await fetch(
        `/api/uploadthing/delete?fileKey=${encodeURIComponent(fileKey)}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }
    } catch (error) {
      console.error("Error deleting file:", error);
      throw error;
    }
  }
}

export const studentService = new StudentService();
