import { FeeCategory, FeeConfiguration, FeeRecord, FeeStatus } from "@/lib/types/fee.type";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import type { Student } from "@/lib/types/student.type";
import {
  getAcademicYearForDate,
  getAcademicYearRange,
  getStudentFeeAnchorDate,
  getTuitionStartAfterReadmission,
} from "@/lib/utils/fee-dues";
import { getArrFromObj } from "@ashirbad/js-core";
import { mutate } from "@atechhub/firebase";
import { addMonths, endOfMonth, format, startOfMonth } from "date-fns";
import { financialService } from "./financial.service";
import {
  configMatchesSelectableKind,
  findSelectableFeeConfig,
  isAcademicYearFeeConfig,
  isSelectableFeeIncluded,
  isTuitionFeeConfig,
  shouldSkipTuitionPeriodForReadmission,
  studentHasReadmissionIncluded,
} from "@/lib/utils/student-selectable-fees";

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

function buildReceiptNumber(feeId: string, receiptDate?: string | Date) {
  let datePart: string;
  if (receiptDate instanceof Date) {
    datePart = Number.isNaN(receiptDate.getTime())
      ? format(new Date(), "yyyyMMdd")
      : format(receiptDate, "yyyyMMdd");
  } else if (typeof receiptDate === "string" && receiptDate.trim()) {
    const ymd = receiptDate.trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      datePart = ymd.replace(/-/g, "");
    } else {
      const parsed = new Date(receiptDate);
      datePart = Number.isNaN(parsed.getTime())
        ? format(new Date(), "yyyyMMdd")
        : format(parsed, "yyyyMMdd");
    }
  } else {
    datePart = format(new Date(), "yyyyMMdd");
  }
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

function getCycleStepMonths(cycle: FeeConfiguration["cycle"]) {
  if (cycle === "monthly") return 1;
  if (cycle === "quarterly") return 3;
  if (cycle === "annually") return 12;
  return 0;
}

/** Period dates from academic-year start through `throughDate` for a fee cycle. */
function listIssuePeriodDates(
  cycle: FeeConfiguration["cycle"],
  throughDate: Date,
  options?: { academicYearFee?: boolean },
): Date[] {
  const academicYear = getAcademicYearForDate(throughDate);
  const { start: ayStart } = getAcademicYearRange(academicYear);
  const end = startOfMonth(throughDate);

  // Once-per-AY fees (admission, readmission, uniform, books) → April only.
  if (options?.academicYearFee || cycle === "one-time") {
    return [startOfMonth(ayStart)];
  }

  const step = getCycleStepMonths(cycle);
  if (!step) return [];

  // Annual cycle: one bill at AY start (April).
  if (cycle === "annually") {
    return startOfMonth(ayStart) <= end ? [startOfMonth(ayStart)] : [];
  }

  const periods: Date[] = [];
  let cursor = startOfMonth(ayStart);
  while (cursor <= end) {
    periods.push(new Date(cursor));
    cursor = addMonths(cursor, step);
  }
  return periods;
}

