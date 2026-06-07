import { FeeCategory, FeeConfiguration, FeeRecord, FeeStatus } from "@/lib/types/fee.type";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import { endOfMonth, format } from "date-fns";
import { financialService } from "./financial.service";

interface RecordFeePaymentInput {
  feeId: string;
  amountPaid: number;
  paymentMethod: "cash" | "online" | "check" | "transfer";
  paymentDate?: string;
  transactionId?: string;
  remarks?: string;
  paymentScreenshot?: string;
  paymentScreenshotFileKey?: string;
  paidBy?: "admin" | "staff" | "parent" | "student";
}

interface SubmitFeeVerificationInput {
  feeId: string;
  amountPaid: number;
  transactionId: string;
  remarks?: string;
  paymentScreenshot?: string;
  paymentScreenshotFileKey?: string;
  paidBy: "parent" | "student";
}

function mapFeeCategoryToIncomeCategory(category: string): string {
  const normalized = (category || "").toLowerCase();
  if (normalized.includes("tuition") || normalized.includes("tution")) return "Tuition Fee";
  if (normalized.includes("admission")) return "Admission Fees";
  if (normalized.includes("registration")) return "Registration Fees";
  if (normalized.includes("exam")) return "Examination Fees";
  if (normalized.includes("transport")) return "Transport Fees";
  if (normalized.includes("hostel")) return "Hostel Fees";
  if (normalized.includes("library")) return "Library Fees";
  if (normalized.includes("donation")) return "Donations";
  if (normalized.includes("fine") || normalized.includes("penalty")) return "Fine / Penalty Charges";
  return "Miscellaneous Income";
}

function buildReceiptNumber(feeId: string) {
  const now = new Date();
  const datePart = format(now, "yyyyMMdd");
  const shortId = (feeId || "NA").slice(-6).toUpperCase();
  const rand = Math.floor(100 + Math.random() * 900);
  return `RCPT-${datePart}-${shortId}-${rand}`;
}

