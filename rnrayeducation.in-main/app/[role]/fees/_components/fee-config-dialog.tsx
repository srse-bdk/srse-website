"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Edit2 } from "lucide-react";
import { feeService } from "@/lib/services/fee.service";
import { toast } from "sonner";
import { FeeConfiguration, FeeFrequency } from "@/lib/types/fee.type";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  cycle: z.enum(["monthly", "quarterly", "annually", "one-time"]),
  isOptional: z.boolean().default(false),
  academicYear: z.string().min(4, "Academic year is required"), // Hidden field
});

type FormValues = z.infer<typeof formSchema>;

interface FeeConfigDialogProps {
  config?: FeeConfiguration;
  onSuccess?: () => void;
}

export function FeeConfigDialog({ config, onSuccess }: FeeConfigDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate default academic year in full format (e.g., "2025-2026")
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const startYear = month < 3 ? year - 1 : year;
  const defaultAcademicYear = config?.academicYear || `${startYear}-${startYear + 1}`;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      name: config?.name || "",
      cycle: (config?.cycle as FeeFrequency) || "monthly",
      isOptional: config?.isOptional || false,
      academicYear: defaultAcademicYear,
    },
  });

  async function onSubmit(data: FormValues) {
    setLoading(true);
    try {
      if (config?.id) {
        await feeService.updateFeeConfig(config.id, data);
        toast.success("Fee configuration updated");
      } else {
        await feeService.createFeeConfig({
          ...data,
          classFees: {},
        });
        toast.success("Fee configuration created");
      }
      setOpen(false);
      onSuccess?.();
      if (!config) form.reset();
    } catch (error) {
      console.error(error);
      toast.error("Failed to save fee configuration");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {config ? (
          <Button variant="ghost" size="icon">
            <Edit2 className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Fee
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config ? "Edit Fee" : "Define New Fee"}</DialogTitle>
        </DialogHeader>
        <Form {...(form as any)}>
          <form
            onSubmit={form.handleSubmit(onSubmit as any)}
            className="space-y-4"
          >
            <FormField
              control={form.control as any}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Tuition Fee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="cycle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Cycle</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select cycle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="annually">Annually</SelectItem>
                      <SelectItem value="one-time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="isOptional"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Is Optional?</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {/* Hidden Academic Year Field */}
            <input type="hidden" {...form.register("academicYear")} />

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {config ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
