"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Briefcase,
  Check,
  ChevronLeft,
  Eye,
  EyeOff,
  Info,
  Lock,
  Mail,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Autocomplete } from "@/components/core/autocomplete";
import { MultiSelectAutocomplete } from "@/components/core/multi-select-autocomplete";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { staffService, subjectService } from "@/lib/services";
import type { Class } from "@/lib/types/class.type";
import type { Subject, SubjectStatus } from "@/lib/types/subject.type";
import type { StaffSubjectAssignment, User } from "@/lib/types/user.type";

const staffSchema = z
  .object({
    name: z.string().min(2, "Staff name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    phoneNumber: z.string().optional(),
    gender: z.enum(["male", "female", "other"]),
    staffPosition: z.string().min(2, "Position must be at least 2 characters"),
    staffType: z.enum(["teaching", "non-teaching"]),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type StaffFormData = z.infer<typeof staffSchema>;

interface SubjectDraftForm {
  localId: string;
  name: string;
  code: string;
  description: string;
  // Assignment scope for this newly created subject
  classId: string;
  section: string;
  academicYear: string;
  status: SubjectStatus;
  order: string;
}

interface SubjectAssignmentDraft {
  localId: string;
  classId: string;
  sections: string[];
  academicYear: string;
}

const subjectStatusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
] as const;

function getDefaultAcademicYear(): string {
  const currentYear = new Date().getFullYear();
  return `${currentYear}-${String(currentYear + 1).slice(-2)}`;
}

function createEmptySubjectDraft(academicYear: string): SubjectDraftForm {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: "",
    code: "",
    description: "",
    classId: "",
    section: "",
    academicYear,
    status: "active",
    order: "",
  };
}

function createEmptySubjectAssignmentDraft(
  academicYear: string,
): SubjectAssignmentDraft {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    classId: "",
    sections: [],
    academicYear,
  };
}

function getErrorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    return String((error as { code: unknown }).code);
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "";
}

