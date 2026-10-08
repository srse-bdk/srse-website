"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { FeeConfiguration } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { feeService } from "@/lib/services/fee.service";
import { toast } from "sonner";
import {
  SELECTABLE_FEE_KINDS,
  SELECTABLE_FEE_LABELS,
  enforceAdmissionReadmissionExclusivity,
  findSelectableFeeConfig,
  getExclusiveOppositeKinds,
  isSelectableFeeIncluded,
  resolveSelectableFeeAmount,
  type SelectableFeeKind,
} from "@/lib/utils/student-selectable-fees";
import { resolveClassFeeAmount } from "@/lib/utils/class-section-match";
import {
  getCurrentAcademicYear,
  isNewAdmissionInAcademicYear,
} from "@/lib/utils/student-rte";

interface ManageStudentExtraFeesDialogProps {
  student: Student | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RowState = {
  kind: SelectableFeeKind;
  config: FeeConfiguration | null;
  included: boolean;
  amount: number;
};

export function ManageStudentExtraFeesDialog({
  student,
  open,
  onOpenChange,
}: ManageStudentExtraFeesDialogProps) {
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);

  const { data: configsData, loading } = useFirebaseRealtime<FeeConfiguration>(
    "feeConfigurations",
    { asArray: true },
  );
  const configs = (configsData as FeeConfiguration[]) || [];

  useEffect(() => {
    if (!open || !student) return;
    const academicYear = getCurrentAcademicYear();
    const isNewThisAy = isNewAdmissionInAcademicYear(student, academicYear);
    const preferred: "admission" | "readmission" = isNewThisAy
      ? "admission"
      : "readmission";

    const initial = SELECTABLE_FEE_KINDS.map((kind) => {
      const config = findSelectableFeeConfig(configs, kind);
      let included = config
        ? isSelectableFeeIncluded(student, config)
        : false;
      // Default either/or when neither side is set yet.
      if (config && kind === "admission" && !included && isNewThisAy) {
        const readCfg = findSelectableFeeConfig(configs, "readmission");
        const readOn = readCfg
          ? isSelectableFeeIncluded(student, readCfg)
          : false;
        if (!readOn) included = true;
      }
      if (config && kind === "readmission" && !included && !isNewThisAy) {
        const admCfg = findSelectableFeeConfig(configs, "admission");
        const admOn = admCfg
          ? isSelectableFeeIncluded(student, admCfg)
          : false;
        if (!admOn) included = true;
      }
      // New admission: uniform on (class fee). Continuing / re-admission: off.
      if (config && kind === "uniform") {
        if (isNewThisAy) {
          included = !(student.excludedFeeConfigIds || []).includes(config.id);
        } else {
          included = false;
        }
      }
      let amount = config ? resolveSelectableFeeAmount(student, config) : 0;
      if (config && kind === "uniform" && included) {
        const unit = resolveClassFeeAmount(
          config.classFees,
          student.currentClass || "unassigned",
        );
        const raw = student.optionalFeeAmounts?.[config.id];
        if (
          raw == null ||
          Number(raw) === 0 ||
          (unit > 0 && Number(raw) === unit * 2)
        ) {
          amount = unit;
        }
      }
      return { kind, config, included, amount };
    });

    setRows(enforceAdmissionReadmissionExclusivity(initial, preferred));
  }, [open, student, configs]);

  const hasAnyConfig = useMemo(
    () => rows.some((row) => row.config),
    [rows],
  );

  const setIncluded = (kind: SelectableFeeKind, included: boolean) => {
    setRows((prev) => {
      let next = prev.map((r) =>
        r.kind === kind ? { ...r, included } : r,
      );
      if (included) {
        const opposites = getExclusiveOppositeKinds(kind);
        next = next.map((r) =>
          opposites.includes(r.kind) ? { ...r, included: false } : r,
        );
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!student) return;
    setSaving(true);
    try {
      const academicYear = getCurrentAcademicYear();
      const preferred: "admission" | "readmission" =
        isNewAdmissionInAcademicYear(student, academicYear)
          ? "admission"
          : "readmission";
      const safeRows = enforceAdmissionReadmissionExclusivity(rows, preferred);
      const inclusions: Record<string, boolean> = {};
      const amounts: Record<string, number> = {};

      for (const row of safeRows) {
        if (!row.config) continue;
        inclusions[row.config.id] = row.included;
        if (row.included) {
          amounts[row.config.id] = row.amount;
        }
      }

      if (Object.keys(inclusions).length === 0) {
        toast.error("No matching fee configurations found in Fee Structure");
        return;
      }

      const result = await feeService.applyStudentSelectableFees({
        studentId: student.id,
        inclusions,
        amounts,
      });

      toast.success(
        `Fees updated (${result.issued} issued, ${result.updated} amount synced, ${result.removed} removed)`,
      );
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update fees",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Admission / Uniform / Transport</DialogTitle>
          <DialogDescription>
            Include or exclude these fees for{" "}
            <strong>{student?.fullName}</strong>. Admission and re-admission are
            either/or — only one applies. Re-admission (April) covers April
            tuition; monthly tuition starts from May. Admission covers the
            admission-month tuition when admitted on/before the 20th; after the
            20th, that month is not charged and the next month is included.
            Uniform is included for new admissions (class fee) and excluded for
            re-admission / continuing students. Books &amp; copies are mandatory
            each year.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {!hasAnyConfig && (
              <p className="text-sm text-muted-foreground rounded-lg border p-3">
                No matching fee configurations found. Add Admission,
                Re-admission, Uniform, or Transport under Fee Structure first.
              </p>
            )}
            {rows.map((row) => (
              <div
                key={row.kind}
                className={`rounded-lg border p-3 space-y-2 ${
                  row.included ? "border-primary/30 bg-muted/20" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    id={`selectable-${row.kind}`}
                    checked={row.included}
                    disabled={!row.config}
                    onCheckedChange={(checked) =>
                      setIncluded(row.kind, Boolean(checked))
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <Label
                      htmlFor={`selectable-${row.kind}`}
                      className="font-medium cursor-pointer"
                    >
                      {SELECTABLE_FEE_LABELS[row.kind]}
                    </Label>
                    {row.config ? (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground truncate">
                          {row.config.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {row.config.cycle}
                        </Badge>
                        {row.config.isOptional && (
                          <Badge variant="secondary" className="text-[10px] h-5">
                            Optional
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-700 mt-1">
                        No matching fee config in structure
                      </p>
                    )}
                    {(row.kind === "admission" ||
                      row.kind === "readmission") && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {row.kind === "readmission"
                          ? "Either/or with admission. Billed in April (covers April tuition). Tuition from May."
                          : "Either/or with re-admission. On/before 20th: includes that month’s tuition. After 20th: that month not charged; next month included."}
                      </p>
                    )}
                    {row.kind === "uniform" && (
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Included for new admissions using the class fee. Not
                        billed for re-admission / continuing students.
                      </p>
                    )}
                  </div>
                  {row.config && row.included && (
                    <div className="w-28 shrink-0">
                      <Label className="text-[10px] text-muted-foreground mb-1 block">
                        Amount (₹)
                      </Label>
                      <Input
                        type="number"
                        className="h-8"
                        value={row.amount || ""}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.kind === row.kind
                                ? {
                                    ...r,
                                    amount: parseFloat(e.target.value) || 0,
                                  }
                                : r,
                            ),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Excluding removes unpaid bills only. Paid bills are kept for
              history. Changing amount updates unpaid bills for this student.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasAnyConfig}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
