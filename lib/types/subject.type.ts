import type { BaseEntity } from "./common.type";

export type SubjectStatus = "active" | "inactive";

export interface Subject extends BaseEntity {
  name: string; // e.g., "Mathematics", "English", "Science"
  code?: string; // e.g., "MATH", "ENG", "SCI"
  description?: string;
  classId?: string; // Legacy field (old structure)
  section?: string; // Legacy field (old structure)
  academicYear?: string; // Legacy field (old structure)
  staffId?: string; // Legacy field (kept optional for backward compatibility)
  status: SubjectStatus;
  order?: number; // For sorting subjects
}

// Input types for subject creation
export interface SubjectInput {
  name: string;
  code?: string;
  description?: string;
  classId?: string; // Legacy field
  section?: string; // Legacy field
  academicYear?: string; // Legacy field
  staffId?: string; // Legacy field (kept optional for backward compatibility)
  status?: SubjectStatus;
  order?: number;
}

export interface SubjectUpdateInput {
  name?: string;
  code?: string;
  description?: string;
  classId?: string;
  section?: string;
  staffId?: string;
  academicYear?: string;
  status?: SubjectStatus;
  order?: number;
}
