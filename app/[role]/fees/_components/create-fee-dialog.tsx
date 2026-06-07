"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { feeService } from "@/lib/services/fee.service";
import type { Class } from "@/lib/types/class.type";
import type { Student } from "@/lib/types/student.type";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookOpen,
  Bus,
  Check,
  ChevronsUpDown,
  FileText,
  HeartHandshake,
  Library,
  Loader2,
  MoreHorizontal,
  Plus,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

const formSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  targetType: z.enum(["all", "class", "student"]),
  targetClassId: z.string().optional(),
  targetSection: z.string().optional(),
  targetStudentId: z.string().optional(),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  category: z.string(),
  otherCategoryName: z.string().optional(),
  dueDate: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateFeeDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: studentsData } = useFirebaseRealtime<Student>("students", {
    asArray: true,
  });
  const { data: classesData } = useFirebaseRealtime<Class>("classes", {
    asArray: true,
  });

  const students = (studentsData as Student[]) || [];
  const classes = (classesData as Class[]) || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      title: "",
      targetType: "all",
      amount: 0,
      category: "tuition",
      otherCategoryName: "",
      dueDate: new Date().toISOString().split("T")[0],
    },
  });

  const targetType = form.watch("targetType");
  const selectedClassId = form.watch("targetClassId");
  const selectedSection = form.watch("targetSection");
  const category = form.watch("category");

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const availableSections = selectedClass?.sections || [];

  const filteredStudents =
    targetType === "student" &&
    selectedClassId &&
    selectedClassId !== "all_classes"
      ? students.filter((s) => s.currentClass === selectedClass?.name)
      : students;

  const selectedClassStudents =
    targetType === "class" && selectedClassId
      ? students.filter((s) => {
          const matchesClass = s.currentClass === selectedClass?.name;
          const matchesSection =
            !selectedSection ||
            selectedSection === "all_sections" ||
            s.currentSection === selectedSection;
          return matchesClass && matchesSection;
        })
      : [];

  const categories = [
    { id: "tuition", label: "Tuition", icon: BookOpen, color: "blue" },
    { id: "transport", label: "Transport", icon: Bus, color: "orange" },
    { id: "library", label: "Library", icon: Library, color: "emerald" },
    { id: "exam", label: "Exam", icon: FileText, color: "rose" },
    {
      id: "donation",
      label: "Donation",
      icon: HeartHandshake,
      color: "purple",
    },
    {
      id: "readmission",
      label: "Readmission",
      icon: Sparkles,
      color: "indigo",
    },
    { id: "punishment", label: "Fine/Punish", icon: ShieldAlert, color: "red" },
    { id: "other", label: "Other", icon: MoreHorizontal, color: "slate" },
  ];

  const getColorClasses = (color: string, isSelected: boolean) => {
    const variants: Record<string, any> = {
      blue: {
        base: "hover:border-blue-400 hover:bg-blue-50/50",
        selected: "border-blue-600 bg-blue-50 text-blue-700 ring-blue-600/20",
        icon: isSelected
          ? "bg-blue-600 text-white"
          : "bg-blue-100 text-blue-600",
      },
      orange: {
        base: "hover:border-orange-400 hover:bg-orange-50/50",
        selected:
          "border-orange-600 bg-orange-50 text-orange-700 ring-orange-600/20",
        icon: isSelected
          ? "bg-orange-600 text-white"
          : "bg-orange-100 text-orange-600",
      },
      emerald: {
        base: "hover:border-emerald-400 hover:bg-emerald-50/50",
        selected:
          "border-emerald-600 bg-emerald-50 text-emerald-700 ring-emerald-600/20",
        icon: isSelected
          ? "bg-emerald-600 text-white"
          : "bg-emerald-100 text-emerald-600",
      },
      rose: {
        base: "hover:border-rose-400 hover:bg-rose-50/50",
        selected: "border-rose-600 bg-rose-50 text-rose-700 ring-rose-600/20",
        icon: isSelected
          ? "bg-rose-600 text-white"
          : "bg-rose-100 text-rose-600",
      },
      purple: {
        base: "hover:border-purple-400 hover:bg-purple-50/50",
        selected:
          "border-purple-600 bg-purple-50 text-purple-700 ring-purple-600/20",
        icon: isSelected
          ? "bg-purple-600 text-white"
          : "bg-purple-100 text-purple-600",
      },
      indigo: {
        base: "hover:border-indigo-400 hover:bg-indigo-50/50",
        selected:
          "border-indigo-600 bg-indigo-50 text-indigo-700 ring-indigo-600/20",
        icon: isSelected
          ? "bg-indigo-600 text-white"
          : "bg-indigo-100 text-indigo-600",
      },
      red: {
        base: "hover:border-red-400 hover:bg-red-50/50",
        selected: "border-red-600 bg-red-50 text-red-700 ring-red-600/20",
        icon: isSelected ? "bg-red-600 text-white" : "bg-red-100 text-red-600",
      },
      slate: {
        base: "hover:border-slate-400 hover:bg-slate-50/50",
        selected:
          "border-slate-600 bg-slate-50 text-slate-700 ring-slate-600/20",
        icon: isSelected
          ? "bg-slate-600 text-white"
          : "bg-slate-100 text-slate-600",
      },
    };
    return variants[color] || variants.slate;
  };

  async function onSubmit(data: FormValues) {
    if (data.targetType === "class" && !data.targetClassId) {
      toast.error("Please select a class");
      return;
    }
    if (data.targetType === "student" && !data.targetStudentId) {
      toast.error("Please select a student");
      return;
    }

    setLoading(true);
    try {
      const finalCategory =
        data.category === "other" && data.otherCategoryName
          ? data.otherCategoryName
          : data.category;

      if (data.targetType === "all") {
        const fees = students.map((student) => ({
          studentId: student.id,
          studentName: student.fullName,
          classId: student.currentClass || "unassigned",
          title: data.title,
          amount: data.amount,
          category: finalCategory as any,
          dueDate: data.dueDate,
        }));
        await feeService.bulkCreateFees(fees);
      } else if (data.targetType === "class") {
        const targetClass = classes.find((c) => c.id === data.targetClassId);
        const classStudents = students.filter((s) => {
          const matchesClass = s.currentClass === targetClass?.name;
          const matchesSection =
            !data.targetSection ||
            data.targetSection === "all_sections" ||
            s.currentSection === data.targetSection;
          return matchesClass && matchesSection;
        });
        if (classStudents.length === 0) {
          toast.error(
            `No students found in ${targetClass?.name}${data.targetSection && data.targetSection !== "all_sections" ? ` Section ${data.targetSection}` : ""}`,
          );
          setLoading(false);
          return;
        }
        const fees = classStudents.map((student) => ({
          studentId: student.id,
          studentName: student.fullName,
          classId: student.currentClass || "unassigned",
          title: data.title,
          amount: data.amount,
          category: finalCategory as any,
          dueDate: data.dueDate,
        }));
        await feeService.bulkCreateFees(fees);
      } else if (data.targetType === "student") {
        const student = students.find((s) => s.id === data.targetStudentId);
        if (student) {
          await feeService.createFeeRecord({
            studentId: student.id,
            studentName: student.fullName,
            classId: student.currentClass || "unassigned",
            title: data.title,
            amount: data.amount,
            category: finalCategory as any,
            dueDate: data.dueDate,
          });
        }
      }
      toast.success("Fee(s) created successfully");
      setOpen(false);
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create fee");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Create Fee
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Create Fee</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit as any)}
            className="space-y-4"
          >
            <FormField
              control={form.control as any}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fee Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Monthly Tuition Fee" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="targetType"
                render={({ field }) => (
                  <FormItem
                    className={cn(
                      targetType === "all" ? "col-span-2" : "col-span-1",
                    )}
                  >
                    <FormLabel>Fee For Whom</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select target" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Students</SelectItem>
                        <SelectItem value="class">Specific Class</SelectItem>
                        <SelectItem value="student">
                          Specific Student
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {targetType === "class" && (
                <FormField
                  control={form.control as any}
                  name="targetClassId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Class</FormLabel>
                      <Select
                        onValueChange={(val) => {
                          field.onChange(val);
                          form.setValue("targetSection", "all_sections");
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {targetType === "class" && selectedClassId && (
                <FormField
                  control={form.control as any}
                  name="targetSection"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Select Section</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="All Sections" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all_sections">
                            All Sections
                          </SelectItem>
                          {availableSections.map((sec) => (
                            <SelectItem key={sec} value={sec}>
                              Section {sec}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {targetType === "student" && (
                <>
                  <FormField
                    control={form.control as any}
                    name="targetClassId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Filter by Class</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="All Classes" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all_classes">
                              All Classes
                            </SelectItem>
                            {classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>
                                {cls.name}
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
                    name="targetStudentId"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Select Student</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                className={cn(
                                  "w-full justify-between font-normal",
                                  !field.value && "text-muted-foreground",
                                )}
                              >
                                {field.value
                                  ? students.find(
                                      (student) => student.id === field.value,
                                    )?.fullName
                                  : "Select student"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[350px] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Search student..." />
                              <CommandList>
                                <CommandEmpty>No student found.</CommandEmpty>
                                <CommandGroup>
                                  {filteredStudents.map((student) => (
                                    <CommandItem
                                      value={`${student.fullName} ${student.admissionNumber} ${student.rollNumber || ""}`}
                                      key={student.id}
                                      onSelect={() => {
                                        form.setValue(
                                          "targetStudentId",
                                          student.id,
                                        );
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          student.id === field.value
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                      {student.fullName} (
                                      {student.admissionNumber}) - Roll:{" "}
                                      {student.rollNumber || "N/A"}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </div>

            {(targetType === "class" || targetType === "student") &&
              selectedClassStudents.length > 0 && (
                <div className="p-3 bg-muted/50 rounded-xl border border-dashed space-y-2">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex justify-between">
                    <span>Students matching criteria</span>
                    <span>({selectedClassStudents.length})</span>
                  </p>
                  <div className="max-h-[100px] overflow-y-auto pr-2 space-y-1 custom-scrollbar">
                    {selectedClassStudents.map((student) => (
                      <div
                        key={student.id}
                        className="flex justify-between items-center text-xs py-1 border-b border-border/50 last:border-0 opacity-80"
                      >
                        <div className="flex flex-col">
                          <span className="font-bold">{student.fullName}</span>
                          {student.currentSection && (
                            <span className="text-[9px] text-muted-foreground">
                              Section: {student.currentSection}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-muted-foreground">
                          {student.admissionNumber}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <FormField
              control={form.control as any}
              name="category"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>Fee Category</FormLabel>
                  <div className="grid grid-cols-4 gap-3">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = field.value === cat.id;
                      const colorClass = getColorClasses(cat.color, isSelected);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => field.onChange(cat.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 gap-2 group relative overflow-hidden",
                            isSelected
                              ? cn(
                                  "shadow-md ring-2 ring-offset-1",
                                  colorClass.selected,
                                )
                              : cn("border-border bg-card", colorClass.base),
                          )}
                        >
                          {isSelected && (
                            <motion.div
                              layoutId="activeCategory"
                              className="absolute inset-0 bg-current opacity-[0.03]"
                              initial={false}
                              transition={{
                                type: "spring",
                                bounce: 0.2,
                                duration: 0.6,
                              }}
                            />
                          )}
                          <div
                            className={cn(
                              "p-2.5 rounded-xl transition-all duration-300 scale-100 group-hover:scale-110",
                              colorClass.icon,
                            )}
                          >
                            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-center">
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <AnimatePresence mode="wait">
              {category === "other" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="col-span-2 overflow-hidden"
                >
                  <FormField
                    control={form.control as any}
                    name="otherCategoryName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Specify Category Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Late Fine, Library Book Loss"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control as any}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control as any}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Fee
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