export function StaffForm() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const defaultAcademicYear = useMemo(getDefaultAcademicYear, []);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<string[]>([]);
  const [subjectAssignmentsById, setSubjectAssignmentsById] = useState<
    Record<string, SubjectAssignmentDraft[]>
  >({});
  const [newSubjects, setNewSubjects] = useState<SubjectDraftForm[]>([]);

  const { data: classesData, loading: classesLoading } =
    useFirebaseRealtime<Class>("classes", {
      asArray: true,
    });
  const { data: subjectsData, loading: subjectsLoading } =
    useFirebaseRealtime<Subject>("subjects", {
      asArray: true,
    });

  const { data: allUsersData, loading: usersLoading } =
    useFirebaseRealtime<User>("users", {
      asArray: true,
      filter: (u) => u.role === "staff" && u.status === "active",
    });
    
  const allStaffs = (allUsersData as User[]) || [];

  const classes = (classesData as Class[]) || [];
  const subjects = (subjectsData as Subject[]) || [];

  const classById = useMemo(
    () => new Map(classes.map((classItem) => [classItem.id, classItem])),
    [classes],
  );
  const subjectById = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject])),
    [subjects],
  );

  // Map to track which sections are already assigned globally
  // Key format: `${subjectId}:${academicYear}:${classId}:${section}` => teacherName
  const globallyAssignedSectionsMap = useMemo(() => {
    const map = new Map<string, string>();
    allStaffs.forEach((staffMember) => {
      if (staffMember.subjectAssignments) {
        staffMember.subjectAssignments.forEach((assignment: any) => {
          if (
            assignment.subjectId &&
            assignment.academicYear &&
            assignment.classId &&
            assignment.section
          ) {
            const key = `${assignment.subjectId}:${assignment.academicYear}:${assignment.classId}:${assignment.section}`;
            map.set(key, staffMember.name || "Unknown Staff");
          }
        });
      }
    });
    return map;
  }, [allStaffs]);

  const academicYearOptions = useMemo(
    () =>
      Array.from(
        new Set(classes.map((classItem) => classItem.academicYear)),
      ).map((academicYear) => ({
        value: academicYear,
        label: academicYear,
      })),
    [classes],
  );

  const subjectOptions = useMemo(
    () =>
      subjects.map((subject) => {
        return {
          value: subject.id,
          label: subject.code
            ? `${subject.name} (${subject.code})`
            : subject.name,
        };
      }),
    [subjects],
  );

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      gender: "male",
      staffPosition: "",
      staffType: "teaching",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const getClassOptionsByAcademicYear = (academicYear: string) =>
    classes
      .filter((classItem) => classItem.academicYear === academicYear)
      .map((classItem) => ({
        value: classItem.id,
        label: classItem.name,
      }));

  const syncAssignedSubjects = (nextSubjectIds: string[]) => {
    setAssignedSubjectIds(nextSubjectIds);
    setSubjectAssignmentsById((prev) => {
      const fallbackAcademicYear =
        academicYearOptions[0]?.value || defaultAcademicYear;
      const next: Record<string, SubjectAssignmentDraft[]> = {};

      nextSubjectIds.forEach((subjectId) => {
        const existingRows = prev[subjectId] || [];
        next[subjectId] =
          existingRows.length > 0
            ? existingRows
            : [createEmptySubjectAssignmentDraft(fallbackAcademicYear)];
      });

      return next;
    });
  };

  const updateAssignedSubjectDraft = (
    subjectId: string,
    localId: string,
    updates: Partial<SubjectAssignmentDraft>,
  ) => {
    setSubjectAssignmentsById((prev) => {
      const fallbackAcademicYear =
        academicYearOptions[0]?.value || defaultAcademicYear;
      const currentRows = prev[subjectId] || [
        createEmptySubjectAssignmentDraft(fallbackAcademicYear),
      ];

      return {
        ...prev,
        [subjectId]: currentRows.map((row) =>
          row.localId === localId ? { ...row, ...updates } : row,
        ),
      };
    });
  };

  const addAssignedSubjectDraftRow = (subjectId: string) => {
    setSubjectAssignmentsById((prev) => {
      const fallbackAcademicYear =
        academicYearOptions[0]?.value || defaultAcademicYear;
      const currentRows = prev[subjectId] || [];

      return {
        ...prev,
        [subjectId]: [
          ...currentRows,
          createEmptySubjectAssignmentDraft(fallbackAcademicYear),
        ],
      };
    });
  };

  const removeAssignedSubjectDraftRow = (
    subjectId: string,
    localId: string,
  ) => {
    setSubjectAssignmentsById((prev) => {
      const currentRows = prev[subjectId] || [];
      if (currentRows.length <= 1) {
        return prev;
      }

      return {
        ...prev,
        [subjectId]: currentRows.filter((row) => row.localId !== localId),
      };
    });
  };

  const addNewSubject = () => {
    setNewSubjects((prev) => [
      ...prev,
      createEmptySubjectDraft(defaultAcademicYear),
    ]);
  };

  const removeNewSubject = (localId: string) => {
    setNewSubjects((prev) =>
      prev.filter((subject) => subject.localId !== localId),
    );
  };

  const updateNewSubjectField = <
    K extends keyof Omit<SubjectDraftForm, "localId">,
  >(
    localId: string,
    field: K,
    value: SubjectDraftForm[K],
  ) => {
    setNewSubjects((prev) =>
      prev.map((subject) =>
        subject.localId === localId ? { ...subject, [field]: value } : subject,
      ),
    );
  };

  const validateNewSubjects = (): boolean => {
    for (const [index, subject] of newSubjects.entries()) {
      if (!subject.name.trim()) {
        toast.error(`Subject ${index + 1}: Subject name is required.`);
        return false;
      }

      if (!subject.academicYear.trim()) {
        toast.error(`Subject ${index + 1}: Academic year is required.`);
        return false;
      }

      if (!subject.classId) {
        toast.error(`Subject ${index + 1}: Class is required.`);
        return false;
      }

      if (!subject.section.trim()) {
        toast.error(`Subject ${index + 1}: Section is required.`);
        return false;
      }
      if (subject.order.trim() && Number.isNaN(Number(subject.order))) {
        toast.error(`Subject ${index + 1}: Order must be a valid number.`);
        return false;
      }
    }

    return true;
  };

  const getValidatedAssignedSubjects = (): StaffSubjectAssignment[] | null => {
    const uniqueAssignedSubjectIds = Array.from(new Set(assignedSubjectIds));
    const assignments: StaffSubjectAssignment[] = [];

    for (const subjectId of uniqueAssignedSubjectIds) {
      const subject = subjectById.get(subjectId);
      const subjectLabel = subject?.name || "Selected subject";
      const assignmentRows = subjectAssignmentsById[subjectId] || [];
      const seenRows = new Set<string>();

      if (assignmentRows.length === 0) {
        toast.error(`${subjectLabel}: Add at least one class-section mapping.`);
        return null;
      }

      for (const [index, assignment] of assignmentRows.entries()) {
        const rowLabel = `${subjectLabel} (Mapping ${index + 1})`;

        if (!assignment.academicYear.trim()) {
          toast.error(`${rowLabel}: Academic year is required.`);
          return null;
        }

        if (!assignment.classId) {
          toast.error(`${rowLabel}: Class is required.`);
          return null;
        }

        const selectedClass = classById.get(assignment.classId);
        if (!selectedClass) {
          toast.error(`${rowLabel}: Please select a valid class.`);
          return null;
        }

        if (selectedClass.academicYear !== assignment.academicYear) {
          toast.error(
            `${rowLabel}: Selected class does not belong to selected academic year.`,
          );
          return null;
        }

        if (!assignment.sections || assignment.sections.length === 0) {
          toast.error(`${rowLabel}: At least one section must be selected.`);
          return null;
        }
        
        for (const section of assignment.sections) {
          const normalizedSection = section.trim();

          if (!selectedClass.sections.includes(normalizedSection)) {
            toast.error(`${rowLabel}: Please select a valid section.`);
            return null;
          }

          const assignmentKey = `${subjectId}:${assignment.classId}:${normalizedSection}:${assignment.academicYear.trim()}`;
          if (seenRows.has(assignmentKey)) {
            toast.error(`${rowLabel}: Duplicate class-section mapping detected: ${normalizedSection}.`);
            return null;
          }
          seenRows.add(assignmentKey);

          assignments.push({
            subjectId,
            classId: assignment.classId,
            section: normalizedSection,
            academicYear: assignment.academicYear.trim(),
          });
        }
      }
    }

    return assignments;
  };

  const onSubmit = async (data: StaffFormData) => {
    setFormError(null);

    if (!validateNewSubjects()) {
      return;
    }

    setIsLoading(true);
    try {
      const existingAssignments = getValidatedAssignedSubjects();
      if (!existingAssignments) {
        setIsLoading(false);
        return;
      }

      const { userId } = await staffService.create({
        name: data.name,
        email: data.email,
        phoneNumber: data.phoneNumber,
        password: data.password,
        role: "staff",
        gender: data.gender,
        position: data.staffPosition,
        staffType: data.staffType,
        subjectAssignments: existingAssignments,
      });

      const createSubjectResults = await Promise.allSettled(
        newSubjects.map((subject) =>
          subjectService.create({
            name: subject.name.trim(),
            code: subject.code.trim() || undefined,
            description: subject.description.trim() || undefined,
            status: subject.status,
            order: subject.order.trim() ? Number(subject.order) : undefined,
          }),
        ),
      );

      if (createSubjectResults.length > 0) {
        const failedSubjectTaskCount = createSubjectResults.filter(
          (result) => result.status === "rejected",
        ).length;
        const createdAssignments: StaffSubjectAssignment[] =
          createSubjectResults.flatMap((result, index) => {
            if (result.status !== "fulfilled") {
              return [];
            }

            const subjectDraft = newSubjects[index];
            return [
              {
                subjectId: result.value,
                classId: subjectDraft.classId,
                section: subjectDraft.section.trim(),
                academicYear: subjectDraft.academicYear.trim(),
              },
            ];
          });

        if (createdAssignments.length > 0) {
          const mergedAssignments = Array.from(
            new Map(
              [...existingAssignments, ...createdAssignments].map(
                (assignment) => [
                  `${assignment.subjectId}:${assignment.classId}:${assignment.section}:${assignment.academicYear}`,
                  assignment,
                ],
              ),
            ).values(),
          );
          await staffService.update(userId, {
            subjectAssignments: mergedAssignments,
          });
        }

        if (failedSubjectTaskCount > 0) {
          toast.warning(
            `${failedSubjectTaskCount} subject operation(s) failed. You can manage these from the Subjects page.`,
          );
        }
      }

      setShowSuccess(true);
      toast.success("Staff profile created successfully.");

      setTimeout(() => {
        setShowSuccess(false);
        router.push(`/${role}/staffs`);
      }, 2000);
    } catch (error: unknown) {
      console.error("Error creating staff:", error);

      const errorCode = getErrorCode(error);

      // Handle Firebase specific Auth errors
      if (errorCode.includes("email-already-in-use")) {
        form.setError("email", {
          message: "This email is already registered.",
        });
      } else if (errorCode.includes("invalid-email")) {
        form.setError("email", { message: "Please provide a valid email." });
      } else if (errorCode.includes("weak-password")) {
        form.setError("password", {
          message: "Password is too weak. Use at least 6-8 characters.",
        });
      } else if (errorCode.includes("network-request-failed")) {
        setFormError(
          "Connection failed. Please check your internet and try again.",
        );
      } else {
        setFormError(
          "Failed to create staff record. Please verify all details and try again.",
        );
      }

      toast.error("Form submission failed. Please check for errors.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black font-sans selection:bg-primary/10">
      <div className="max-w-3xl mx-auto px-6 pt-12 pb-24">
        {/* Simple Navigation */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${role}/staffs`)}
          className="mb-8 group text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Staffs
        </Button>

        {/* Minimal Header */}
        <header className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-1"
          >
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Add New Staff
            </h1>
            <p className="text-sm text-muted-foreground">
              Create a personnel profile and configure access credentials.
            </p>
          </motion.div>
        </header>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {formError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="overflow-hidden"
              >
                <Alert
                  variant="destructive"
                  className="rounded-xl border-destructive/20 bg-destructive/5"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle className="font-bold">
                    Registration Error
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    {formError}
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}

            {/* Profile Section */}
            <div className="space-y-5">
              <SectionHeader
                title="Personal Information"
                description="Core identity and contact details."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <InputGroup className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus-within:ring-2 ring-primary/10">
                          <InputGroupAddon>
                            <UserIcon className="h-4 w-4 text-zinc-400" />
                          </InputGroupAddon>
                          <InputGroupInput
                            placeholder="John Doe"
                            {...field}
                            className="text-sm"
                          />
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <InputGroup className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus-within:ring-2 ring-primary/10">
                          <InputGroupAddon>
                            <Mail className="h-4 w-4 text-zinc-400" />
                          </InputGroupAddon>
                          <InputGroupInput
                            placeholder="john@example.com"
                            {...field}
                            className="text-sm"
                          />
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex justify-between">
                        Phone Number
                        <span className="font-normal lowercase opacity-60">
                          Optional
                        </span>
                      </FormLabel>
                      <FormControl>
                        <InputGroup className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus-within:ring-2 ring-primary/10">
                          <InputGroupAddon>
                            <Phone className="h-4 w-4 text-zinc-400" />
                          </InputGroupAddon>
                          <InputGroupInput
                            type="tel"
                            placeholder="+1 (555) 000-0000"
                            {...field}
                            className="text-sm"
                          />
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Gender
                      </FormLabel>
                      <FormControl>
                        <Tabs
                          value={field.value}
                          onValueChange={field.onChange}
                          className="w-full"
                        >
                          <TabsList className="h-10 w-full p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                            {["male", "female", "other"].map((v) => (
                              <TabsTrigger
                                key={v}
                                value={v}
                                className="flex-1 h-full rounded-md text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-primary transition-all"
                              >
                                {v}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Role Section */}
            <div className="space-y-5">
              <SectionHeader
                title="Institutional Role"
                description="Professional designation and staff category."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormField
                  control={form.control}
                  name="staffPosition"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Designation
                      </FormLabel>
                      <FormControl>
                        <InputGroup className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus-within:ring-2 ring-primary/10">
                          <InputGroupAddon>
                            <Briefcase className="h-4 w-4 text-zinc-400" />
                          </InputGroupAddon>
                          <InputGroupInput
                            placeholder="e.g., Senior Teacher"
                            {...field}
                            className="text-sm"
                          />
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="staffType"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Category
                      </FormLabel>
                      <FormControl>
                        <Tabs
                          value={field.value}
                          onValueChange={field.onChange}
                          className="w-full"
                        >
                          <TabsList className="h-10 w-full p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg">
                            <TabsTrigger
                              value="teaching"
                              className="flex-1 h-full rounded-md text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-primary transition-all"
                            >
                              Teaching
                            </TabsTrigger>
                            <TabsTrigger
                              value="non-teaching"
                              className="flex-1 h-full rounded-md text-[10px] font-bold uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-700 data-[state=active]:text-primary transition-all"
                            >
                              Support
                            </TabsTrigger>
                          </TabsList>
                        </Tabs>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Subject Section */}
            <div className="space-y-5">
              <SectionHeader
                title="Subject Assignment"
                description="Assign each subject to one or more class-section combinations."
              />

              <div className="space-y-4 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 sm:p-5 bg-white/70 dark:bg-zinc-900/50">
                <div className="space-y-2">
                  <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Assign Subjects
                  </FormLabel>
                  <MultiSelectAutocomplete
                    options={subjectOptions}
                    value={assignedSubjectIds}
                    onChange={syncAssignedSubjects}
                    placeholder={
                      subjectsLoading
                        ? "Loading subjects..."
                        : "Select subjects to assign"
                    }
                    emptyMessage="No subjects available"
                    disabled={
                      subjectsLoading || subjects.length === 0 || isLoading
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    After selecting subjects, add one or more class-section
                    mappings for each subject.
                  </p>
                </div>

                {assignedSubjectIds.length > 0 && (
                  <div className="space-y-6">
                    {assignedSubjectIds.map((subjectId, index) => {
                      const subject = subjectById.get(subjectId);
                      const assignmentRows =
                        subjectAssignmentsById[subjectId] || [];

                      return (
                        <div
                          key={subjectId}
                          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                                {index + 1}. {subject?.name || "Selected Subject"}
                              </h4>
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ml-2">
                                CODE: {subject?.code || "N/A"} | {assignmentRows.length} CLASS ASSIGNMENT{assignmentRows.length === 1 ? "" : "S"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 px-4 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-800 font-semibold rounded-lg"
                                onClick={() => router.push(`/${role}/subjects/${subjectId}/edit`)}
                              >
                                <BookOpen className="mr-2 h-4 w-4" />
                                Edit Subject
                              </Button>
                              <Button
                                type="button"
                                className="h-9 px-4 bg-red-800 hover:bg-red-900 text-white font-semibold rounded-lg"
                                onClick={() =>
                                  addAssignedSubjectDraftRow(subjectId)
                                }
                                disabled={isLoading || assignmentRows.length >= classes.length}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Class
                              </Button>
                            </div>
                          </div>

                          <div className="p-0">
                            <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-zinc-50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-900/50">
                              <div className="col-span-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                ACADEMIC YEAR
                              </div>
                              <div className="col-span-8 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                ASSIGNED CLASSES & SECTIONS
                              </div>
                              <div className="col-span-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider text-right">
                                ACTIONS
                              </div>
                            </div>
                            
                            <div className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
                              {assignmentRows.map((assignment, mappingIndex) => {
                                const classOptionsForYear =
                                  getClassOptionsByAcademicYear(
                                    assignment.academicYear,
                                  ).map((option) => {
                                    const isAlreadySelected = assignmentRows.some(
                                      (row) =>
                                        row.academicYear === assignment.academicYear &&
                                        row.classId === option.value &&
                                        row.localId !== assignment.localId
                                    );
                                    return {
                                      ...option,
                                      disabled: isAlreadySelected,
                                    };
                                  });
                                const selectedClass =
                                  classById.get(assignment.classId) || null;
                                const sectionOptions = (
                                  selectedClass?.sections || []
                                ).map((section) => {
                                  const assignmentKey = `${subjectId}:${assignment.academicYear}:${assignment.classId}:${section}`;
                                  const takenBy = globallyAssignedSectionsMap.get(assignmentKey);
                                  
                                  return {
                                    value: section,
                                    label: section,
                                    disabled: !!takenBy,
                                    subLabel: takenBy ? `Assigned to ${takenBy}` : undefined,
                                  };
                                });

                                return (
                                  <div
                                    key={`${subjectId}-${assignment.localId}`}
                                    className="grid grid-cols-12 gap-6 px-6 py-5 items-center hover:bg-zinc-50/30 dark:hover:bg-zinc-800/30 transition-colors"
                                  >
                                    <div className="col-span-3">
                                      <Autocomplete
                                        options={academicYearOptions}
                                        value={assignment.academicYear}
                                        onChange={(value) =>
                                          updateAssignedSubjectDraft(
                                            subjectId,
                                            assignment.localId,
                                            {
                                              academicYear: value,
                                              classId: "",
                                              sections: [],
                                            },
                                          )
                                        }
                                        placeholder="Select year"
                                        emptyMessage="No years"
                                        disabled={
                                          isLoading ||
                                          academicYearOptions.length === 0
                                        }
                                      />
                                    </div>
                                    <div className="col-span-8 flex items-start gap-4">
                                      <div className="w-[180px] shrink-0 pt-1">
                                        <Autocomplete
                                          options={classOptionsForYear}
                                          value={assignment.classId}
                                          onChange={(value) => {
                                            const selectedYearClass =
                                              classById.get(value) || null;
                                            updateAssignedSubjectDraft(
                                              subjectId,
                                              assignment.localId,
                                              {
                                                classId: value,
                                                sections: [],
                                                academicYear:
                                                  selectedYearClass?.academicYear ||
                                                  assignment.academicYear,
                                              },
                                            );
                                          }}
                                          placeholder="Select class"
                                          emptyMessage="No classes available"
                                          disabled={
                                            isLoading ||
                                            classOptionsForYear.length === 0
                                          }
                                        />
                                      </div>
                                      
                                      <div className="flex-grow pt-1 min-w-0">
                                        <MultiSelectAutocomplete
                                          options={sectionOptions}
                                          value={assignment.sections}
                                          onChange={(value) =>
                                            updateAssignedSubjectDraft(
                                              subjectId,
                                              assignment.localId,
                                              {
                                                sections: value,
                                              },
                                            )
                                          }
                                          placeholder="+ Add Section"
                                          emptyMessage="No sections available"
                                          disabled={
                                            isLoading ||
                                            !assignment.classId ||
                                            sectionOptions.length === 0
                                          }
                                        />
                                      </div>
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-8 p-0 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                        onClick={() =>
                                          removeAssignedSubjectDraftRow(
                                            subjectId,
                                            assignment.localId,
                                          )
                                        }
                                        disabled={
                                          isLoading || assignmentRows.length <= 1
                                        }
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <BookOpen className="h-3.5 w-3.5" />
                      Add New Subjects
                    </FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNewSubject}
                      disabled={
                        classesLoading || classes.length === 0 || isLoading
                      }
                      className="h-8"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Subject
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Subject fields match the Subject Create/Edit page.
                    Assignment is configured separately below for each new
                    subject.
                  </p>

                  {classesLoading ? (
                    <div className="text-xs text-muted-foreground">
                      Loading classes and academic years...
                    </div>
                  ) : newSubjects.length === 0 ? (
                    <div className="text-xs text-muted-foreground rounded-md border border-dashed p-3">
                      No new subjects added yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {newSubjects.map((subject, index) => (
                        <div
                          key={subject.localId}
                          className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-background"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-semibold">
                              Subject {index + 1}
                            </h4>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-red-600 hover:text-red-700"
                              onClick={() => removeNewSubject(subject.localId)}
                              disabled={isLoading}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
                              Remove
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <FormLabel className="text-xs">
                                Subject Name *
                              </FormLabel>
                              <Input
                                value={subject.name}
                                onChange={(event) =>
                                  updateNewSubjectField(
                                    subject.localId,
                                    "name",
                                    event.target.value,
                                  )
                                }
                                placeholder="e.g., Mathematics"
                                disabled={isLoading}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <FormLabel className="text-xs">
                                Subject Code
                              </FormLabel>
                              <Input
                                value={subject.code}
                                onChange={(event) =>
                                  updateNewSubjectField(
                                    subject.localId,
                                    "code",
                                    event.target.value,
                                  )
                                }
                                placeholder="e.g., MATH"
                                disabled={isLoading}
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <FormLabel className="text-xs">
                              Description
                            </FormLabel>
                            <Textarea
                              value={subject.description}
                              onChange={(event) =>
                                updateNewSubjectField(
                                  subject.localId,
                                  "description",
                                  event.target.value,
                                )
                              }
                              placeholder="Optional description"
                              disabled={isLoading}
                            />
                          </div>

                          <div className="space-y-2 rounded-md border border-dashed p-3">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                              Assignment Scope
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <FormLabel className="text-xs">
                                  Academic Year *
                                </FormLabel>
                                <Autocomplete
                                  options={academicYearOptions}
                                  value={subject.academicYear}
                                  onChange={(value) =>
                                    updateNewSubjectField(
                                      subject.localId,
                                      "academicYear",
                                      value,
                                    )
                                  }
                                  placeholder="Select academic year"
                                  emptyMessage="No academic years available"
                                  disabled={
                                    isLoading ||
                                    academicYearOptions.length === 0
                                  }
                                />
                              </div>

                              <div className="space-y-1.5">
                                <FormLabel className="text-xs">
                                  Class *
                                </FormLabel>
                                <Autocomplete
                                  options={getClassOptionsByAcademicYear(
                                    subject.academicYear,
                                  )}
                                  value={subject.classId}
                                  onChange={(value) => {
                                    const selectedClass =
                                      classById.get(value) || null;
                                    updateNewSubjectField(
                                      subject.localId,
                                      "classId",
                                      value,
                                    );
                                    updateNewSubjectField(
                                      subject.localId,
                                      "section",
                                      "",
                                    );
                                    if (selectedClass) {
                                      updateNewSubjectField(
                                        subject.localId,
                                        "academicYear",
                                        selectedClass.academicYear,
                                      );
                                    }
                                  }}
                                  placeholder="Select class"
                                  emptyMessage="No classes available"
                                  disabled={
                                    isLoading ||
                                    getClassOptionsByAcademicYear(
                                      subject.academicYear,
                                    ).length === 0
                                  }
                                />
                              </div>

                              <div className="space-y-1.5">
                                <FormLabel className="text-xs">
                                  Section *
                                </FormLabel>
                                <Autocomplete
                                  options={(
                                    classById.get(subject.classId)?.sections ||
                                    []
                                  ).map((section) => ({
                                    value: section,
                                    label: section,
                                  }))}
                                  value={subject.section}
                                  onChange={(value) =>
                                    updateNewSubjectField(
                                      subject.localId,
                                      "section",
                                      value,
                                    )
                                  }
                                  placeholder="Select section"
                                  emptyMessage="No sections available"
                                  disabled={
                                    isLoading ||
                                    !subject.classId ||
                                    (
                                      classById.get(subject.classId)
                                        ?.sections || []
                                    ).length === 0
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <FormLabel className="text-xs">
                                Order (Optional)
                              </FormLabel>
                              <Input
                                type="number"
                                value={subject.order}
                                onChange={(event) =>
                                  updateNewSubjectField(
                                    subject.localId,
                                    "order",
                                    event.target.value,
                                  )
                                }
                                placeholder="For sorting"
                                disabled={isLoading}
                              />
                            </div>

                            <div className="space-y-1.5">
                              <FormLabel className="text-xs">Status</FormLabel>
                              <div className="flex gap-2">
                                {subjectStatusOptions.map(
                                  ({ value, label }) => {
                                    const isSelected = subject.status === value;
                                    return (
                                      <Button
                                        key={value}
                                        type="button"
                                        variant={
                                          isSelected ? "default" : "outline"
                                        }
                                        className="flex-1"
                                        onClick={() =>
                                          updateNewSubjectField(
                                            subject.localId,
                                            "status",
                                            value,
                                          )
                                        }
                                        disabled={isLoading}
                                      >
                                        {isSelected && (
                                          <Check className="mr-1.5 h-3.5 w-3.5" />
                                        )}
                                        {label}
                                      </Button>
                                    );
                                  },
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Security Section */}
            <div className="space-y-5">
              <SectionHeader
                title="Authentication"
                description="Secure access credentials for the portal."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Password
                      </FormLabel>
                      <FormControl>
                        <InputGroup className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus-within:ring-2 ring-primary/10">
                          <InputGroupAddon>
                            <Lock className="h-4 w-4 text-zinc-400" />
                          </InputGroupAddon>
                          <InputGroupInput
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground"
                            >
                              {showPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Confirm Password
                      </FormLabel>
                      <FormControl>
                        <InputGroup className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl transition-all focus-within:ring-2 ring-primary/10">
                          <InputGroupAddon>
                            <ShieldCheck className="h-4 w-4 text-zinc-400" />
                          </InputGroupAddon>
                          <InputGroupInput
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                            className="text-sm"
                          />
                          <InputGroupAddon align="inline-end">
                            <InputGroupButton
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              variant="ghost"
                              className="h-8 w-8 p-0 text-muted-foreground"
                            >
                              {showConfirmPassword ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </InputGroupButton>
                          </InputGroupAddon>
                        </InputGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 flex gap-3">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
                  Information: Staff will be required to change their password
                  upon first login for security.
                </p>
              </div>
            </div>

            {/* Form Footer */}
            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/${role}/staffs`)}
                className="h-11 px-6 rounded-xl font-semibold text-sm transition-all"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="h-11 px-8 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full"
                    />
                    Saving...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create Staff Record <ArrowRight className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-sm p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-zinc-900 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl border border-zinc-200 dark:border-zinc-800"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-6">
                <UserPlus className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Staff Created</h2>
              <p className="text-muted-foreground text-sm">
                The staff profile has been successfully added to the system.
                Redirecting you shortly...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-lg font-bold tracking-tight">{title}</h3>
      <p className="text-muted-foreground text-xs font-medium">{description}</p>
    </div>
  );
}
