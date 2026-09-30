/** Fixed particulars on the school fee receipt (matches printed pad). */
export const FEE_RECEIPT_PARTICULARS = [
  "Registration fee",
  "Admission fee",
  "Abacus Adm. fee",
  "Drawing Adm. fee",
  "Re-Admission fee",
  "Tuition fee",
  "Late Payment fee",
  "T.C. / S.L.C. fee",
  "Examination fee",
  "Games fee",
  "Cultural fee",
  "Computer Education fee",
  "Smart Class Room fee",
  "Contingency fee",
  "Van fee",
  "Other fee (Specify)",
] as const;

export type FeeReceiptParticular = (typeof FEE_RECEIPT_PARTICULARS)[number];

function normalize(value?: string) {
  return (value || "").trim().toLowerCase();
}

/**
 * Map an issued fee title/category to a receipt particular row.
 * Unmatched items go to "Other fee (Specify)".
 */
export function mapFeeToReceiptParticular(
  title?: string,
  category?: string,
): { particular: FeeReceiptParticular; otherLabel?: string } {
  const text = `${normalize(title)} ${normalize(category)}`;

  if (
    text.includes("readmission") ||
    text.includes("re-admission") ||
    text.includes("re admission")
  ) {
    return { particular: "Re-Admission fee" };
  }
  if (text.includes("registration")) {
    return { particular: "Registration fee" };
  }
  if (text.includes("admission") && !text.includes("abacus") && !text.includes("drawing")) {
    return { particular: "Admission fee" };
  }
  if (text.includes("abacus")) {
    return { particular: "Abacus Adm. fee" };
  }
  if (text.includes("drawing")) {
    return { particular: "Drawing Adm. fee" };
  }
  if (text.includes("tuition") || text.includes("tution")) {
    return { particular: "Tuition fee" };
  }
  if (text.includes("late")) {
    return { particular: "Late Payment fee" };
  }
  if (text.includes("t.c") || text.includes("slc") || text.includes("transfer")) {
    return { particular: "T.C. / S.L.C. fee" };
  }
  if (text.includes("exam")) {
    return { particular: "Examination fee" };
  }
  if (text.includes("game") || text.includes("sport")) {
    return { particular: "Games fee" };
  }
  if (text.includes("cultural")) {
    return { particular: "Cultural fee" };
  }
  if (text.includes("computer")) {
    return { particular: "Computer Education fee" };
  }
  if (text.includes("smart")) {
    return { particular: "Smart Class Room fee" };
  }
  if (text.includes("contingen")) {
    return { particular: "Contingency fee" };
  }
  if (text.includes("van") || text.includes("transport")) {
    return { particular: "Van fee" };
  }

  return {
    particular: "Other fee (Specify)",
    otherLabel: (title || category || "Other").trim(),
  };
}

export function buildReceiptParticularRows(params: {
  feeTitle?: string;
  feeCategory?: string;
  amountPaid: number;
}): Array<{ label: string; amount: number | null }> {
  const { particular, otherLabel } = mapFeeToReceiptParticular(
    params.feeTitle,
    params.feeCategory,
  );
  const amount = Number(params.amountPaid) || 0;

  return FEE_RECEIPT_PARTICULARS.map((row) => {
    if (row !== particular) {
      return { label: row, amount: null };
    }
    if (row === "Other fee (Specify)" && otherLabel) {
      return { label: `Other fee (${otherLabel})`, amount };
    }
    return { label: row, amount };
  });
}
