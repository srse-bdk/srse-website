"use client";

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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { financialService } from "@/lib/services/financial.service";
import type {
  FinancialTransaction,
  FinancialTransactionType,
} from "@/lib/types/financial.type";
import {
  PREDEFINED_EXPENSE_CATEGORIES,
  PREDEFINED_INCOME_CATEGORIES,
} from "@/lib/types/financial.type";
import { UploadButton } from "@/lib/utils/uploadthing";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const CUSTOM_CATEGORY_VALUE = "__custom__";

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Please select a category"),
  customCategory: z.string().optional(),
  amount: z.coerce.number().min(1, "Amount should be greater than 0"),
  date: z.string().min(1, "Please select a date"),
  notes: z.string().optional(),
  receiptUrl: z.string().optional(),
  receiptFileKey: z.string().optional(),
}).superRefine((value, ctx) => {
  if (
    value.category === CUSTOM_CATEGORY_VALUE &&
    (!value.customCategory || value.customCategory.trim().length < 2)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["customCategory"],
      message: "Please provide a custom category name",
    });
  }
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface TransactionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: FinancialTransaction | null;
  extraCategories: string[];
  onSuccess: () => void;
}

const getDefaultCategories = (type: FinancialTransactionType) =>
  type === "income"
    ? [...PREDEFINED_INCOME_CATEGORIES] as string[]
    : [...PREDEFINED_EXPENSE_CATEGORIES] as string[];

export function TransactionFormDialog({
  open,
  onOpenChange,
  transaction,
  extraCategories,
  onSuccess,
}: TransactionFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const isEdit = Boolean(transaction?.id);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: "income",
      category: "",
      customCategory: "",
      amount: 0,
      date: new Date().toISOString().split("T")[0],
      notes: "",
      receiptUrl: "",
      receiptFileKey: "",
    },
  });

  const selectedType = form.watch("type");
  const selectedCategory = form.watch("category");
  const receiptUrl = form.watch("receiptUrl");

  const categoryOptions = useMemo(() => {
    const defaults = getDefaultCategories(selectedType);
    const extra = extraCategories.filter((category) => !defaults.includes(category));
    return [...defaults, ...extra];
  }, [selectedType, extraCategories]);

  const resetFromTransaction = (item: FinancialTransaction | null) => {
    const type = item?.type ?? "income";
    const defaults = getDefaultCategories(type);
    const isDefaultCategory = item?.category && defaults.includes(item.category);

    form.reset({
      type,
      category: item
        ? isDefaultCategory
          ? item.category
          : CUSTOM_CATEGORY_VALUE
        : "",
      customCategory: item && !isDefaultCategory ? item.category : "",
      amount: item?.amount ?? 0,
      date: item?.date ?? new Date().toISOString().split("T")[0],
      notes: item?.notes ?? "",
      receiptUrl: item?.receiptUrl ?? "",
      receiptFileKey: item?.receiptFileKey ?? "",
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetFromTransaction(null);
    } else if (nextOpen) {
      resetFromTransaction(transaction);
    }
    onOpenChange(nextOpen);
  };

  const handleTypeChange = (type: FinancialTransactionType) => {
    form.setValue("type", type, { shouldDirty: true });
    const defaults = getDefaultCategories(type);
    const currentCategory = form.getValues("category");
    if (currentCategory && currentCategory !== CUSTOM_CATEGORY_VALUE && !defaults.includes(currentCategory)) {
      form.setValue("category", "", { shouldDirty: true });
    }
  };

  const deleteReceipt = async () => {
    const fileKey = form.getValues("receiptFileKey");
    form.setValue("receiptUrl", "");
    form.setValue("receiptFileKey", "");
    if (!fileKey) return;

    try {
      await fetch(`/api/uploadthing/delete?fileKey=${encodeURIComponent(fileKey)}`, {
        method: "DELETE",
      });
    } catch (error) {
      console.error(error);
    }
  };

  const onSubmit = async (values: TransactionFormValues) => {
    setSubmitting(true);
    try {
      const finalCategory =
        values.category === CUSTOM_CATEGORY_VALUE
          ? values.customCategory?.trim() || "Miscellaneous"
          : values.category;

      const payload = {
        type: values.type,
        category: finalCategory,
        amount: values.amount,
        date: values.date,
        notes: values.notes?.trim() || "",
        receiptUrl: values.receiptUrl || "",
        receiptFileKey: values.receiptFileKey || "",
      };

      if (transaction?.id) {
        await financialService.updateTransaction(transaction.id, payload);
        toast.success("Transaction updated successfully");
      } else {
        await financialService.createTransaction(payload);
        toast.success("Transaction added successfully");
      }

      onSuccess();
      handleOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Unable to save transaction");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
          <DialogDescription>
            Save income and expense entries with category, date, notes, and optional receipt.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control as any}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select value={field.value} onValueChange={(v) => handleTypeChange(v as FinancialTransactionType)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
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
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control as any}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                        <SelectItem value={CUSTOM_CATEGORY_VALUE}>Custom category...</SelectItem>
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
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="1" placeholder="e.g. 12000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {selectedCategory === CUSTOM_CATEGORY_VALUE && (
              <FormField
                control={form.control as any}
                name="customCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Alumni Donation Drive" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control as any}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description / Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} placeholder="Optional details about this transaction" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="receiptUrl"
              render={() => (
                <FormItem>
                  <FormLabel>Receipt Attachment (Optional)</FormLabel>
                  <FormControl>
                    <div className="rounded-xl border border-dashed p-4">
                      {receiptUrl ? (
                        <div className="relative w-fit rounded-md border p-2">
                          {/* biome-ignore lint/a11y/useAltText: uploaded receipt preview */}
                          <img src={receiptUrl} className="h-32 w-32 object-cover rounded" />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute -right-3 -top-3 h-7 w-7 rounded-full"
                            onClick={deleteReceipt}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-start gap-3">
                          <div className="text-sm text-muted-foreground">Upload image receipt (JPG/PNG up to 4MB)</div>
                          <UploadButton
                            endpoint="imageUploader"
                            onClientUploadComplete={(res) => {
                              if (res?.[0]) {
                                form.setValue("receiptUrl", res[0].url, { shouldDirty: true });
                                form.setValue("receiptFileKey", res[0].key, { shouldDirty: true });
                                toast.success("Receipt uploaded");
                              }
                            }}
                            onUploadError={(error: Error) => {
                              toast.error(`Upload failed: ${error.message}`);
                            }}
                            appearance={{
                              button:
                                "ut-ready:bg-primary ut-uploading:cursor-not-allowed ut-ready:text-primary-foreground",
                            }}
                            content={{
                              button: ({ ready }) => (ready ? "Upload receipt" : "Preparing..."),
                              allowedContent: () => (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                  <Upload className="h-3 w-3" />
                                  Optional proof attachment
                                </span>
                              ),
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Update Transaction" : "Add Transaction"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}




