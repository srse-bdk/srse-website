"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  BookOpen,
  Briefcase,
  Check,
  Mail,
  Phone,
  Plus,
  Save,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Autocomplete } from "@/components/core/autocomplete";
import { BloodGroupFormField } from "@/components/core/blood-group-form-field";
import { MultiSelectAutocomplete } from "@/components/core/multi-select-autocomplete";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { staffService, subjectService } from "@/lib/services";
import type { Class } from "@/lib/types/class.type";
import type { Subject, SubjectStatus } from "@/lib/types/subject.type";
import type {
  StaffSubjectAssignment,
  User,
  UserUpdateInput,
} from "@/lib/types/user.type";

const editStaffSchema = z.object({
  name: z.string().trim().min(2, "Staff name must be at least 2 characters"),
  phoneNumber: z.string().trim().optional(),
  gender: z.enum(["male", "female", "other"]),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional(),
  position: z.string().trim().min(2, "Position must be at least 2 characters"),
  staffType: z.enum(["teaching", "non-teaching"]),
  status: z.enum(["active", "inactive", "pending"]),
});

type EditStaffFormData = z.infer<typeof editStaffSchema>;

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

export function StaffEditForm() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const staffId = params.id as string;

  const [isSaving, setIsSaving] = useState(false);
  const defaultAcademicYear = useMemo(getDefaultAcademicYear, []);
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<string[]>([]);
  const [subjectAssignmentsById, setSubjectAssignmentsById] = useState<
    Record<string, SubjectAssignmentDraft[]>
  >({});
  const [newSubjects, setNewSubjects] = useState<SubjectDraftForm[]>([]);

  const { data, loading, error } = useFirebaseRealtime<User>(
    `users/${staffId}`,
    {
      asArray: false,
    },
  );

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

  const staff = data as User | null;
  const classes = (classesData as Class[]) || [];
  const allSubjects = (subjectsData as Subject[]) || [];

  const classById = useMemo(
    () => new Map(classes.map((classItem) => [classItem.id, classItem])),
    [classes],
  );
  const subjectById = useMemo(
    () => new Map(allSubjects.map((subject) => [subject.id, subject])),
    [allSubjects],
  );

  // Map to track which sections are already assigned globally
  // Key format: `${subjectId}:${academicYear}:${classId}:${section}` => teacherName
  const globallyAssignedSectionsMap = useMemo(() => {
    const map = new Map<string, string>();
    allStaffs.forEach((staffMember) => {
      // If we are in edit mode, don't count the current staff member's own assignments as "taken" by someone else
      // (We use `staffId` available in the edit component scope, if undefined in create mode it just evaluates to undefined !== staffMember.id which is safe)
      const currentEditingId = staffId;
      if (currentEditingId && staffMember.id === currentEditingId) return;

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
  }, [allStaffs, staffId]);
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

  const normalizedStaffAssignments = useMemo<StaffSubjectAssignment[]>(() => {
    if (staff?.subjectAssignments?.length) {
      return staff.subjectAssignments.filter(
        (assignment) =>
          Boolean(assignment.subjectId) &&
          Boolean(assignment.classId) &&
          Boolean(assignment.section) &&
          Boolean(assignment.academicYear),
      );
    }

    // Backward compatibility for old data where subjects carried assignment context.
    return allSubjects
      .filter(
        (subject) =>
          subject.staffId === staffId &&
          Boolean(subject.classId) &&
          Boolean(subject.section) &&
          Boolean(subject.academicYear),
      )
      .map((subject) => ({
        subjectId: subject.id,
        classId: subject.classId as string,
        section: subject.section as string,
        academicYear: subject.academicYear as string,
      }));
  }, [staff, allSubjects, staffId]);

  const subjectOptions = useMemo(
    () =>
      allSubjects.map((subject) => ({
        value: subject.id,
        label: subject.code
          ? `${subject.name} (${subject.code})`
          : subject.name,
      })),
    [allSubjects],
  );

  const form = useForm<EditStaffFormData>({
    resolver: zodResolver(editStaffSchema),
    defaultValues: {
      name: "",
      phoneNumber: "",
      gender: "other",
      bloodGroup: undefined,
      position: "",
      staffType: "teaching",
      status: "active",
    },
  });

  const { reset } = form;
  const initRef = useRef<string>("");

  useEffect(() => {
    if (!staff || staff.role !== "staff") {
      return;
    }

    const assignmentKey = normalizedStaffAssignments
      .map(
        (assignment) =>
          `${assignment.subjectId}:${assignment.academicYear}:${assignment.classId}:${assignment.section}`,
      )
      .sort()
      .join("|");
    const resetKey = `${staff.id}:${staff.updatedAt || ""}:${assignmentKey}`;

    if (initRef.current === resetKey) {
      return;
    }

    initRef.current = resetKey;

    reset({
      name: staff.name || "",
      phoneNumber: staff.phoneNumber || "",
      gender: staff.gender || "other",
      bloodGroup: staff.bloodGroup,
      position: staff.position || "",
      staffType: staff.staffType || "teaching",
      status: staff.status || "active",
    });

    const uniqueSubjectIds = Array.from(
      new Set(
        normalizedStaffAssignments.map((assignment) => assignment.subjectId),
      ),
    );
    const nextDrafts: Record<string, SubjectAssignmentDraft[]> = {};

    uniqueSubjectIds.forEach((subjectId) => {
      const assignmentsForSubject = normalizedStaffAssignments.filter(
        (assignment) => assignment.subjectId === subjectId,
      );
      nextDrafts[subjectId] =
        assignmentsForSubject.length > 0
          ? (() => {
              const groups = new Map<string, typeof assignmentsForSubject>();
              assignmentsForSubject.forEach((a) => {
                const key = `${a.classId}-${a.academicYear}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(a);
              });

              return Array.from(groups.values()).map((assignments, index) => ({
                localId: `${subjectId}-${index}`,
                classId: assignments[0].classId,
                sections: assignments.map((a) => a.section),
                academicYear: assignments[0].academicYear,
              }));
            })()
          : [
              createEmptySubjectAssignmentDraft(
                academicYearOptions[0]?.value || defaultAcademicYear,
              ),
            ];
    });

    setAssignedSubjectIds(uniqueSubjectIds);
    setSubjectAssignmentsById(nextDrafts);
  }, [
    staff,
    reset,
    normalizedStaffAssignments,
    academicYearOptions,
    defaultAcademicYear,
  ]);

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
      createEmptySubjectDraft(
        academicYearOptions[0]?.value || defaultAcademicYear,
      ),
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
            toast.error(
              `${rowLabel}: Duplicate class-section mapping detected: ${normalizedSection}.`,
            );
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

  const onSubmit = async (values: EditStaffFormData) => {
    if (!validateNewSubjects()) {
      return;
    }

    const existingAssignments = getValidatedAssignedSubjects();
    if (!existingAssignments) {
      return;
    }

    setIsSaving(true);

    const updatePayload: UserUpdateInput = {
      name: values.name.trim(),
      phoneNumber: values.phoneNumber?.trim() ?? "",
      gender: values.gender,
      bloodGroup: values.bloodGroup,
      position: values.position.trim(),
      staffType: values.staffType,
      status: values.status,
    };

    try {
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

      const mergedAssignments = Array.from(
        new Map(
          [...existingAssignments, ...createdAssignments].map((assignment) => [
            `${assignment.subjectId}:${assignment.classId}:${assignment.section}:${assignment.academicYear}`,
            assignment,
          ]),
        ).values(),
      );

      await staffService.update(staffId, {
        ...updatePayload,
        subjectAssignments: mergedAssignments,
      });

      if (createSubjectResults.length > 0) {
        const failedSubjectTaskCount = createSubjectResults.filter(
          (result) => result.status === "rejected",
        ).length;

        if (failedSubjectTaskCount > 0) {
          toast.warning(
            `${failedSubjectTaskCount} subject operation(s) failed. You can manage these from the Subjects page.`,
          );
        }
      }

      toast.success("Staff updated successfully.");
      router.push(`/${role}/staffs`);
    } catch (submitError) {
      console.error("Error updating staff:", submitError);
      toast.error("Failed to update staff. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !staff || staff.role !== "staff") {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/${role}/staffs`)}
          className="w-fit"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Staffs
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Unable to load staff</CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Staff not found or failed to load."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/${role}/staffs`)}
        className="w-fit"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Staffs
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Edit Staff</CardTitle>
          <CardDescription>
            Update profile details for {staff.name || "this staff account"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4" />
                        Name
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Staff name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </FormLabel>
                  <FormControl>
                    <Input value={staff.email ?? ""} disabled />
                  </FormControl>
                </FormItem>

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 000-0000"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="position"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Briefcase className="h-4 w-4" />
                        Position
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Senior Teacher" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="h-10 w-full grid grid-cols-3">
                          <TabsTrigger value="male">Male</TabsTrigger>
                          <TabsTrigger value="female">Female</TabsTrigger>
                          <TabsTrigger value="other">Other</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <BloodGroupFormField
                control={form.control}
                name="bloodGroup"
                label="Blood Group"
              />

              <FormField
                control={form.control}
                name="staffType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Staff Type</FormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="h-10 w-full grid grid-cols-2">
                          <TabsTrigger value="teaching">Teaching</TabsTrigger>
                          <TabsTrigger value="non-teaching">
                            Non-Teaching
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel>Status</FormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={field.onChange}
                        className="w-full"
                      >
                        <TabsList className="h-10 w-full grid grid-cols-3">
                          <TabsTrigger value="active">Active</TabsTrigger>
                          <TabsTrigger value="inactive">Inactive</TabsTrigger>
                          <TabsTrigger value="pending">Pending</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-4 rounded-lg border p-4">
                <div>
                  <h3 className="text-sm font-semibold">Subject Assignment</h3>
                  <p className="text-xs text-muted-foreground">
                    Assign each subject to one or more class-section
                    combinations.
                  </p>
                </div>

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
                  disabled={subjectsLoading || isSaving}
                />

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
                                {index + 1}.{" "}
                                {subject?.name || "Selected Subject"}
                              </h4>
                              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider ml-2">
                                CODE: {subject?.code || "N/A"} |{" "}
                                {assignmentRows.length} CLASS ASSIGNMENT
                                {assignmentRows.length === 1 ? "" : "S"}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 px-4 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-800 font-semibold rounded-lg"
                                onClick={() =>
                                  router.push(
                                    `/${role}/subjects/${subjectId}/edit`,
                                  )
                                }
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
                                disabled={
                                  isSaving ||
                                  assignmentRows.length >= classes.length
                                }
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
                              {assignmentRows.map(
                                (assignment, mappingIndex) => {
                                  const classOptionsForYear =
                                    getClassOptionsByAcademicYear(
                                      assignment.academicYear,
                                    ).map((option) => {
                                      const isAlreadySelected =
                                        assignmentRows.some(
                                          (row) =>
                                            row.academicYear ===
                                              assignment.academicYear &&
                                            row.classId === option.value &&
                                            row.localId !== assignment.localId,
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
                                    const takenBy =
                                      globallyAssignedSectionsMap.get(
                                        assignmentKey,
                                      );

                                    return {
                                      value: section,
                                      label: section,
                                      disabled: !!takenBy,
                                      subLabel: takenBy
                                        ? `Assigned to ${takenBy}`
                                        : undefined,
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
                                            isSaving ||
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
                                              isSaving ||
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
                                              isSaving ||
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
                                            isSaving ||
                                            assignmentRows.length <= 1
                                          }
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  );
                                },
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* <div className="space-y-4 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Add New Subjects
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Subject fields follow the same logic as Subject
                      Create/Edit.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addNewSubject}
                    disabled={
                      classesLoading || classes.length === 0 || isSaving
                    }
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Add Subject
                  </Button>
                </div>

                {classesLoading ? (
                  <p className="text-xs text-muted-foreground">
                    Loading classes and academic years...
                  </p>
                ) : newSubjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No new subjects added yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {newSubjects.map((subject, index) => (
                      <div
                        key={subject.localId}
                        className="rounded-lg border p-4 space-y-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">
                            Subject {index + 1}
                          </h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => removeNewSubject(subject.localId)}
                            disabled={isSaving}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
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
                              disabled={isSaving}
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
                              disabled={isSaving}
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <FormLabel className="text-xs">Description</FormLabel>
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
                            disabled={isSaving}
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
                                  isSaving || academicYearOptions.length === 0
                                }
                              />
                            </div>

                            <div className="space-y-1.5">
                              <FormLabel className="text-xs">Class *</FormLabel>
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
                                  isSaving ||
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
                                  classById.get(subject.classId)?.sections || []
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
                                  isSaving ||
                                  !subject.classId ||
                                  (
                                    classById.get(subject.classId)?.sections ||
                                    []
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
                              disabled={isSaving}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <FormLabel className="text-xs">Status</FormLabel>
                            <div className="flex gap-2">
                              {subjectStatusOptions.map(({ value, label }) => {
                                const isSelected = subject.status === value;
                                return (
                                  <Button
                                    key={value}
                                    type="button"
                                    variant={isSelected ? "default" : "outline"}
                                    className="flex-1"
                                    onClick={() =>
                                      updateNewSubjectField(
                                        subject.localId,
                                        "status",
                                        value,
                                      )
                                    }
                                    disabled={isSaving}
                                  >
                                    {isSelected && (
                                      <Check className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    {label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div> */}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/${role}/staffs`)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
