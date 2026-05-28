"use client";

import { Autocomplete } from "@/components/core/autocomplete";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { enrollmentService } from "@/lib/services";
import type { Class } from "@/lib/types/class.type";
import type { Student } from "@/lib/types/student.type";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const enrollmentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  classId: z.string().min(1, "Class is required"),
  section: z.string().min(1, "Section is required"),
  rollNumber: z.string().min(1, "Roll number is required"),
  academicYear: z.string().min(1, "Academic year is required"),
  autoAssignRollNumber: z.boolean().optional(),
});

type EnrollmentFormData = z.infer<typeof enrollmentSchema>;

export function EnrollmentForm() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const [isLoading, setIsLoading] = useState(false);

  // Fetch students and classes
  const { data: studentsData } = useFirebaseRealtime<Student>("students", {
    asArray: true,
  });
  const { data: classesData } = useFirebaseRealtime<Class>("classes", {
    asArray: true,
  });

  const students = (studentsData as Student[]) || [];
  const classes = (classesData as Class[]) || [];

  // Get current academic year (default)
  const currentYear = new Date().getFullYear();
  const defaultAcademicYear = `${currentYear}-${String(currentYear + 1).slice(
    -2,
  )}`;

  const form = useForm<EnrollmentFormData>({
    resolver: zodResolver(enrollmentSchema),
    defaultValues: {
      studentId: "",
      classId: "",
      section: "",
      rollNumber: "",
      academicYear: defaultAcademicYear,
      autoAssignRollNumber: true,
    },
  });

  const selectedClassId = form.watch("classId");
  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const autoAssign = form.watch("autoAssignRollNumber");

  // Get available sections for selected class
  const availableSections = selectedClass?.sections || [];

  // Handle auto-assign roll number
  const handleAutoAssignRollNumber = async () => {
    const classId = form.getValues("classId");
    const section = form.getValues("section");

    if (!classId || !section) {
      return;
    }

    try {
      const nextRollNumber = await enrollmentService.getNextRollNumber(
        classId,
        section,
      );
      form.setValue("rollNumber", nextRollNumber);
    } catch (error) {
      console.error("Error getting next roll number:", error);
    }
  };

  // Auto-assign when class or section changes
  const handleClassOrSectionChange = () => {
    if (autoAssign) {
      setTimeout(() => {
        handleAutoAssignRollNumber();
      }, 100);
    }
  };

  const onSubmit = async (data: EnrollmentFormData) => {
    setIsLoading(true);
    try {
      // Validate roll number availability
      const isAvailable = await enrollmentService.validateRollNumber(
        data.classId,
        data.section,
        data.rollNumber,
      );

      if (!isAvailable) {
        toast.error("Roll number already exists in this class and section");
        setIsLoading(false);
        return;
      }

      await enrollmentService.enroll({
        studentId: data.studentId,
        classId: data.classId,
        section: data.section,
        rollNumber: data.rollNumber,
        academicYear: data.academicYear,
      });

      toast.success("Student enrolled successfully");
      router.push(`/${role}/students/enrollment`);
    } catch (error) {
      console.error("Error enrolling student:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to enroll student",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Filter active students
  const activeStudents = students.filter((s) => s.status === "active");

  // Prepare student options for Autocomplete
  const studentOptions = activeStudents.map((student) => ({
    value: student.id,
    label: `${student.fullName} (${student.admissionNumber || "N/A"}) - Roll: ${student.rollNumber || "N/A"}`,
  }));

  // Prepare class options for Autocomplete
  const classOptions = classes
    .filter((c) => c.status === "active")
    .map((classItem) => ({
      value: classItem.id,
      label: `${classItem.name} (${classItem.academicYear})`,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enrollment Details</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="studentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Student *</FormLabel>
                  <FormControl>
                    <Autocomplete
                      options={studentOptions}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Select a student"
                      emptyMessage="No students found"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              name="classId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Class *</FormLabel>
                  <FormControl>
                    <Autocomplete
                      options={classOptions}
                      value={field.value}
                      onChange={(value) => {
                        field.onChange(value);
                        form.setValue("section", "");
                        form.setValue("rollNumber", "");
                        handleClassOrSectionChange();
                      }}
                      placeholder="Select a class"
                      emptyMessage="No classes found"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedClass && (
              <FormField
                control={form.control}
                name="section"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section *</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 flex-wrap">
                        {availableSections.map((section) => {
                          const isSelected = field.value === section;
                          return (
                            <motion.button
                              key={section}
                              type="button"
                              onClick={() => {
                                field.onChange(section);
                                form.setValue("rollNumber", "");
                                handleClassOrSectionChange();
                              }}
                              className={`
                                relative min-w-[60px] px-4 py-3 rounded-lg border-2 transition-all
                                flex items-center justify-center gap-2 font-medium
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
                              <span>{section}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="autoAssignRollNumber"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                          handleAutoAssignRollNumber();
                        }
                      }}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Auto-assign Roll Number</FormLabel>
                    <FormDescription>
                      Automatically assign the next available roll number
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rollNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roll Number *</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter roll number"
                        {...field}
                        disabled={autoAssign}
                      />
                      {!autoAssign && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleAutoAssignRollNumber}
                        >
                          Get Next
                        </Button>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>
                    {autoAssign
                      ? "Roll number will be auto-assigned"
                      : "Enter roll number manually or click 'Get Next' for next available"}
                  </FormDescription>
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
                Enroll Student
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