function buildFeeIssueRecord(params: {
  config: FeeConfiguration;
  student: Student | Record<string, any>;
  issueDate: Date;
  nowISO: string;
}): { id: string; data: Omit<FeeRecord, "id"> } | null {
  const { config, student, issueDate, nowISO } = params;
  const excluded: string[] = student.excludedFeeConfigIds || [];
  if (excluded.includes(config.id)) return null;

  const classId = student.currentClass || "unassigned";
  // Per-student override (e.g. uniform 1250) wins over structure class fee.
  const overrideAmount =
    student.optionalFeeAmounts?.[config.id] != null
      ? Number(student.optionalFeeAmounts[config.id]) || 0
      : null;
  const amount =
    overrideAmount != null
      ? overrideAmount
      : Number(config.classFees?.[classId] || 0);
  if (amount <= 0) return null;

  const isReadmission = configMatchesSelectableKind(config, "readmission");
  const isAdmission = configMatchesSelectableKind(config, "admission");
  const isAyFee = isAcademicYearFeeConfig(config);
  const ayForIssue = getAcademicYearForDate(issueDate);
  const { start: ayStart } = getAcademicYearRange(ayForIssue);
  const ayLabel = ayForIssue; // e.g. 2026-2027

  // AY fees always dated April of the session (stable id + display).
  const displayDate = isAyFee ? startOfMonth(ayStart) : issueDate;
  const periodKey = isAyFee
    ? `${ayForIssue.split("-")[0]}-ay`
    : getIssuePeriodKey(config.cycle, issueDate);
  const recordId = `${slug(config.id)}_${slug(student.id)}_${slug(periodKey)}`;
  const dueDate = format(endOfMonth(displayDate), "yyyy-MM-dd");

  let title: string;
  if (isAyFee) {
    if (isReadmission) {
      title = `${ayLabel} ${config.name} (includes April tuition)`;
    } else {
      title = `${ayLabel} ${config.name}`;
    }
  } else if (config.cycle === "annually") {
    title = `${ayLabel} ${config.name}`;
  } else if (config.cycle === "quarterly") {
    title = `Q${Math.floor(issueDate.getMonth() / 3) + 1} ${format(issueDate, "yyyy")} ${config.name}`;
  } else if (config.cycle === "one-time") {
    title = config.name;
  } else {
    title = `${format(issueDate, "MMMM")} ${config.name}`;
  }

  return {
    id: recordId,
    data: {
      studentId: student.id,
      studentName: student.fullName || "",
      classId,
      feeConfigId: config.id,
      issuePeriodKey: periodKey,
      title,
      category: config.name.toLowerCase() as FeeCategory,
      amount,
      paidAmount: 0,
      discountAmount: 0,
      fineAmount: 0,
      dueDate,
      status: "pending",
      remarks: isReadmission
        ? "Includes April month tuition. Monthly tuition applies from May onward."
        : isAyFee
          ? `Academic year ${ayLabel} fee (billed once in April).`
          : undefined,
      createdAt: nowISO,
      updatedAt: nowISO,
    },
  };
}

