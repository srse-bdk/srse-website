"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { classService } from "@/lib/services";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X, Plus, Loader2, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const classSchema = z.object({
  name: z.string().min(1, "Class name is required"),
  description: z.string().optional(),
  sections: z.array(z.string()).min(1, "At least one section is required"),
  capacityPerSection: z
    .number()
    .min(1, "Capacity must be at least 1")
    .int("Capacity must be a whole number"),
  academicYear: z.string().min(1, "Academic year is required"),
  status: z.enum(["active", "inactive"]),
  order: z.number().int().optional(),
});

type ClassFormData = z.infer<typeof classSchema>;

export function ClassForm() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const [isLoading, setIsLoading] = useState(false);
  const [newSection, setNewSection] = useState("");

  // Get current academic year (default)
  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${String(currentYear + 1).slice(-2)}`;

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classSchema),
    defaultValues: {
      name: "",
      description: "",
      sections: ["A"],
      capacityPerSection: 40,
      academicYear: defaultAcademicYear,
      status: "active",
      order: undefined,
    },
  });

  const sections = form.watch("sections") || [];

  const addSection = () => {
    if (!newSection.trim()) {
      toast.error("Please enter a section name");
      return;
    }

    if (sections.includes(newSection.toUpperCase())) {
      toast.error("Section already exists");
      return;
    }

    form.setValue("sections", [...sections, newSection.toUpperCase()]);
    setNewSection("");
  };

  const removeSection = (section: string) => {
    if (sections.length === 1) {
      toast.error("At least one section is required");
      return;
    }
    form.setValue(
      "sections",
      sections.filter((s) => s !== section),
    );
  };

  const onSubmit = async (data: ClassFormData) => {
    setIsLoading(true);
    try {
      await classService.create({
        name: data.name,
        description: data.description,
        sections: data.sections,
        capacityPerSection: data.capacityPerSection,
        academicYear: data.academicYear,
        status: data.status,
        order: data.order,
      });

      toast.success("Class created successfully");
      router.push(`/${role}/students/enrollment/classes`);
    } catch (error) {
      console.error("Error creating class:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create class",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Class Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Class 1, Grade 10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description for this class"
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
                name="academicYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year *</FormLabel>
                    <FormControl>
                      <Input placeholder="2024-25" {...field} />
                    </FormControl>
                    <FormDescription>
                      Format: YYYY-YY (e.g., 2024-25)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="capacityPerSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacity Per Section *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum number of students per section
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        value={field.value !== undefined ? String(field.value) : ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : undefined,
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
              name="sections"
              render={() => (
                <FormItem>
                  <FormLabel>Sections *</FormLabel>
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {sections.map((section) => (
                        <Badge
                          key={section}
                          variant="secondary"
                          className="px-3 py-1 text-sm"
                        >
                          {section}
                          <button
                            type="button"
                            onClick={() => removeSection(section)}
                            className="ml-2 hover:text-destructive"
                            disabled={sections.length === 1}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter section name (e.g., A, B, C)"
                        value={newSection}
                        onChange={(e) => setNewSection(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSection();
                          }
                        }}
                        maxLength={5}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={addSection}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </div>
                    <FormDescription>
                      Add sections for this class. At least one section is
                      required.
                    </FormDescription>
                    <FormMessage />
                  </div>
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
                Create Class
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

