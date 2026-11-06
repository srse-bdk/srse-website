import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type { BreakfastOrder } from "@/lib/types/canteen.type";
import {
  breakfastOrderId,
  isOrderingOpenForDate,
} from "@/lib/utils/canteen-breakfast";

export interface PlaceBreakfastOrderInput {
  studentId: string;
  studentName: string;
  classLabel: string;
  forDate: string;
}

class BreakfastOrderService {
  async getAll(): Promise<BreakfastOrder[]> {
    const data = await mutate({ action: "get", path: "breakfastOrders" });
    return getArrFromObj(data || {}) as unknown as BreakfastOrder[];
  }

  async getByDate(forDate: string): Promise<BreakfastOrder[]> {
    const all = await this.getAll();
    return all.filter((row) => row.forDate === forDate);
  }

  async getForStudentDate(
    studentId: string,
    forDate: string,
  ): Promise<BreakfastOrder | null> {
    const id = breakfastOrderId(studentId, forDate);
    const data = await mutate({
      action: "get",
      path: `breakfastOrders/${id}`,
    });
    if (!data) return null;
    return { ...(data as BreakfastOrder), id };
  }

  /** Place or re-activate an order for breakfast on forDate (before 10 PM cutoff). */
  async placeOrder(
    input: PlaceBreakfastOrderInput,
    actionBy: string,
  ): Promise<string> {
    if (!isOrderingOpenForDate(input.forDate)) {
      throw new Error("Ordering is closed for this date (cutoff 10:00 PM)");
    }

    const id = breakfastOrderId(input.studentId, input.forDate);
    const existing = await this.getForStudentDate(
      input.studentId,
      input.forDate,
    );
    const nowISO = new Date().toISOString();

    if (existing?.status === "paid") {
      throw new Error("This breakfast order is already paid");
    }

    if (existing) {
      await mutate({
        action: "update",
        path: `breakfastOrders/${id}`,
        data: {
          studentName: input.studentName,
          classLabel: input.classLabel,
          status: "ordered",
          orderedAt: nowISO,
          orderedBy: actionBy,
          updatedAt: nowISO,
          cancelledAt: null,
        },
        actionBy,
      });
      return id;
    }

    await mutate({
      action: "create",
      path: `breakfastOrders/${id}`,
      data: {
        id,
        studentId: input.studentId,
        studentName: input.studentName,
        classLabel: input.classLabel,
        forDate: input.forDate,
        status: "ordered",
        orderedAt: nowISO,
        orderedBy: actionBy,
        updatedAt: nowISO,
      },
      actionBy,
    });
    return id;
  }

  async cancelOrder(
    studentId: string,
    forDate: string,
    actionBy: string,
  ): Promise<void> {
    if (!isOrderingOpenForDate(forDate)) {
      throw new Error("Cannot cancel after 10:00 PM cutoff");
    }

    const id = breakfastOrderId(studentId, forDate);
    const existing = await this.getForStudentDate(studentId, forDate);
    if (!existing || existing.status === "cancelled") return;
    if (existing.status === "paid") {
      throw new Error("Cannot cancel a paid order");
    }

    const nowISO = new Date().toISOString();
    await mutate({
      action: "update",
      path: `breakfastOrders/${id}`,
      data: {
        status: "cancelled",
        cancelledAt: nowISO,
        updatedAt: nowISO,
      },
      actionBy,
    });
  }

  async markPaid(orderId: string, actionBy: string): Promise<void> {
    const data = await mutate({
      action: "get",
      path: `breakfastOrders/${orderId}`,
    });
    if (!data) throw new Error("Order not found");
    const order = data as BreakfastOrder;
    if (order.status === "cancelled") {
      throw new Error("Cannot mark a cancelled order as paid");
    }
    if (order.status === "paid") return;

    const nowISO = new Date().toISOString();
    await mutate({
      action: "update",
      path: `breakfastOrders/${orderId}`,
      data: {
        status: "paid",
        paidAt: nowISO,
        paidBy: actionBy,
        updatedAt: nowISO,
      },
      actionBy,
    });
  }
}

export const breakfastOrderService = new BreakfastOrderService();
