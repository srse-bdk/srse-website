"use client";

import { Autocomplete } from "@/components/core/autocomplete";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { cashBookService } from "@/lib/services/cash-book.service";
import type {
  CashBookEntry,
  CashBookEntryType,
  CashBookMode,
} from "@/lib/types/cash-book.type";
import {
  CASH_BOOK_MODE_LABELS,
  categoriesForType,
} from "@/lib/types/cash-book.type";
import type { Student } from "@/lib/types/student.type";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const NONE_STUDENT = "__none__";

const entrySchema = z.object({
  type: z.enum(["income", "expense"]),
  particulars: z.string().min(1, "Particulars are required"),
  categoryCode: z.string().min(1, "Select a category"),
  mode: z.enum(["C", "U", "B", "Q"]),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  refNo: z.string().optional(),
  notes: z.string().optional(),
  studentId: z.string().optional(),
});

type EntryFormValues = z.infer<typeof entrySchema>;

interface CashBookEntryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  entry: CashBookEntry | null;
  defaultType?: CashBookEntryType;
  onSuccess: () => void;
}

export function CashBookEntryFormDialog({
  open,
  onOpenChange,
  date,
  entry,
  defaultType = "income",
  onSuccess,
}: CashBookEntryFormDialogProps) {
  const user = useAppStore((state) => state.user);
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(entry?.id);

  const { data: studentsData } = useFirebaseRealtime<Student>("students", {
    asArray: true,
    enabled: open,
  });
  const students = (studentsData as Student[]) || [];

  const studentOptions = useMemo(() => {
    const active = students
      .filter((s) => s.status !== "inactive")
      .map((s) => ({
        value: s.id,
        label: `${s.fullName || `${s.firstName} ${s.lastName}`.trim()} (${s.admissionNumber})`,
        subLabel: [s.currentClass, s.currentSection].filter(Boolean).join(" · "),
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    return [
      { value: NONE_STUDENT, label: "Not linked to a student" },
      ...active,
    ];
  }, [students]);

  const form = useForm<EntryFormValues>({
    resolver: zodResolver(entrySchema) as any,
    defaultValues: {
      type: defaultType,
      particulars: "",
      categoryCode: "",
      mode: "C",
      amount: 0,
      refNo: "",
      notes: "",
      studentId: NONE_STUDENT,
    },
  });

  const selectedType = form.watch("type");
  const categoryOptions = useMemo(
    () => categoriesForType(selectedType),
    [selectedType],
  );

  useEffect(() => {
    if (!open) return;
    form.reset({
      type: entry?.type ?? defaultType,
      particulars: entry?.particulars ?? "",
      categoryCode: entry?.categoryCode ?? "",
      mode: (entry?.mode as CashBookMode) ?? "C",
      amount: entry?.amount ?? 0,
      refNo: entry?.refNo ?? "",
      notes: entry?.notes ?? "",
      studentId: entry?.studentId || NONE_STUDENT,
    });
  }, [open, entry, defaultType, form]);

  const handleTypeChange = (type: CashBookEntryType) => {
    form.setValue("type", type, { shouldDirty: true });
    const codes = categoriesForType(type).map((c) => c.code);
    if (!codes.includes(form.getValues("categoryCode"))) {
      form.setValue("categoryCode", "", { shouldDirty: true });
    }
    if (type === "expense") {
      form.setValue("studentId", NONE_STUDENT, { shouldDirty: true });
    }
  };

  const handleStudentChange = (studentId: string) => {
    form.setValue("studentId", studentId, { shouldDirty: true });
    if (!studentId || studentId === NONE_STUDENT) return;

    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const name =
      student.fullName ||
      `${student.firstName || ""} ${student.lastName || ""}`.trim();
    const current = form.getValues("particulars")?.trim();
    if (!current) {
      form.setValue("particulars", name, { shouldDirty: true });
    }
  };

  const onSubmit = async (values: EntryFormValues) => {
    setSubmitting(true);
    try {
      const actionBy = user?.uid || "admin";
      const linkedId =
        values.type === "income" &&
        values.studentId &&
        values.studentId !== NONE_STUDENT
          ? values.studentId
          : "";
      const student = linkedId
        ? students.find((s) => s.id === linkedId)
        : undefined;

      const payload = {
        type: values.type,
        date,
        particulars: values.particulars.trim(),
        categoryCode: values.categoryCode,
        mode: values.mode,
        amount: values.amount,
        refNo: values.refNo?.trim() || "",
        notes: values.notes?.trim() || "",
        voided: false,
        studentId: linkedId || "",
        studentName: student
          ? student.fullName ||
            `${student.firstName || ""} ${student.lastName || ""}`.trim()
          : "",
        studentAdmissionNumber: student?.admissionNumber || "",
        createdByUid: entry?.createdByUid || user?.uid,
        createdByName: entry?.createdByName || user?.name,
      };

      if (entry?.id) {
        await cashBookService.updateEntry(entry.id, payload, actionBy);
        toast.success("Entry updated");
      } else {
        await cashBookService.createEntry(payload, actionBy);
        toast.success(
          values.type === "income" ? "Income recorded" : "Expense recorded",
        );
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Unable to save entry");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? "Edit entry"
              : defaultType === "income"
                ? "Add income"
                : "Add expense"}
          </DialogTitle>
          <DialogDescription>
            Date {date}. Use mode C/U/B/Q. Link fee income to a student when
            relevant.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit as any)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control as any}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(v) =>
                        handleTypeChange(v as CashBookEntryType)
                      }
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(
                          Object.keys(CASH_BOOK_MODE_LABELS) as CashBookMode[]
                        ).map((mode) => (
                          <SelectItem key={mode} value={mode}>
                            {mode} — {CASH_BOOK_MODE_LABELS[mode]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedType === "income" && (
              <FormField
                control={form.control as any}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student (optional)</FormLabel>
                    <FormControl>
                      <Autocomplete
                        options={studentOptions}
                        value={field.value || NONE_STUDENT}
                        onChange={handleStudentChange}
                        placeholder="Search student by name or admission no."
                        emptyMessage="No students found"
                      />
                    </FormControl>
                    <FormDescription>
                      Links this receipt to the student profile.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control as any}
              name="particulars"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Particulars</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Student / payee / description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control as any}
                name="categoryCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category code</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select code" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-72">
                        {categoryOptions.map((cat) => (
                          <SelectItem key={cat.code} value={cat.code}>
                            {cat.code} — {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control as any}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control as any}
              name="refNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedType === "income" ? "Receipt No." : "Voucher No."}
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Optional reference number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Optional" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Update" : "Save entry"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
