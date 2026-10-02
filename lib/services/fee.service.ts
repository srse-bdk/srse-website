import { FeeCategory, FeeConfiguration, FeeRecord, FeeStatus } from "@/lib/types/fee.type";
import type { FeePayment } from "@/lib/types/fee-payment.type";
import type { Student } from "@/lib/types/student.type";
import { resolveClassFeeAmount, classTokensMatch } from "@/lib/utils/class-section-match";
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
  isBooksOrCopiesFeeConfig,
  isSelectableFeeIncluded,
  isTuitionFeeConfig,
  shouldSkipTuitionPeriodForReadmission,
  studentHasReadmissionIncluded,
} from "@/lib/utils/student-selectable-fees";
import { isNewAdmissionInAcademicYear } from "@/lib/utils/student-rte";

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
  // Per-student override wins only when > 0. A stored 0 (from before class
  // fees were set) must not block structure amounts after Set Fee + catch-up.
  const rawOverride = student.optionalFeeAmounts?.[config.id];
  const overrideAmount =
    rawOverride != null && Number(rawOverride) > 0
      ? Number(rawOverride)
      : null;
  const amount =
    overrideAmount != null
      ? overrideAmount
      : resolveClassFeeAmount(config.classFees, classId);
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

  const academicYear = getAcademicYearForDate(issueDate);
  const isNewThisAy = isNewAdmissionInAcademicYear(
    student as Student,
    academicYear,
  );
  const isContinuing = !isNewThisAy;

  // Once-per-AY fees: billed in April of the session.
  // Admission XOR re-admission is decided by new vs continuing (not checkboxes alone).
  // Books & copies are always mandatory each year.
  if (isAcademicYearFeeConfig(config)) {
    if (isBooksOrCopiesFeeConfig(config)) {
      return true;
    }
    if (configMatchesSelectableKind(config, "readmission")) {
      // Continuing only — either/or with admission.
      return isContinuing;
    }
    if (configMatchesSelectableKind(config, "admission")) {
      // New admissions only — either/or with re-admission.
      return isNewThisAy;
    }
    if ((student.excludedFeeConfigIds || []).includes(config.id)) return false;
    if (config.isOptional) {
      return isSelectableFeeIncluded(student as Student, config);
    }
    return true;
  }

  const hasReadmission = studentHasReadmissionIncluded(
    student as Student,
    allConfigs,
  );

  // Continuing / re-admission: monthly tuition from May (April covered by re-admission).
  if (
    (isContinuing || hasReadmission) &&
    config.cycle === "monthly" &&
    isTuitionFeeConfig(config)
  ) {
    const tuitionStart = getTuitionStartAfterReadmission(academicYear);
    return startOfMonth(issueDate) >= startOfMonth(tuitionStart);
  }

  const anchor = getStudentFeeAnchorDate(student as Student);
  return startOfMonth(anchor) <= startOfMonth(issueDate);
}

/**
 * Sync admission vs re-admission (either/or) and force books/copies for a student.
 * - New this AY: admission only (no re-admission); tuition from admission month
 * - Continuing: re-admission only in April (no admission); tuition from May
 * - Books & copies: mandatory every academic year
 */
