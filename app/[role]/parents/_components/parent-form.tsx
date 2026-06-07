"use client";

import { Badge } from "@/components/ui/badge";
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
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { parentService } from "@/lib/services";
import type { Student } from "@/lib/types/student.type";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  ChevronsUpDown,
  Loader2,
  Lock,
  Mail,
  User,
  User2,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  gender: z.enum(["male", "female", "other"] as const, {
    message: "Please select a gender",
  }),
  validChildrenIds: z.array(z.string()),
});

type FormValues = z.infer<typeof formSchema>;

export function ParentForm() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Fetch students for selection
  const { data: studentsData, loading: studentsLoading } =
    useFirebaseRealtime<Student>("students", {
      asArray: true,
    });
  const students = (studentsData as Student[]) || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      gender: "male",
      validChildrenIds: [],
    },
  });

  const selectedChildrenIds = form.watch("validChildrenIds");

  const genderOptions = [
    { id: "male", label: "Male", icon: User, color: "blue" },
    { id: "female", label: "Female", icon: UserCircle, color: "rose" },
    { id: "other", label: "Other", icon: User2, color: "slate" },
  ];

  const getGenderColorClasses = (color: string, isSelected: boolean) => {
    const variants: Record<string, any> = {
      blue: {
        base: "hover:border-blue-400 hover:bg-blue-50/50",
        selected: "border-blue-600 bg-blue-50 text-blue-700 ring-blue-600/20",
        icon: isSelected
          ? "bg-blue-600 text-white"
          : "bg-blue-100 text-blue-600",
      },
      rose: {
        base: "hover:border-rose-400 hover:bg-rose-50/50",
        selected: "border-rose-600 bg-rose-50 text-rose-700 ring-rose-600/20",
        icon: isSelected
          ? "bg-rose-600 text-white"
          : "bg-rose-100 text-rose-600",
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
    setLoading(true);
    try {
      await parentService.create({
        ...data,
      });
      toast.success("Parent created successfully");
      router.push(`/${role}/parents`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create parent",
      );
    } finally {
      setLoading(false);
    }
  }

  const toggleChild = (childId: string) => {
    const current = form.getValues("validChildrenIds");
    const index = current.indexOf(childId);
    if (index === -1) {
      form.setValue("validChildrenIds", [...current, childId]);
    } else {
      form.setValue(
        "validChildrenIds",
        current.filter((id) => id !== childId),
      );
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <FormField
              control={form.control as any}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-muted text-muted-foreground transition-colors group-focus-within:bg-primary/10 group-focus-within:text-primary pointer-events-none">
                        <User className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="John Doe"
                        className="!pl-12 h-11 transition-all focus-visible:ring-primary/20"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-muted text-muted-foreground transition-colors group-focus-within:bg-primary/10 group-focus-within:text-primary pointer-events-none">
                        <Mail className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="john@example.com"
                        type="email"
                        className="!pl-12 h-11 transition-all focus-visible:ring-primary/20"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control as any}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-muted text-muted-foreground transition-colors group-focus-within:bg-primary/10 group-focus-within:text-primary pointer-events-none">
                        <Lock className="h-4 w-4" />
                      </div>
                      <Input
                        placeholder="••••••••"
                        type="password"
                        className="!pl-12 h-11 transition-all focus-visible:ring-primary/20"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control as any}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gender</FormLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {genderOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = field.value === opt.id;
                      const colorClass = getGenderColorClasses(
                        opt.color,
                        isSelected,
                      );
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => field.onChange(opt.id)}
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
                              layoutId="activeGender"
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
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-center">
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Linked Children Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Link Children</h3>
            <FormField
              control={form.control as any}
              name="validChildrenIds"
              render={() => (
                <FormItem>
                  <FormLabel>Select Students</FormLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-11 !pl-12 relative group hover:border-primary/50 transition-all font-normal text-left"
                      >
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary pointer-events-none">
                          <Users className="h-4 w-4" />
                        </div>
                        <span className="truncate">
                          {selectedChildrenIds.length > 0
                            ? `${selectedChildrenIds.length} children selected`
                            : "Select children..."}
                        </span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[300px] p-0 sm:w-[400px]"
                      align="start"
                    >
                      <Command>
                        <CommandInput placeholder="Search by name or admission no..." />
                        <CommandList>
                          {studentsLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              <Loader2 className="mx-auto h-4 w-4 animate-spin mb-2" />
                              Loading students...
                            </div>
                          ) : (
                            <>
                              <CommandEmpty>No student found.</CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-auto">
                                {students.map((student) => (
                                  <CommandItem
                                    key={student.id}
                                    value={`${student.fullName} ${student.admissionNumber} ${student.rollNumber || ""}`}
                                    onSelect={() => toggleChild(student.id)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        selectedChildrenIds.includes(student.id)
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span>{student.fullName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        Admin No: {student.admissionNumber} •
                                        Roll: {student.rollNumber || "N/A"}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Selected Children Chips */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {selectedChildrenIds.map((childId) => {
                      const child = students.find((s) => s.id === childId);
                      return child ? (
                        <Badge
                          key={childId}
                          variant="secondary"
                          className="pl-2 pr-1 py-1"
                        >
                          {child.fullName}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0 ml-2 hover:bg-transparent text-muted-foreground hover:text-foreground"
                            onClick={() => toggleChild(child.id)}
                          >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Parent Account
          </Button>
        </div>
      </form>
    </Form>
  );
}
