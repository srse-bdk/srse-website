import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  Subject,
  SubjectInput,
  SubjectUpdateInput,
} from "@/lib/types/subject.type";

class SubjectService {
  /**
   * Create a new subject
   */
  async create(data: SubjectInput): Promise<string> {
    const nowISO = new Date().toISOString();

    // Validate required fields
    if (!data.name?.trim()) {
      throw new Error("Subject name is required");
    }

    const subjectData = {
      name: data.name.trim(),
      code: data.code,
      description: data.description,
      classId: data.classId,
      section: data.section,
      staffId: data.staffId,
      academicYear: data.academicYear,
      status: data.status || "active",
      order: data.order,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const subjectId = await mutate({
      action: "createWithId",
      path: "subjects",
      data: subjectData,
      actionBy: "admin",
    });

    return subjectId;
  }

  /**
   * Import multiple subjects (bulk create)
   * Returns an array of results with success/error status for each subject
   */
  async importSubjects(subjects: SubjectInput[]): Promise<
    Array<{
      success: boolean;
      subjectId?: string;
      error?: string;
      index: number;
    }>
  > {
    const results: Array<{
      success: boolean;
      subjectId?: string;
      error?: string;
      index: number;
    }> = [];

    for (let i = 0; i < subjects.length; i++) {
      const subject = subjects[i];
      try {
        const subjectId = await this.create(subject);
        results.push({
          success: true,
          subjectId,
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
   * Get all subjects
   */
  async getAll(): Promise<Subject[]> {
    const data = await mutate({
      action: "get",
      path: "subjects",
      actionBy: "admin",
    });

    return getArrFromObj<Subject & Record<string, unknown>>(
      (data || {}) as Record<string, Subject & Record<string, unknown>>,
    );
  }

  /**
   * Get subject by ID
   */
  async getById(id: string): Promise<Subject | null> {
    const data = await mutate({
      action: "get",
      path: `subjects/${id}`,
      actionBy: "admin",
    });

    return data ? { ...data, id } : null;
  }

  /**
   * Get subjects by class ID
   */
  async getByClassId(classId: string): Promise<Subject[]> {
    const allSubjects = await this.getAll();
    return allSubjects.filter((s) => s.classId && s.classId === classId);
  }

  /**
   * Get subjects by staff ID
   * Legacy helper (for backward compatibility with old subject records)
   */
  async getByStaffId(staffId: string): Promise<Subject[]> {
    const allSubjects = await this.getAll();
    return allSubjects.filter((s) => s.staffId === staffId);
  }

  /**
   * Get subjects by academic year
   */
  async getByAcademicYear(academicYear: string): Promise<Subject[]> {
    const allSubjects = await this.getAll();
    return allSubjects.filter(
      (s) => s.academicYear && s.academicYear === academicYear,
    );
  }

  /**
   * Get active subjects
   */
  async getActive(): Promise<Subject[]> {
    const allSubjects = await this.getAll();
    return allSubjects.filter((s) => s.status === "active");
  }

  /**
   * Update subject
   */
  async update(id: string, data: SubjectUpdateInput): Promise<void> {
    const nowISO = new Date().toISOString();

    const updateData: Partial<Subject> = {
      ...data,
      updatedAt: nowISO,
    };

    await mutate({
      action: "update",
      path: `subjects/${id}`,
      data: updateData,
      actionBy: "admin",
    });
  }

  /**
   * Delete subject
   */
  async delete(id: string): Promise<void> {
    await mutate({
      action: "delete",
      path: `subjects/${id}`,
      actionBy: "admin",
    });
  }
}

export const subjectService = new SubjectService();