function assignAdmissionReadmissionAndBooks(params: {
  student: Student;
  configs: FeeConfiguration[];
  academicYear: string;
  throughDate?: Date;
  /** When true, replace exclusions with only adm/read exclusivity (full reset). */
  resetExclusions?: boolean;
}): {
  isNewThisAy: boolean;
  excludedFeeConfigIds: string[];
  optionalFeeIds: string[];
  optionalFeeAmounts: Record<string, number>;
} {
  const {
    student,
    configs,
    academicYear,
    throughDate = new Date(),
    resetExclusions = false,
  } = params;

  const isNewThisAy = isNewAdmissionInAcademicYear(student, academicYear);
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
  const booksConfigs = configs.filter(isBooksOrCopiesFeeConfig);
  const ayFeeConfigs = configs.filter(isAcademicYearFeeConfig);

  const excluded = new Set(
    resetExclusions ? [] : student.excludedFeeConfigIds || [],
  );

  // Clear then re-apply either/or: never both admission and re-admission.
  if (admissionCfg) excluded.delete(admissionCfg.id);
  if (readmissionCfg) excluded.delete(readmissionCfg.id);
  for (const books of booksConfigs) {
    excluded.delete(books.id);
  }

  if (isNewThisAy) {
    if (readmissionCfg) excluded.add(readmissionCfg.id);
  } else if (admissionCfg) {
    excluded.add(admissionCfg.id);
  }

  const optionalIds = new Set(student.optionalFeeIds || []);
  const optionalAmounts: Record<string, number> = {
    ...(student.optionalFeeAmounts || {}),
  };

  const ensureAssigned = (cfg: FeeConfiguration | null | undefined) => {
    if (!cfg) return;
    if (excluded.has(cfg.id)) return;
    // Assign when optional in structure, or books (mandatory yearly even if marked optional).
    if (!cfg.isOptional && !isBooksOrCopiesFeeConfig(cfg)) return;
    optionalIds.add(cfg.id);
    const classAmount = resolveClassFeeAmount(
      cfg.classFees,
      student.currentClass || "unassigned",
    );
    const prev = optionalAmounts[cfg.id];
    // Refresh when unset or zero so newly set class fees apply on catch-up.
    if (prev == null || Number(prev) === 0) {
      if (classAmount > 0) {
        optionalAmounts[cfg.id] = classAmount;
      } else {
        delete optionalAmounts[cfg.id];
      }
    }
  };

  for (const cfg of [uniformCfg, transportCfg, ...ayFeeConfigs, ...booksConfigs]) {
    if (!cfg) continue;
    // Either/or gate while looping AY fees.
    if (isNewThisAy && configMatchesSelectableKind(cfg, "readmission")) continue;
    if (!isNewThisAy && configMatchesSelectableKind(cfg, "admission")) continue;
    ensureAssigned(cfg);
  }

  // Force the correct side of either/or.
  if (isNewThisAy) {
    if (admissionCfg) {
      excluded.delete(admissionCfg.id);
      ensureAssigned(admissionCfg);
    }
    if (readmissionCfg) {
      optionalIds.delete(readmissionCfg.id);
      delete optionalAmounts[readmissionCfg.id];
      excluded.add(readmissionCfg.id);
    }
  } else {
    if (readmissionCfg) {
      excluded.delete(readmissionCfg.id);
      ensureAssigned(readmissionCfg);
    }
    if (admissionCfg) {
      optionalIds.delete(admissionCfg.id);
      delete optionalAmounts[admissionCfg.id];
      excluded.add(admissionCfg.id);
    }
  }

  // Books & copies always on; always refresh amount from structure when 0/unset.
  for (const books of booksConfigs) {
    excluded.delete(books.id);
    ensureAssigned(books);
    const classAmount = resolveClassFeeAmount(
      books.classFees,
      student.currentClass || "unassigned",
    );
    if (classAmount > 0) {
      optionalIds.add(books.id);
      const prev = optionalAmounts[books.id];
      if (prev == null || Number(prev) === 0) {
        optionalAmounts[books.id] = classAmount;
      }
    }
  }

  return {
    isNewThisAy,
    excludedFeeConfigIds: [...excluded],
    optionalFeeIds: [...optionalIds],
    optionalFeeAmounts: optionalAmounts,
  };
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
        // Optional fees need assignment — except books/copies (mandatory yearly).
        if (config.isOptional && !isBooksOrCopiesFeeConfig(config)) {
          const ids: string[] = student.optionalFeeIds || [];
          const amounts = student.optionalFeeAmounts || {};
          if (!ids.includes(config.id) && amounts[config.id] == null) {
            continue;
          }
        }
        // Re-admission (April) covers April tuition — monthly tuition from May.
        const academicYearForIssue = getAcademicYearForDate(issueDate);
        const isContinuingStudent = !isNewAdmissionInAcademicYear(
          student as Student,
          academicYearForIssue,
        );
        if (
          shouldSkipTuitionPeriodForReadmission({
            student,
            config,
            issueDate,
            configs,
            isContinuingStudent,
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

    // Admission and re-admission are either/or — never both.
    const admissionCfg = findSelectableFeeConfig(configs, "admission");
    const readmissionCfg = findSelectableFeeConfig(configs, "readmission");
    const academicYear = getAcademicYearForDate(new Date());
    const isNewThisAy = isNewAdmissionInAcademicYear(student, academicYear);
    const normalizedInclusions = { ...inclusions };
    if (admissionCfg && readmissionCfg) {
      const wantAdmission = normalizedInclusions[admissionCfg.id] === true;
      const wantReadmission = normalizedInclusions[readmissionCfg.id] === true;
      if (wantAdmission && wantReadmission) {
        // Prefer the side that matches new vs continuing; else keep existing.
        if (isNewThisAy) {
          normalizedInclusions[readmissionCfg.id] = false;
        } else {
          normalizedInclusions[admissionCfg.id] = false;
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
        const classAmount = resolveClassFeeAmount(
          config.classFees,
          student.currentClass || "unassigned",
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
    const [configs, studentsData] = await Promise.all([
      this.getAllConfigs(),
      mutate({ action: "get", path: "students" }),
    ]);
    const students = getArrFromObj(studentsData || {}) as unknown as Student[];
    const nowISO = new Date().toISOString();

    // Sync either/or + books before issuing so Readmission reaches continuing students.
    let synced = 0;
    let continuing = 0;
    let newAdmissions = 0;
    for (const student of students) {
      if (!student?.id) continue;
      if (student.status && student.status !== "active") continue;

      const assigned = assignAdmissionReadmissionAndBooks({
        student,
        configs,
        academicYear,
        throughDate,
      });
      synced += 1;
      if (assigned.isNewThisAy) newAdmissions += 1;
      else continuing += 1;

      await mutate({
        action: "update",
        path: `students/${student.id}`,
        data: {
          excludedFeeConfigIds: assigned.excludedFeeConfigIds,
          optionalFeeIds: assigned.optionalFeeIds,
          optionalFeeAmounts: assigned.optionalFeeAmounts,
          updatedAt: nowISO,
        },
        actionBy: "admin",
      });

      if (!assigned.isNewThisAy) {
        await this.deleteUnpaidAprilTuitionForStudent(
          student.id,
          configs,
          throughDate,
        );
      }
      // Drop unpaid wrong-side admission/readmission bills.
      await this.deleteUnpaidWrongAdmissionReadmissionBills(
        student.id,
        configs,
        assigned.isNewThisAy,
      );
    }

    const mandatory = configs.filter(
      (cfg) =>
        !cfg.isOptional &&
        (!cfg.academicYear || cfg.academicYear === academicYear),
    );
    // Also catch books if marked optional in structure (still mandatory yearly).
    const booksConfigs = configs.filter(isBooksOrCopiesFeeConfig);
    const toIssue = [
      ...mandatory,
      ...booksConfigs.filter((b) => !mandatory.some((m) => m.id === b.id)),
    ];

    let created = 0;
    for (const cfg of toIssue) {
      const result = await this.issueFeesForConfigThroughDate(
        cfg.id,
        throughDate,
      );
      created += result.created;
    }
    return {
      created,
      configs: toIssue.length,
      studentsSynced: synced,
      newAdmissions,
      continuing,
    };
  },

  /**
   * Remove unpaid Admission bills for continuing students, or unpaid
   * Re-admission bills for new admissions (either/or cleanup).
   */
  async deleteUnpaidWrongAdmissionReadmissionBills(
    studentId: string,
    configs: FeeConfiguration[],
    isNewThisAy: boolean,
  ) {
    const admissionCfg = findSelectableFeeConfig(configs, "admission");
    const readmissionCfg = findSelectableFeeConfig(configs, "readmission");
    const wrongIds = new Set<string>();
    if (isNewThisAy && readmissionCfg) wrongIds.add(readmissionCfg.id);
    if (!isNewThisAy && admissionCfg) wrongIds.add(admissionCfg.id);
    if (wrongIds.size === 0) return { deleted: 0 };

    const issued = await this.getFeesByStudent(studentId);
    const removable = issued.filter((fee) => {
      if (!fee.feeConfigId || !wrongIds.has(fee.feeConfigId)) return false;
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

  /**
   * Catch up one fee config through today. For admission / re-admission /
   * tuition / books, syncs either/or assignments first.
   */
  async catchUpConfigThroughDate(configId: string, throughDate = new Date()) {
    const configs = await this.getAllConfigs();
    const config = configs.find((c) => c.id === configId);
    if (!config) throw new Error("Fee config not found");

    const needsSync =
      isAcademicYearFeeConfig(config) || isTuitionFeeConfig(config);
    if (needsSync) {
      // Full sync so Readmission/Admission/Books/tuition rules stay consistent.
      return this.catchUpAllMandatoryFees(throughDate);
    }

    const result = await this.issueFeesForConfigThroughDate(
      configId,
      throughDate,
    );
    return {
      created: result.created,
      configs: 1,
      studentsSynced: 0,
      newAdmissions: 0,
      continuing: 0,
    };
  },

  /**
   * Catch up matching mandatory configs (by id list) through today.
   * Used before cash-book fee reference so missing months exist.
   */
  async catchUpConfigsThroughDate(
    configIds: string[],
    throughDate = new Date(),
  ) {
    const configs = await this.getAllConfigs();
    const unique = [...new Set(configIds.filter(Boolean))];
    const needsFullSync = unique.some((id) => {
      const cfg = configs.find((c) => c.id === id);
      return cfg
        ? isAcademicYearFeeConfig(cfg) || isTuitionFeeConfig(cfg)
        : false;
    });
    if (needsFullSync) {
      return this.catchUpAllMandatoryFees(throughDate);
    }

    let created = 0;
    for (const id of unique) {
      try {
        const result = await this.issueFeesForConfigThroughDate(id, throughDate);
        created += result.created;
      } catch (error) {
        console.error(`Catch-up failed for config ${id}`, error);
      }
    }
    return { created, configs: unique.length, studentsSynced: 0, newAdmissions: 0, continuing: 0 };
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
   * Rebuild unpaid fee bills for students in the given standards (e.g. 3–5),
   * using each student's admission date for tuition start and admission vs
   * re-admission. Paid bills are kept. Does not wipe school-wide payments.
   */
  async reissueFeesForClassesByAdmissionDate(
    classNumbers: number[] = [3, 4, 5],
    throughDate = new Date(),
  ) {
    const [issuedRaw, studentsData, configs] = await Promise.all([
      mutate({ action: "get", path: "feeIssued" }),
      mutate({ action: "get", path: "students" }),
      this.getAllConfigs(),
    ]);

    const allIssued = (getArrFromObj(issuedRaw || {}) as unknown) as FeeRecord[];
    const students = getArrFromObj(studentsData || {}) as unknown as Student[];
    const academicYear = getAcademicYearForDate(throughDate);

    const classLabels = classNumbers.flatMap((n) => [
      String(n),
      `Class ${n}`,
      `Std ${n}`,
      `Standard ${n}`,
    ]);

    const targetStudents = students.filter((student) => {
      if (!student?.id) return false;
      if (student.status && student.status !== "active") return false;
      const cls = student.currentClass || "";
      return classLabels.some((label) => classTokensMatch(cls, label));
    });

    if (targetStudents.length === 0) {
      return {
        studentsMatched: 0,
        unpaidDeleted: 0,
        newAdmissions: 0,
        continuing: 0,
        tuitionIssued: 0,
        ayFeesIssued: 0,
        classes: classNumbers,
        academicYear,
      };
    }

    const targetIds = new Set(targetStudents.map((s) => s.id));
    const unpaidToDelete = allIssued.filter((fee) => {
      if (!targetIds.has(fee.studentId)) return false;
      const paid = Number(fee.paidAmount) || 0;
      return paid <= 0 && fee.status !== "paid" && fee.status !== "partial";
    });

    const chunkSize = 40;
    for (let i = 0; i < unpaidToDelete.length; i += chunkSize) {
      const chunk = unpaidToDelete.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map((fee) =>
          mutate({
            action: "delete",
            path: `feeIssued/${fee.id}`,
            actionBy: "admin",
          }),
        ),
      );
    }

    const ayFeeConfigs = configs.filter(isAcademicYearFeeConfig);
    const nowISO = new Date().toISOString();
    let newAdmissions = 0;
    let continuing = 0;

    for (const student of targetStudents) {
      const assigned = assignAdmissionReadmissionAndBooks({
        student,
        configs,
        academicYear,
        throughDate,
      });
      if (assigned.isNewThisAy) newAdmissions += 1;
      else continuing += 1;

      await mutate({
        action: "update",
        path: `students/${student.id}`,
        data: {
          excludedFeeConfigIds: assigned.excludedFeeConfigIds,
          optionalFeeIds: assigned.optionalFeeIds,
          optionalFeeAmounts: assigned.optionalFeeAmounts,
          updatedAt: nowISO,
        },
        actionBy: "admin",
      });

      // Continuing: re-admission covers April — drop unpaid April tuition.
      if (!assigned.isNewThisAy) {
        await this.deleteUnpaidAprilTuitionForStudent(
          student.id,
          configs,
          throughDate,
        );
      }
    }

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

    return {
      studentsMatched: targetStudents.length,
      unpaidDeleted: unpaidToDelete.length,
      newAdmissions,
      continuing,
      tuitionIssued: catchUp.created,
      ayFeesIssued: ayIssued,
      classes: classNumbers,
      academicYear,
    };
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
    const ayFeeConfigs = configs.filter(isAcademicYearFeeConfig);
    const nowISO = new Date().toISOString();
    let newAdmissions = 0;
    let continuing = 0;

    for (const student of students) {
      if (!student?.id) continue;
      if (student.status && student.status !== "active") continue;

      const assigned = assignAdmissionReadmissionAndBooks({
        student,
        configs,
        academicYear,
        throughDate,
        resetExclusions: true,
      });
      if (assigned.isNewThisAy) newAdmissions += 1;
      else continuing += 1;

      await mutate({
        action: "update",
        path: `students/${student.id}`,
        data: {
          excludedFeeConfigIds: assigned.excludedFeeConfigIds,
          optionalFeeIds: assigned.optionalFeeIds,
          optionalFeeAmounts: assigned.optionalFeeAmounts,
          updatedAt: nowISO,
        },
        actionBy: "admin",
      });
    }

    // Issue mandatory (tuition etc.) then once-per-AY fees.
    // Continuing: re-admission in April, monthly tuition from May.
    // New: admission fee, tuition from admission month.
    // Books & copies: mandatory for everyone.
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