function studentEligibleForPeriod(
  student: Student | Record<string, any>,
  issueDate: Date,
  config: FeeConfiguration,
  allConfigs: FeeConfiguration[],
): boolean {
  if (student.status && student.status !== "active") return false;

  // Once-per-AY fees: not gated by late createdAt.
  if (isAcademicYearFeeConfig(config)) {
    if (configMatchesSelectableKind(config, "readmission")) {
      return isSelectableFeeIncluded(student as Student, config);
    }
    if ((student.excludedFeeConfigIds || []).includes(config.id)) return false;
    if (config.isOptional) {
      return isSelectableFeeIncluded(student as Student, config);
    }
    return true;
  }

  const academicYear = getAcademicYearForDate(issueDate);
  const hasReadmission = studentHasReadmissionIncluded(
    student as Student,
    allConfigs,
  );

  // Continuing students with re-admission: tuition from May of this AY.
  if (
    hasReadmission &&
    config.cycle === "monthly" &&
    isTuitionFeeConfig(config)
  ) {
    const tuitionStart = getTuitionStartAfterReadmission(academicYear);
    return startOfMonth(issueDate) >= startOfMonth(tuitionStart);
  }

  const anchor = getStudentFeeAnchorDate(student as Student);
  return startOfMonth(anchor) <= startOfMonth(issueDate);
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
      existingPayment?.receiptNumber ||
      buildReceiptNumber(input.feeId, paidOn);

    const studentRaw = await mutate({
      action: "get",
      path: `students/${fee.studentId}`,
    });
    const student = studentRaw as Student | null;
    const paymentDateObj = new Date(paidOn);
    const session = getAcademicYearForDate(
      Number.isNaN(paymentDateObj.getTime()) ? new Date() : paymentDateObj,
    );

    const paymentData: Omit<FeePayment, "id"> = {
      feeId: input.feeId,
      studentId: fee.studentId,
      studentName: fee.studentName || student?.fullName || "",
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
      studentClass: student?.currentClass || fee.classId || "",
      rollNumber: student?.rollNumber || "",
      session,
      abacusDrawing: existingPayment?.abacusDrawing || "",
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
    return this.issueFeesForConfigPeriods(configId, [issueDate]);
  },

  /**
   * Issue missing fee records for every period from academic-year start
   * through `throughDate`, for students whose admission/anchor is on or
   * before each period.
   */
  async issueFeesForConfigThroughDate(
    configId: string,
    throughDate = new Date(),
  ) {
    const configs = await this.getAllConfigs();
    const config = configs.find((c) => c.id === configId);
    if (!config) throw new Error("Fee config not found");

    const periods = listIssuePeriodDates(config.cycle, throughDate, {
      academicYearFee: isAcademicYearFeeConfig(config),
    });
    return this.issueFeesForConfigPeriods(configId, periods);
  },

  async issueFeesForConfigPeriods(configId: string, periodDates: Date[]) {
    const [configs, studentsData, issuedRaw] = await Promise.all([
      this.getAllConfigs(),
      mutate({ action: "get", path: "students" }),
      mutate({ action: "get", path: "feeIssued" }),
    ]);
    const config = configs.find((c) => c.id === configId);
    if (!config) throw new Error("Fee config not found");

    // AY fees must only ever have one April bill — ignore monthly period lists.
    const effectivePeriods = isAcademicYearFeeConfig(config)
      ? listIssuePeriodDates(config.cycle, periodDates[0] || new Date(), {
          academicYearFee: true,
        })
      : periodDates;

    const students = getArrFromObj(studentsData || {}) as any[];
    const allIssued = (getArrFromObj(issuedRaw || {}) as unknown) as FeeRecord[];
    const issuedIds = new Set(allIssued.map((f) => f.id));
    const nowISO = new Date().toISOString();
    const toIssue: Array<{ id: string; data: Omit<FeeRecord, "id"> }> = [];
    const toUpdateAmount: Array<{
      id: string;
      amount: number;
      title: string;
      remarks?: string;
    }> = [];
    const toDeleteIds: string[] = [];
    const seen = new Set<string>();
    const issuedById = new Map(allIssued.map((f) => [f.id, f]));

    for (const issueDate of effectivePeriods) {
      for (const student of students) {
        if (!studentEligibleForPeriod(student, issueDate, config, configs)) {
          continue;
        }
        // Optional fees are only issued when explicitly assigned to the student.
        if (config.isOptional) {
          const ids: string[] = student.optionalFeeIds || [];
          const amounts = student.optionalFeeAmounts || {};
          if (!ids.includes(config.id) && amounts[config.id] == null) {
            continue;
          }
        }
        // Re-admission includes April tuition — do not also bill April tuition.
        if (
          shouldSkipTuitionPeriodForReadmission({
            student,
            config,
            issueDate,
            configs,
          })
        ) {
          const periodKey = getIssuePeriodKey(config.cycle, issueDate);
          const recordId = `${slug(config.id)}_${slug(student.id)}_${slug(periodKey)}`;
          const existing = issuedById.get(recordId);
          const paid = Number(existing?.paidAmount) || 0;
          if (
            existing &&
            paid <= 0 &&
            existing.status !== "paid" &&
            existing.status !== "partial"
          ) {
            toDeleteIds.push(recordId);
            issuedIds.delete(recordId);
          }
          continue;
        }
        const built = buildFeeIssueRecord({
          config,
          student,
          issueDate,
          nowISO,
        });
        if (!built) continue;

        // Drop unpaid duplicates for the same student + config (e.g. old
        // "June Readmission" after canonical "2026-2027 Readmission").
        if (isAcademicYearFeeConfig(config)) {
          for (const fee of allIssued) {
            if (fee.studentId !== student.id) continue;
            if (fee.feeConfigId !== config.id) continue;
            if (fee.id === built.id) continue;
            const paid = Number(fee.paidAmount) || 0;
            if (paid > 0 || fee.status === "paid" || fee.status === "partial") {
              continue;
            }
            if (!toDeleteIds.includes(fee.id)) {
              toDeleteIds.push(fee.id);
              issuedIds.delete(fee.id);
            }
          }
        }

        if (issuedIds.has(built.id) || seen.has(built.id)) {
          // Keep unpaid bills in sync when per-student / structure amount changes
          // (e.g. uniform 600 → 1250) without creating duplicates.
          const existing = issuedById.get(built.id);
          if (existing) {
            const paid = Number(existing.paidAmount) || 0;
            const isSettled =
              paid > 0 ||
              existing.status === "paid" ||
              existing.status === "partial";
            if (
              !isSettled &&
              Number(existing.amount) !== Number(built.data.amount)
            ) {
              toUpdateAmount.push({
                id: built.id,
                amount: built.data.amount,
                title: built.data.title,
                remarks: built.data.remarks,
              });
            }
          }
          continue;
        }
        seen.add(built.id);
        toIssue.push(built);
      }
    }

    await Promise.all([
      ...toDeleteIds.map((id) =>
        mutate({
          action: "delete",
          path: `feeIssued/${id}`,
          actionBy: "admin",
        }),
      ),
      ...toIssue.map((item) =>
        mutate({
          action: "update",
          path: `feeIssued/${item.id}`,
          data: item.data,
          actionBy: "admin",
        }),
      ),
      ...toUpdateAmount.map((item) =>
        mutate({
          action: "update",
          path: `feeIssued/${item.id}`,
          data: {
            amount: item.amount,
            title: item.title,
            remarks: item.remarks,
            updatedAt: nowISO,
          },
          actionBy: "admin",
        }),
      ),
    ]);

    return {
      created: toIssue.length,
      updated: toUpdateAmount.length,
      deleted: toDeleteIds.length,
      skipped: seen.size - toIssue.length,
      periods: effectivePeriods.length,
    };
  },

  async deleteUnpaidFeeRecordsForConfig(studentId: string, feeConfigId: string) {
    const issued = await this.getFeesByStudent(studentId);
    const removable = issued.filter((fee) => {
      if (fee.feeConfigId !== feeConfigId) return false;
      const paid = Number(fee.paidAmount) || 0;
      return paid <= 0 && fee.status !== "paid" && fee.status !== "partial";
    });

    await Promise.all(
      removable.map((fee) =>
        mutate({
          action: "delete",
          path: `feeIssued/${fee.id}`,
          actionBy: "admin",
        }),
      ),
    );

    return { deleted: removable.length };
  },

  /** Remove unpaid April tuition bills (covered by re-admission). */
  async deleteUnpaidAprilTuitionForStudent(
    studentId: string,
    configs: FeeConfiguration[],
    asOf = new Date(),
  ) {
    const academicYear = getAcademicYearForDate(asOf);
    const { start: ayStart } = getAcademicYearRange(academicYear);
    const aprilKey = getIssuePeriodKey("monthly", ayStart);
    const tuitionConfigs = configs.filter(isTuitionFeeConfig);
    if (tuitionConfigs.length === 0) return { deleted: 0 };

    const tuitionIds = new Set(tuitionConfigs.map((c) => c.id));
    const issued = await this.getFeesByStudent(studentId);
    const removable = issued.filter((fee) => {
      if (!fee.feeConfigId || !tuitionIds.has(fee.feeConfigId)) return false;
      const paid = Number(fee.paidAmount) || 0;
      if (paid > 0 || fee.status === "paid" || fee.status === "partial") {
        return false;
      }
      if (fee.issuePeriodKey === aprilKey) return true;
      // Fallback: due date in April of AY start year
      if (fee.dueDate) {
        const due = new Date(fee.dueDate);
        return (
          due.getFullYear() === ayStart.getFullYear() && due.getMonth() === 3
        );
      }
      return false;
    });

    await Promise.all(
      removable.map((fee) =>
        mutate({
          action: "delete",
          path: `feeIssued/${fee.id}`,
          actionBy: "admin",
        }),
      ),
    );

    return { deleted: removable.length };
  },

  /**
   * Include/exclude admission, uniform, transport (and similar) fee configs
   * for one student, then reconcile issued bills so admin/accounts/student
   * views stay in sync.
   */
  async applyStudentSelectableFees(params: {
    studentId: string;
    /** feeConfigId -> included */
    inclusions: Record<string, boolean>;
    /** Optional overrides when including optional fees */
    amounts?: Record<string, number>;
  }) {
    const { studentId, inclusions, amounts = {} } = params;
    const [studentRaw, configs] = await Promise.all([
      mutate({ action: "get", path: `students/${studentId}` }),
      this.getAllConfigs(),
    ]);
    if (!studentRaw) throw new Error("Student not found");

    const student = {
      ...(studentRaw as Student),
      id: studentId,
    } as Student;

    const excluded = new Set(student.excludedFeeConfigIds || []);
    const optionalIds = new Set(student.optionalFeeIds || []);
    const optionalAmounts: Record<string, number> = {
      ...(student.optionalFeeAmounts || {}),
    };

    const configById = new Map(configs.map((c) => [c.id, c]));

    // Admission and re-admission are mutually exclusive.
    const admissionCfg = findSelectableFeeConfig(configs, "admission");
    const readmissionCfg = findSelectableFeeConfig(configs, "readmission");
    const normalizedInclusions = { ...inclusions };
    if (admissionCfg && readmissionCfg) {
      const wantAdmission = normalizedInclusions[admissionCfg.id] === true;
      const wantReadmission = normalizedInclusions[readmissionCfg.id] === true;
      if (wantAdmission && wantReadmission) {
        // Prefer whichever was already included; default to admission.
        const alreadyReadmission = isSelectableFeeIncluded(
          student,
          readmissionCfg,
        );
        const alreadyAdmission = isSelectableFeeIncluded(
          student,
          admissionCfg,
        );
        if (alreadyReadmission && !alreadyAdmission) {
          normalizedInclusions[admissionCfg.id] = false;
        } else {
          normalizedInclusions[readmissionCfg.id] = false;
        }
      }
    }

    const toInclude: string[] = [];
    const toExclude: string[] = [];

    for (const [configId, include] of Object.entries(normalizedInclusions)) {
      const config = configById.get(configId);
      if (!config) continue;

      if (include) {
        excluded.delete(configId);
        toInclude.push(configId);
        if (config.isOptional) {
          optionalIds.add(configId);
        }
        // Persist per-student amount for selectable fees (uniform etc.) even
        // when the structure fee is not marked optional — otherwise the dialog
        // amount never sticks and unpaid bills keep the old class fee.
        const classAmount = Number(
          config.classFees?.[student.currentClass || "unassigned"] || 0,
        );
        const nextAmount =
          amounts[configId] != null
            ? Number(amounts[configId]) || 0
            : optionalAmounts[configId] != null
              ? Number(optionalAmounts[configId]) || 0
              : classAmount;
        if (amounts[configId] != null || config.isOptional) {
          optionalAmounts[configId] = nextAmount;
        }

        // Including admission/readmission also excludes the opposite config
        // even if it wasn't in the payload.
        if (configMatchesSelectableKind(config, "admission") && readmissionCfg) {
          if (!toExclude.includes(readmissionCfg.id)) {
            excluded.add(readmissionCfg.id);
            optionalIds.delete(readmissionCfg.id);
            delete optionalAmounts[readmissionCfg.id];
            toExclude.push(readmissionCfg.id);
          }
        }
        if (
          configMatchesSelectableKind(config, "readmission") &&
          admissionCfg
        ) {
          if (!toExclude.includes(admissionCfg.id)) {
            excluded.add(admissionCfg.id);
            optionalIds.delete(admissionCfg.id);
            delete optionalAmounts[admissionCfg.id];
            toExclude.push(admissionCfg.id);
          }
        }
      } else {
        excluded.add(configId);
        optionalIds.delete(configId);
        delete optionalAmounts[configId];
        toExclude.push(configId);
      }
    }

    await mutate({
      action: "update",
      path: `students/${studentId}`,
      data: {
        excludedFeeConfigIds: [...excluded],
        optionalFeeIds: [...optionalIds],
        optionalFeeAmounts: optionalAmounts,
        updatedAt: new Date().toISOString(),
      },
      actionBy: "admin",
    });

    const excludeIds = [...new Set(toExclude)];
    const includeIds = [...new Set(toInclude)].filter(
      (id) => !excludeIds.includes(id),
    );

    let removed = 0;
    for (const configId of excludeIds) {
      const del = await this.deleteUnpaidFeeRecordsForConfig(
        studentId,
        configId,
      );
      removed += del.deleted;
    }

    // Re-admission includes April tuition — drop unpaid April tuition bills.
    const includedReadmission = includeIds.some((id) => {
      const cfg = configById.get(id);
      return cfg ? configMatchesSelectableKind(cfg, "readmission") : false;
    });
    if (includedReadmission) {
      const aprilDel = await this.deleteUnpaidAprilTuitionForStudent(
        studentId,
        configs,
      );
      removed += aprilDel.deleted;
    }

    let issued = 0;
    let updated = 0;
    for (const configId of includeIds) {
      const result = await this.issueFeesForConfigThroughDate(
        configId,
        new Date(),
      );
      issued += result.created;
      updated += result.updated || 0;
    }

    // After re-admission, ensure May+ tuition exists (April skipped by issue gate).
    if (includedReadmission) {
      for (const tuitionCfg of configs.filter(isTuitionFeeConfig)) {
        if (tuitionCfg.isOptional) continue;
        const result = await this.issueFeesForConfigThroughDate(
          tuitionCfg.id,
          new Date(),
        );
        issued += result.created;
        updated += result.updated || 0;
      }
    }

    return { issued, updated, removed };
  },

  /** Catch up all mandatory fees for the current academic year through today. */
  async catchUpAllMandatoryFees(throughDate = new Date()) {
    const academicYear = getAcademicYearForDate(throughDate);
    const configs = await this.getAllConfigs();
    const mandatory = configs.filter(
      (cfg) =>
        !cfg.isOptional &&
        (!cfg.academicYear || cfg.academicYear === academicYear),
    );

    let created = 0;
    for (const cfg of mandatory) {
      const result = await this.issueFeesForConfigThroughDate(
        cfg.id,
        throughDate,
      );
      created += result.created;
    }
    return { created, configs: mandatory.length };
  },

  /**
   * Catch up matching mandatory configs (by id list) through today.
   * Used before cash-book fee reference so missing months exist.
   */
  async catchUpConfigsThroughDate(
    configIds: string[],
    throughDate = new Date(),
  ) {
    let created = 0;
    const unique = [...new Set(configIds.filter(Boolean))];
    for (const id of unique) {
      try {
        const result = await this.issueFeesForConfigThroughDate(id, throughDate);
        created += result.created;
      } catch (error) {
        console.error(`Catch-up failed for config ${id}`, error);
      }
    }
    return { created };
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

  /**
   * Delete all fee payment history, wipe issued bills, then re-apply fees for
   * every active student. New admissions this AY get Admission (+ tuition from
   * admission month); continuing students get Re-admission (+ tuition from May).
   * Uniform / books / other mandatory fees are issued for everyone — exclude
   * per student afterwards if needed.
   */
  async resetPaymentsAndReissueAllFees(throughDate = new Date()) {
    const [paymentsRaw, financialRaw, issuedRaw, studentsData, configs] =
      await Promise.all([
        mutate({ action: "get", path: "feePayments" }),
        mutate({ action: "get", path: "financialTransactions" }),
        mutate({ action: "get", path: "feeIssued" }),
        mutate({ action: "get", path: "students" }),
        this.getAllConfigs(),
      ]);

    const paymentIds = Object.keys(paymentsRaw || {});
    const financialIds = Object.keys(financialRaw || {});
    const issuedIds = Object.keys(issuedRaw || {});
    const students = getArrFromObj(studentsData || {}) as unknown as Student[];

    const deleteOps: Promise<unknown>[] = [];
    for (const id of paymentIds) {
      deleteOps.push(
        mutate({
          action: "delete",
          path: `feePayments/${id}`,
          actionBy: "admin",
        }),
      );
    }
    for (const id of financialIds) {
      deleteOps.push(
        mutate({
          action: "delete",
          path: `financialTransactions/${id}`,
          actionBy: "admin",
        }),
      );
    }
    for (const id of issuedIds) {
      deleteOps.push(
        mutate({
          action: "delete",
          path: `feeIssued/${id}`,
          actionBy: "admin",
        }),
      );
    }

    const chunkSize = 40;
    for (let i = 0; i < deleteOps.length; i += chunkSize) {
      await Promise.all(deleteOps.slice(i, i + chunkSize));
    }

    const academicYear = getAcademicYearForDate(throughDate);
    const { start: ayStart } = getAcademicYearRange(academicYear);
    const admissionCfg = findSelectableFeeConfig(configs, "admission", throughDate);
    const readmissionCfg = findSelectableFeeConfig(
      configs,
      "readmission",
      throughDate,
    );
    const uniformCfg = findSelectableFeeConfig(configs, "uniform", throughDate);
    const transportCfg = findSelectableFeeConfig(
      configs,
      "transport",
      throughDate,
    );

    const ayFeeConfigs = configs.filter(isAcademicYearFeeConfig);
    const nowISO = new Date().toISOString();
    let newAdmissions = 0;
    let continuing = 0;

    for (const student of students) {
      if (!student?.id) continue;
      if (student.status && student.status !== "active") continue;

      const admissionDate = student.admissionDate
        ? new Date(student.admissionDate)
        : null;
      const isNewThisAy = Boolean(
        admissionDate &&
          !Number.isNaN(admissionDate.getTime()) &&
          admissionDate >= ayStart,
      );

      if (isNewThisAy) newAdmissions += 1;
      else continuing += 1;

      const excluded = new Set<string>();
      if (isNewThisAy) {
        if (readmissionCfg) excluded.add(readmissionCfg.id);
      } else {
        if (admissionCfg) excluded.add(admissionCfg.id);
      }

      const optionalIds = new Set(student.optionalFeeIds || []);
      const optionalAmounts: Record<string, number> = {
        ...(student.optionalFeeAmounts || {}),
      };

      // Auto-assign optional AY / selectable fees so they get issued; admin can exclude later.
      for (const cfg of [uniformCfg, transportCfg, ...ayFeeConfigs]) {
        if (!cfg || !cfg.isOptional) continue;
        if (excluded.has(cfg.id)) continue;
        if (isNewThisAy && configMatchesSelectableKind(cfg, "readmission")) {
          continue;
        }
        if (!isNewThisAy && configMatchesSelectableKind(cfg, "admission")) {
          continue;
        }
        optionalIds.add(cfg.id);
        if (optionalAmounts[cfg.id] == null) {
          const classKey = student.currentClass || "unassigned";
          optionalAmounts[cfg.id] =
            Number(cfg.classFees?.[classKey] || 0) || 0;
        }
      }

      await mutate({
        action: "update",
        path: `students/${student.id}`,
        data: {
          excludedFeeConfigIds: [...excluded],
          optionalFeeIds: [...optionalIds],
          optionalFeeAmounts: optionalAmounts,
          updatedAt: nowISO,
        },
        actionBy: "admin",
      });
    }

    // Issue mandatory (tuition etc.) then once-per-AY fees.
    const catchUp = await this.catchUpAllMandatoryFees(throughDate);
    let ayIssued = 0;
    for (const cfg of ayFeeConfigs) {
      try {
        const result = await this.issueFeesForConfigThroughDate(
          cfg.id,
          throughDate,
        );
        ayIssued += result.created;
      } catch (error) {
        console.error(`Reissue failed for ${cfg.name}`, error);
      }
    }

    // Also catch any remaining mandatory configs that are AY-named but monthly tuition already covered
    return {
      feePaymentsDeleted: paymentIds.length,
      financialDeleted: financialIds.length,
      feeIssuedDeleted: issuedIds.length,
      tuitionIssued: catchUp.created,
      ayFeesIssued: ayIssued,
      studentsUpdated: newAdmissions + continuing,
      newAdmissions,
      continuing,
    };
  },

  /**
   * Wipe fee receipts, legacy financial ledger, and cash-book entries, and
   * reset issued fees back to unpaid so a clean collection cycle can start.
   */
  async clearAllReceiptsAndLedgers() {
    const [paymentsRaw, financialRaw, cashEntriesRaw, cashDaysRaw, issuedRaw] =
      await Promise.all([
        mutate({ action: "get", path: "feePayments" }),
        mutate({ action: "get", path: "financialTransactions" }),
        mutate({ action: "get", path: "cashBookEntries" }),
        mutate({ action: "get", path: "cashBookDays" }),
        mutate({ action: "get", path: "feeIssued" }),
      ]);

    const paymentIds = Object.keys(paymentsRaw || {});
    const financialIds = Object.keys(financialRaw || {});
    const cashEntryIds = Object.keys(cashEntriesRaw || {});
    const cashDayIds = Object.keys(cashDaysRaw || {});
    const issued = (getArrFromObj(issuedRaw || {}) as unknown) as FeeRecord[];

    const ops: Promise<unknown>[] = [];

    for (const id of paymentIds) {
      ops.push(
        mutate({
          action: "delete",
          path: `feePayments/${id}`,
          actionBy: "admin",
        }),
      );
    }
    for (const id of financialIds) {
      ops.push(
        mutate({
          action: "delete",
          path: `financialTransactions/${id}`,
          actionBy: "admin",
        }),
      );
    }
    for (const id of cashEntryIds) {
      ops.push(
        mutate({
          action: "delete",
          path: `cashBookEntries/${id}`,
          actionBy: "admin",
        }),
      );
    }
    for (const id of cashDayIds) {
      ops.push(
        mutate({
          action: "delete",
          path: `cashBookDays/${id}`,
          actionBy: "admin",
        }),
      );
    }

    const nowISO = new Date().toISOString();
    for (const fee of issued) {
      const paid = Number(fee.paidAmount) || 0;
      if (
        paid <= 0 &&
        fee.status !== "paid" &&
        fee.status !== "partial" &&
        fee.status !== "pending_verification"
      ) {
        continue;
      }
      ops.push(
        mutate({
          action: "update",
          path: `feeIssued/${fee.id}`,
          data: {
            paidAmount: 0,
            status: "pending",
            paidDate: null,
            paymentMethod: null,
            transactionId: null,
            paymentScreenshot: null,
            paymentScreenshotFileKey: null,
            pendingVerificationAt: null,
            pendingVerificationBy: null,
            pendingVerificationPaymentId: null,
            updatedAt: nowISO,
          },
          actionBy: "admin",
        }),
      );
    }

    // Batch to avoid overwhelming the client
    const chunkSize = 40;
    for (let i = 0; i < ops.length; i += chunkSize) {
      await Promise.all(ops.slice(i, i + chunkSize));
    }

    return {
      feePaymentsDeleted: paymentIds.length,
      financialDeleted: financialIds.length,
      cashEntriesDeleted: cashEntryIds.length,
      cashDaysDeleted: cashDayIds.length,
      feesReset: issued.filter(
        (fee) =>
          (Number(fee.paidAmount) || 0) > 0 ||
          fee.status === "paid" ||
          fee.status === "partial" ||
          fee.status === "pending_verification",
      ).length,
    };
  },

  async syncFeesForMonth(month: Date, academicYear: string) {
    // Kept for compatibility; prefer catchUpAllMandatoryFees.
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
