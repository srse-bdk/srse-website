"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { subjectService } from "@/lib/services";
import type { Subject } from "@/lib/types/subject.type";

const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  order: z.number().int().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export function SubjectEditForm() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const subjectId = params.id as string;
  const [isLoading, setIsLoading] = useState(false);

  const { data, loading, error } = useFirebaseRealtime<Subject>(
    `subjects/${subjectId}`,
    {
      asArray: false,
    },
  );

  const subject = data as Subject | null;

  const form = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      status: "active",
      order: undefined,
    },
  });

  useEffect(() => {
    if (!subject) {
      return;
    }

    form.reset({
      name: subject.name,
      code: subject.code || "",
      description: subject.description || "",
      status: subject.status,
      order: subject.order,
    });
  }, [subject, form]);

  const onSubmit = async (data: SubjectFormData) => {
    setIsLoading(true);
    try {
      await subjectService.update(subjectId, {
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        status: data.status,
        order: data.order,
      });

      toast.success("Subject updated successfully");
      router.push(`/${role}/subjects`);
    } catch (submitError) {
      console.error("Error updating subject:", submitError);
      toast.error(
        submitError instanceof Error
          ? submitError.message
          : "Failed to update subject",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !subject) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "Subject not found or failed to load."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Edit Subject Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Mathematics, English"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject Code</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., MATH, ENG" {...field} />
                    </FormControl>
                    <FormDescription>
                      Optional short code for the subject
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description for this subject"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="order"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Order (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="For sorting"
                        value={
                          field.value !== undefined ? String(field.value) : ""
                        }
                        onChange={(event) =>
                          field.onChange(
                            event.target.value
                              ? parseInt(event.target.value, 10)
                              : undefined,
                          )
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Lower numbers appear first in lists
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2 flex-wrap">
                      {(
                        [
                          { value: "active", label: "Active" },
                          { value: "inactive", label: "Inactive" },
                        ] as const
                      ).map(({ value, label }) => {
                        const isSelected = field.value === value;
                        return (
                          <motion.button
                            key={value}
                            type="button"
                            onClick={() => field.onChange(value)}
                            className={`
                              relative flex-1 min-w-[120px] px-4 py-3 rounded-lg border-2 transition-all
                              flex items-center justify-center gap-2
                              ${
                                isSelected
                                  ? "border-primary bg-primary/10 text-primary shadow-md"
                                  : "border-border bg-background hover:border-primary/50 hover:bg-accent/50"
                              }
                            `}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            initial={false}
                          >
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1"
                                >
                                  <Check className="h-3 w-3" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <span className="font-medium">{label}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Subject
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
