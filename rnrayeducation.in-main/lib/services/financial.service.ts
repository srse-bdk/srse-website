import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import type { FinancialTransaction } from "@/lib/types/financial.type";

class FinancialService {
  async createTransaction(
    data: Omit<FinancialTransaction, "id" | "createdAt" | "updatedAt">,
  ) {
    const nowISO = new Date().toISOString();
    return mutate({
      action: "createWithId",
      path: "financialTransactions",
      data: {
        ...data,
        createdAt: nowISO,
        updatedAt: nowISO,
      },
      actionBy: "admin",
    });
  }

  async updateTransaction(id: string, data: Partial<FinancialTransaction>) {
    const nowISO = new Date().toISOString();
    return mutate({
      action: "update",
      path: `financialTransactions/${id}`,
      data: {
        ...data,
        updatedAt: nowISO,
      },
      actionBy: "admin",
    });
  }

  async deleteTransaction(id: string) {
    return mutate({
      action: "delete",
      path: `financialTransactions/${id}`,
      actionBy: "admin",
    });
  }

  async getAllTransactions(): Promise<FinancialTransaction[]> {
    const data = await mutate({
      action: "get",
      path: "financialTransactions",
    });
    return getArrFromObj(data || {}) as unknown as FinancialTransaction[];
  }
}

export const financialService = new FinancialService();

