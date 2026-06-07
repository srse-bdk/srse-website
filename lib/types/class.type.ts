import type { BaseEntity } from "./common.type";

export type ClassStatus = "active" | "inactive";

export interface Class extends BaseEntity {
  name: string; // e.g., "Class 1", "Class 10", "Grade 1"
  description?: string;
  sections: string[]; // e.g., ["A", "B", "C"]
  capacityPerSection: number; // Maximum students per section
  academicYear: string; // e.g., "2024-25", "2025-26"
  status: ClassStatus;
  order?: number; // For sorting classes
}

// Input types for class creation
export interface ClassInput {
  name: string;
  description?: string;
  sections: string[];
  capacityPerSection: number;
  academicYear: string;
  status?: ClassStatus;
  order?: number;
}

export interface ClassUpdateInput {
  name?: string;
  description?: string;
  sections?: string[];
  capacityPerSection?: number;
  academicYear?: string;
  status?: ClassStatus;
  order?: number;
}

