"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Info } from "lucide-react";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { FeeConfiguration } from "@/lib/types/fee.type";
import type { Student } from "@/lib/types/student.type";
import { studentService } from "@/lib/services/student.service";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AddOptionalFeeDialogProps {
  student: Student;
  onSuccess?: () => void;
}

export function AddOptionalFeeDialog({
  student,
  onSuccess,
}: AddOptionalFeeDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFees, setSelectedFees] = useState<Record<string, number>>({});

  // Sync with student data when dialog opens
  useEffect(() => {
    if (open) {
      // Initialize with existing amounts or default to 0 if ID exists but no amount
      const initial: Record<string, number> = {};
      if (student.optionalFeeAmounts) {
        Object.assign(initial, student.optionalFeeAmounts);
      } else if (student.optionalFeeIds) {
        // Backwards compatibility or migration
        student.optionalFeeIds.forEach((id) => {
          initial[id] = 0; // Default if not set
        });
      }
      setSelectedFees(initial);
    }
  }, [open, student]);

  const { data: feesData, loading: feesLoading } =
    useFirebaseRealtime<FeeConfiguration>("feeConfigurations", {
      asArray: true,
    });

  const optionalFees = ((feesData as FeeConfiguration[]) || []).filter(
    (fee) => fee.isOptional,
  );

  const handleToggleFee = (feeId: string, checked: boolean) => {
    setSelectedFees((prev) => {
      const next = { ...prev };
      if (checked) {
        next[feeId] = 0; // Default amount
      } else {
        delete next[feeId];
      }
      return next;
    });
  };

  const handleAmountChange = (feeId: string, amount: string) => {
    const val = parseFloat(amount) || 0;
    setSelectedFees((prev) => ({
      ...prev,
      [feeId]: val,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await studentService.update(student.id, {
        optionalFeeAmounts: selectedFees,
        optionalFeeIds: Object.keys(selectedFees), // Keep this for easier querying if needed, or backward compat
      });
      toast.success("Optional fees updated successfully");
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update optional fees");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Optional Fees
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage Optional Fees</DialogTitle>
        </DialogHeader>

        {feesLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="p-3 bg-blue-50 text-blue-800 rounded-lg text-xs flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p>
                Select optional fees and <strong>set the amount</strong> for
                each. This allows you to customize transport or other fees per
                student.
              </p>
            </div>

            <ScrollArea className="h-[400px] w-full rounded-md border p-4">
              <div className="space-y-2">
                {optionalFees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No optional fees configured.
                  </div>
                ) : (
                  optionalFees.map((fee) => {
                    const isSelected = Object.prototype.hasOwnProperty.call(
                      selectedFees,
                      fee.id,
                    );
                    return (
                      <div
                        key={fee.id}
                        className={`flex items-start gap-4 p-3 border rounded-lg transition-colors ${isSelected ? "bg-muted/30 border-primary/20" : "border-border"}`}
                      >
                        <Checkbox
                          id={fee.id}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleToggleFee(fee.id, checked as boolean)
                          }
                          className="mt-3"
                        />
                        <div className="flex-1 grid gap-1.5">
                          <Label
                            htmlFor={fee.id}
                            className="text-sm font-medium cursor-pointer flex items-center gap-2"
                          >
                            {fee.name}
                            <Badge
                              variant="outline"
                              className="text-[10px] font-normal h-5 px-1.5"
                            >
                              {fee.cycle}
                            </Badge>
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Academic Year: {fee.academicYear}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-32">
                            <Label className="text-[10px] text-muted-foreground mb-1 block">
                              Amount (₹)
                            </Label>
                            <Input
                              type="number"
                              className="h-8 text-sm"
                              placeholder="0.00"
                              value={selectedFees[fee.id] || ""}
                              onChange={(e) =>
                                handleAmountChange(fee.id, e.target.value)
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