function slug(input: string) {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getIssuePeriodKey(cycle: FeeConfiguration["cycle"], date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (cycle === "monthly") return `${y}-${String(m).padStart(2, "0")}`;
  if (cycle === "quarterly") return `${y}-q${Math.floor((m - 1) / 3) + 1}`;
  if (cycle === "annually") return `${y}`;
  return "one-time";
}

export const feeService = {
  async createFeeRecord(data: Partial<FeeRecord>) {
    const nowISO = new Date().toISOString();
    const payload: Omit<FeeRecord, "id"> = {
      studentId: data.studentId || "",
      studentName: data.studentName || "",
      classId: data.classId || "",
      feeConfigId: data.feeConfigId,
      issuePeriodKey: data.issuePeriodKey,
      feeStructureId: data.feeStructureId,
      title: data.title || "",
      description: data.description,
      category: (data.category || "other") as FeeCategory,
      amount: Number(data.amount) || 0,
      paidAmount: Number(data.paidAmount) || 0,
      discountAmount: Number(data.discountAmount) || 0,
      fineAmount: Number(data.fineAmount) || 0,
      dueDate: data.dueDate || nowISO.slice(0, 10),
      paidDate: data.paidDate,
      status: (data.status || "pending") as FeeStatus,
      paymentMethod: data.paymentMethod,
      transactionId: data.transactionId,
      paymentScreenshot: data.paymentScreenshot,
      paymentScreenshotFileKey: data.paymentScreenshotFileKey,
      pendingVerificationAt: data.pendingVerificationAt,
      pendingVerificationBy: data.pendingVerificationBy,
      pendingVerificationPaymentId: data.pendingVerificationPaymentId,
      remarks: data.remarks,
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    return mutate({
      action: "createWithId",
      path: "feeIssued",
      data: payload,
      actionBy: "admin",
    });
  },

  async bulkCreateFees(fees: Partial<FeeRecord>[]) {
    await Promise.all(fees.map((fee) => this.createFeeRecord(fee)));
  },

  async updateFeeRecord(id: string, data: Partial<FeeRecord>) {
    return mutate({
      action: "update",
      path: `feeIssued/${id}`,
      data: { ...data, updatedAt: new Date().toISOString() },
      actionBy: "admin",
    });
  },

  async recordFeePayment(input: RecordFeePaymentInput): Promise<FeePayment> {
    const raw = await mutate({
      action: "get",
      path: `feeIssued/${input.feeId}`,
    });
    if (!raw) throw new Error("Issued fee record not found");

    const fee = { ...(raw as Omit<FeeRecord, "id">), id: input.feeId } as FeeRecord;
    const paidOn = input.paymentDate || new Date().toISOString();
    const amount = Number(fee.amount) || 0;
    const currentPaid = Number(fee.paidAmount) || 0;
    const amountPaidNow = Number(input.amountPaid) || 0;
    const nextPaid = currentPaid + amountPaidNow;
    if (amountPaidNow <= 0) throw new Error("Invalid payment amount");
    if (nextPaid > amount) throw new Error("Payment exceeds pending amount");

    const nextStatus: FeeStatus = nextPaid >= amount ? "paid" : "partial";
    const nowISO = new Date().toISOString();

    await mutate({
      action: "update",
      path: `feeIssued/${input.feeId}`,
      data: {
        paidAmount: nextPaid,
        status: nextStatus,
        paidDate: paidOn,
        paymentMethod: input.paymentMethod,
        transactionId: input.transactionId || "",
        remarks: input.remarks || "",
        paymentScreenshot: input.paymentScreenshot || "",
        paymentScreenshotFileKey: input.paymentScreenshotFileKey || "",
        pendingVerificationAt: null,
        pendingVerificationBy: null,
        pendingVerificationPaymentId: null,
        updatedAt: nowISO,
      },
      actionBy: "admin",
    });

    const existingPaymentRaw = await mutate({
      action: "get",
      path: `feePayments/${input.feeId}`,
    });
    const existingPayment = existingPaymentRaw as Omit<FeePayment, "id"> | null;
    const receiptNumber =
      existingPayment?.receiptNumber || buildReceiptNumber(input.feeId);

    const paymentData: Omit<FeePayment, "id"> = {
      feeId: input.feeId,
      studentId: fee.studentId,
      studentName: fee.studentName,
      feeTitle: fee.title,
      feeCategory: fee.category,
      totalFeeAmount: amount,
      amountPaid: amountPaidNow,
      pendingAfterPayment: Math.max(0, amount - nextPaid),
      paymentDate: paidOn,
      paymentMethod: input.paymentMethod,
      transactionId: input.transactionId || existingPayment?.transactionId || "",
      remarks: input.remarks || existingPayment?.remarks || "",
      paymentScreenshot:
        input.paymentScreenshot || existingPayment?.paymentScreenshot || "",
      paymentScreenshotFileKey:
        input.paymentScreenshotFileKey ||
        existingPayment?.paymentScreenshotFileKey ||
        "",
      receiptNumber,
      paidBy: existingPayment?.paidBy || input.paidBy || "admin",
      approvalStatus: "approved",
      approvalUpdatedAt: nowISO,
      approvedAt: nowISO,
      approvedBy: input.paidBy === "admin" ? "admin" : "staff",
      createdAt: existingPayment?.createdAt || nowISO,
      updatedAt: nowISO,
    };

    await mutate({
      action: "update",
      path: `feePayments/${input.feeId}`,
      data: paymentData,
      actionBy: "admin",
    });

    await financialService.createTransaction({
      type: "income",
      category: mapFeeCategoryToIncomeCategory(String(fee.category)),
      amount: amountPaidNow,
      date: paidOn.slice(0, 10),
      notes: `Fee payment (${receiptNumber}) - ${fee.studentName} - ${fee.title}`,
    });

    return { ...paymentData, id: input.feeId };
  },

  async submitFeePaymentForVerification(
    input: SubmitFeeVerificationInput,
  ): Promise<FeePayment> {
    const feeRaw = await mutate({
      action: "get",
      path: `feeIssued/${input.feeId}`,
    });
    if (!feeRaw) throw new Error("Issued fee record not found");
    const fee = { ...(feeRaw as Omit<FeeRecord, "id">), id: input.feeId } as FeeRecord;

    const amount = Number(fee.amount) || 0;
    const paid = Number(fee.paidAmount) || 0;
    const pending = Math.max(0, amount - paid);
    const nowISO = new Date().toISOString();

    if (pending <= 0) throw new Error("Fee already settled");
    if ((Number(input.amountPaid) || 0) > pending) {
      throw new Error("Payment exceeds pending amount");
    }

    await mutate({
      action: "update",
      path: `feeIssued/${input.feeId}`,
      data: {
        status: "pending_verification",
        pendingVerificationAt: nowISO,
        pendingVerificationBy: input.paidBy,
        pendingVerificationPaymentId: input.feeId,
        transactionId: input.transactionId,
        remarks: input.remarks || "",
        paymentScreenshot: input.paymentScreenshot || "",
        paymentScreenshotFileKey: input.paymentScreenshotFileKey || "",
        updatedAt: nowISO,
      },
      actionBy: input.paidBy,
    });

    const existingPaymentRaw = await mutate({
      action: "get",
      path: `feePayments/${input.feeId}`,
    });
    const existingPayment = existingPaymentRaw as Omit<FeePayment, "id"> | null;

    const paymentData: Omit<FeePayment, "id"> = {
      feeId: input.feeId,
      studentId: fee.studentId,
      studentName: fee.studentName,
      feeTitle: fee.title,
      feeCategory: fee.category,
      totalFeeAmount: amount,
      amountPaid: Number(input.amountPaid) || pending,
      pendingAfterPayment: Math.max(0, pending - (Number(input.amountPaid) || pending)),
      paymentDate: nowISO,
      paymentMethod: "online",
      transactionId: input.transactionId,
      remarks: input.remarks || "",
      paymentScreenshot: input.paymentScreenshot || "",
      paymentScreenshotFileKey: input.paymentScreenshotFileKey || "",
      receiptNumber: existingPayment?.receiptNumber || "",
      paidBy: input.paidBy,
      approvalStatus: "pending_verification",
      approvalUpdatedAt: nowISO,
      createdAt: existingPayment?.createdAt || nowISO,
      updatedAt: nowISO,
    };

    await mutate({
      action: "update",
      path: `feePayments/${input.feeId}`,
      data: paymentData,
      actionBy: input.paidBy,
    });

    return { ...paymentData, id: input.feeId };
  },

  async createFeeConfig(
    data: Omit<FeeConfiguration, "id" | "createdAt" | "updatedAt">,
  ) {
    const nowISO = new Date().toISOString();
    return mutate({
      action: "createWithId",
      path: "feeConfigurations",
      data: { ...data, createdAt: nowISO, updatedAt: nowISO },
      actionBy: "admin",
    });
  },

  async updateFeeConfig(id: string, data: Partial<FeeConfiguration>) {
    return mutate({
      action: "update",
      path: `feeConfigurations/${id}`,
      data: { ...data, updatedAt: new Date().toISOString() },
      actionBy: "admin",
    });
  },

  async deleteFeeConfig(id: string) {
    return mutate({
      action: "delete",
      path: `feeConfigurations/${id}`,
      actionBy: "admin",
    });
  },

  async getAllConfigs(): Promise<FeeConfiguration[]> {
    const data = await mutate({
      action: "get",
      path: "feeConfigurations",
    });
    return getArrFromObj(data || {}) as unknown as FeeConfiguration[];
  },

  async getFeesByStudent(studentId: string): Promise<FeeRecord[]> {
    const data = await mutate({
      action: "get",
      path: "feeIssued",
    });
    const all = (getArrFromObj(data || {}) as unknown) as FeeRecord[];
    return all.filter((fee) => fee.studentId === studentId);
  },

  async issueFeesForConfig(configId: string, issueDate = new Date()) {
    const [configs, studentsData, issuedRaw] = await Promise.all([
      this.getAllConfigs(),
      mutate({ action: "get", path: "students" }),
      mutate({ action: "get", path: "feeIssued" }),
    ]);
    const config = configs.find((c) => c.id === configId);
    if (!config) throw new Error("Fee config not found");
    if (config.isOptional) throw new Error("Optional fees are set per student");

    const students = getArrFromObj(studentsData || {}) as any[];
    const issued = (getArrFromObj(issuedRaw || {}) as unknown) as FeeRecord[];
    const periodKey = getIssuePeriodKey(config.cycle, issueDate);
    const dueDate = format(endOfMonth(issueDate), "yyyy-MM-dd");
    const nowISO = new Date().toISOString();

    const activeStudents = students.filter((s) => s.status === "active");
    const toIssue: Array<{ id: string; data: Omit<FeeRecord, "id"> }> = [];

    for (const student of activeStudents) {
      const classId = student.currentClass || "unassigned";
      const amount = Number(config.classFees?.[classId] || 0);
      if (amount <= 0) continue;

      const recordId = `${slug(config.id)}_${slug(student.id)}_${slug(periodKey)}`;
      const alreadyIssued = issued.some((f) => f.id === recordId);
      if (alreadyIssued) continue;

      toIssue.push({
        id: recordId,
        data: {
          studentId: student.id,
          studentName: student.fullName,
          classId,
          feeConfigId: config.id,
          issuePeriodKey: periodKey,
          title: `${format(issueDate, "MMMM")} ${config.name}`,
          category: config.name.toLowerCase() as FeeCategory,
          amount,
          paidAmount: 0,
          discountAmount: 0,
          fineAmount: 0,
          dueDate,
          status: "pending",
          createdAt: nowISO,
          updatedAt: nowISO,
        },
      });
    }

    await Promise.all(
      toIssue.map((item) =>
        mutate({
          action: "update",
          path: `feeIssued/${item.id}`,
          data: item.data,
          actionBy: "admin",
        }),
      ),
    );

    return { created: toIssue.length, periodKey };
  },

  async getIssuedStatusForConfig(configId: string, issueDate = new Date()) {
    const issuedRaw = await mutate({
      action: "get",
      path: "feeIssued",
    });
    const issued = (getArrFromObj(issuedRaw || {}) as unknown) as FeeRecord[];
    const periodKey = getIssuePeriodKey(
      ((await this.getAllConfigs()).find((c) => c.id === configId)?.cycle ||
        "monthly") as FeeConfiguration["cycle"],
      issueDate,
    );
    const alreadyIssued = issued.some(
      (item) => item.feeConfigId === configId && item.issuePeriodKey === periodKey,
    );
    return { alreadyIssued, periodKey };
  },

  async syncFeesForMonth(month: Date, academicYear: string) {
    // Kept for compatibility; new flow issues fees from fee structure action.
    const configs = await this.getAllConfigs();
    const mandatory = configs.filter(
      (cfg) => !cfg.isOptional && cfg.academicYear === academicYear,
    );
    let created = 0;
    for (const cfg of mandatory) {
      const result = await this.issueFeesForConfig(cfg.id, month);
      created += result.created;
    }
    return created;
  },
};
