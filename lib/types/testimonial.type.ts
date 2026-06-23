import type { BaseEntity } from "./common.type";

export type TestimonialStatus = "draft" | "published";

export interface Testimonial extends BaseEntity {
  name: string;
  role: string;
  quote: string;
  status: TestimonialStatus;
  sortOrder?: number;
}

export interface TestimonialInput {
  name: string;
  role: string;
  quote: string;
  status?: TestimonialStatus;
  sortOrder?: number;
}
