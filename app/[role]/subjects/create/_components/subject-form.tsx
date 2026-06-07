"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { subjectService } from "@/lib/services";

const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required"),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["active", "inactive"]),
  order: z.number().int().optional(),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

export function SubjectForm() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const [isLoading, setIsLoading] = useState(false);

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

  const onSubmit = async (data: SubjectFormData) => {
    setIsLoading(true);
    try {
      await subjectService.create({
        name: data.name,
        code: data.code || undefined,
        description: data.description || undefined,
        status: data.status,
        order: data.order,
      });

      toast.success("Subject created successfully");
      router.push(`/${role}/subjects`);
    } catch (error) {
      console.error("Error creating subject:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create subject",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Details</CardTitle>
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
                        onChange={(e) =>
                          field.onChange(
                            e.target.value
                              ? parseInt(e.target.value, 10)
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
                Create Subject
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
