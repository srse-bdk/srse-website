import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  Class,
  ClassInput,
  ClassUpdateInput,
} from "@/lib/types/class.type";

class ClassService {
  /**
   * Create a new class
   */
  async create(data: ClassInput): Promise<string> {
    const nowISO = new Date().toISOString();

    // Validate sections
    if (!data.sections || data.sections.length === 0) {
      throw new Error("At least one section is required");
    }

    // Validate capacity
    if (data.capacityPerSection <= 0) {
      throw new Error("Capacity per section must be greater than 0");
    }

    const classData = {
      name: data.name,
      description: data.description,
      sections: data.sections,
      capacityPerSection: data.capacityPerSection,
      academicYear: data.academicYear,
      status: data.status || "active",
      order: data.order,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const classId = await mutate({
      action: "createWithId",
      path: "classes",
      data: classData,
      actionBy: "admin",
    });

    return classId;
  }

  /**
   * Import multiple classes (bulk create)
   * Returns an array of results with success/error status for each class
   */
  async importClasses(classes: ClassInput[]): Promise<
    Array<{
      success: boolean;
      classId?: string;
      error?: string;
      index: number;
    }>
  > {
    const results: Array<{
      success: boolean;
      classId?: string;
      error?: string;
      index: number;
    }> = [];

    for (let i = 0; i < classes.length; i++) {
      const classItem = classes[i];
      try {
        const classId = await this.create(classItem);
        results.push({
          success: true,
          classId,
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
   * Get all classes
   */
  async getAll(): Promise<Class[]> {
    const data = await mutate({
      action: "get",
      path: "classes",
      actionBy: "admin",
    });

    return getArrFromObj<Class & Record<string, unknown>>(
      (data || {}) as Record<string, Class & Record<string, unknown>>
    );
  }

  /**
   * Get class by ID
   */
  async getById(id: string): Promise<Class | null> {
    const data = await mutate({
      action: "get",
      path: `classes/${id}`,
      actionBy: "admin",
    });

    return data ? { ...data, id } : null;
  }

  /**
   * Get classes by academic year
   */
  async getByAcademicYear(academicYear: string): Promise<Class[]> {
    const allClasses = await this.getAll();
    return allClasses.filter((c) => c.academicYear === academicYear);
  }

  /**
   * Get active classes
   */
  async getActive(): Promise<Class[]> {
    const allClasses = await this.getAll();
    return allClasses.filter((c) => c.status === "active");
  }

  /**
   * Update class
   */
  async update(id: string, data: ClassUpdateInput): Promise<void> {
    const nowISO = new Date().toISOString();

    // Validate sections if provided
    if (data.sections && data.sections.length === 0) {
      throw new Error("At least one section is required");
    }

    // Validate capacity if provided
    if (data.capacityPerSection !== undefined && data.capacityPerSection <= 0) {
      throw new Error("Capacity per section must be greater than 0");
    }

    const updateData: Partial<Class> = {
      ...data,
      updatedAt: nowISO,
    };

    await mutate({
      action: "update",
      path: `classes/${id}`,
      data: updateData,
      actionBy: "admin",
    });
  }

  /**
   * Delete class
   */
  async delete(id: string): Promise<void> {
    // Note: Should check if there are any enrollments before deleting
    // This validation can be added in the component/service layer
    await mutate({
      action: "delete",
      path: `classes/${id}`,
      actionBy: "admin",
    });
  }

  /**
   * Add section to class
   */
  async addSection(classId: string, section: string): Promise<void> {
    const classData = await this.getById(classId);
    if (!classData) {
      throw new Error("Class not found");
    }

    if (classData.sections.includes(section)) {
      throw new Error("Section already exists");
    }

    const updatedSections = [...classData.sections, section];
    await this.update(classId, { sections: updatedSections });
  }

  /**
   * Remove section from class
   */
  async removeSection(classId: string, section: string): Promise<void> {
    const classData = await this.getById(classId);
    if (!classData) {
      throw new Error("Class not found");
    }

    if (!classData.sections.includes(section)) {
      throw new Error("Section does not exist");
    }

    const updatedSections = classData.sections.filter((s) => s !== section);
    await this.update(classId, { sections: updatedSections });
  }
}

export const classService = new ClassService();
