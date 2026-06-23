import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type {
  Testimonial,
  TestimonialInput,
} from "@/lib/types/testimonial.type";

class TestimonialService {
  async create(data: TestimonialInput): Promise<string> {
    const nowISO = new Date().toISOString();

    const testimonialData = {
      name: data.name,
      role: data.role,
      quote: data.quote,
      status: data.status ?? "published",
      sortOrder: data.sortOrder ?? 0,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    const id = await mutate({
      action: "createWithId",
      path: "testimonials",
      data: testimonialData,
      actionBy: "admin",
    });

    return id;
  }

  async getAll(): Promise<Testimonial[]> {
    const data = await mutate({
      action: "get",
      path: "testimonials",
    });
    return getArrFromObj(data || {}) as unknown as Testimonial[];
  }

  async update(id: string, data: Partial<TestimonialInput>): Promise<void> {
    const nowISO = new Date().toISOString();

    await mutate({
      action: "update",
      path: `testimonials/${id}`,
      data: {
        ...data,
        updatedAt: nowISO,
      },
      actionBy: "admin",
    });
  }

  async delete(id: string): Promise<void> {
    await mutate({
      action: "delete",
      path: `testimonials/${id}`,
      actionBy: "admin",
    });
  }
}

export const testimonialService = new TestimonialService();
