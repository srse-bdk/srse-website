"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { testimonialService } from "@/lib/services/testimonial.service";
import type { Testimonial } from "@/lib/types/testimonial.type";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  role: z.string().min(1, "Role is required"),
  quote: z.string().min(10, "Quote must be at least 10 characters"),
  status: z.enum(["draft", "published"]),
  sortOrder: z.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface TestimonialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testimonial?: Testimonial | null;
  onSuccess: () => void;
}

export function TestimonialDialog({
  open,
  onOpenChange,
  testimonial,
  onSuccess,
}: TestimonialDialogProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      role: "",
      quote: "",
      status: "published",
      sortOrder: 0,
    },
  });

  const status = watch("status");

  useEffect(() => {
    if (open) {
      if (testimonial) {
        setValue("name", testimonial.name);
        setValue("role", testimonial.role);
        setValue("quote", testimonial.quote);
        setValue("status", testimonial.status);
        setValue("sortOrder", testimonial.sortOrder ?? 0);
      } else {
        reset({
          name: "",
          role: "",
          quote: "",
          status: "published",
          sortOrder: 0,
        });
      }
    }
  }, [open, testimonial, setValue, reset]);

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        role: values.role.trim(),
        quote: values.quote.trim(),
        status: values.status,
        sortOrder: values.sortOrder ?? 0,
      };

      if (testimonial?.id) {
        await testimonialService.update(testimonial.id, payload);
        toast.success("Testimonial updated");
      } else {
        await testimonialService.create(payload);
        toast.success("Testimonial added");
      }

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save testimonial");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {testimonial ? "Edit testimonial" : "Add testimonial"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Mrs. Sharma"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role / subtitle</Label>
            <Input
              id="role"
              placeholder="e.g. Parent of Class 5 Student"
              {...register("role")}
            />
            {errors.role && (
              <p className="text-sm text-destructive">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote">Quote</Label>
            <Textarea
              id="quote"
              rows={5}
              placeholder="What they said about the school..."
              {...register("quote")}
            />
            {errors.quote && (
              <p className="text-sm text-destructive">{errors.quote.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) =>
                  setValue("status", v as "draft" | "published")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sortOrder">Display order</Label>
              <Input
                id="sortOrder"
                type="number"
                min={0}
                {...register("sortOrder", { valueAsNumber: true })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {testimonial ? "Save changes" : "Add testimonial"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
