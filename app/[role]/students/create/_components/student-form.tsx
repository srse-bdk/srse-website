"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ProfilePhotoField } from "@/components/core/profile-photo-field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/hooks/use-app-store";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { studentService } from "@/lib/services";
import { classService } from "@/lib/services/class.service";
import type { FeeConfiguration } from "@/lib/types/fee.type";
import type {
  Guardian,
  Student,
  StudentDocument,
  StudentInput,
  StudentUpdateInput,
} from "@/lib/types/student.type";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  FileText,
  GraduationCap,
  Info,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Search,
  Upload,
  User,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

// Zod schema - Only name is required
const guardianSchema = z.object({
  id: z.string(),
  relationship: z.enum(["father", "mother", "guardian", "other"]).optional(),
  name: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  occupation: z.string().optional(),
  address: z.string().optional(),
  isPrimary: z.boolean(),
});

const documentSchema = z.object({
  id: z.string(),
  label: z.string().min(1, "Label is required"),
  url: z.string().optional(),
  fileKey: z.string().optional(),
  uploadedAt: z.string().optional(),
  uploadedBy: z.string().optional(),
});

const studentSchema = z.object({
  admissionNumber: z.string().optional(),
  admissionDate: z.string().optional(),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  alternatePhone: z.string().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      pincode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  guardians: z.array(guardianSchema).optional(),
  profilePicture: z.string().optional(),
  profilePictureFileKey: z.string().optional(),
  documents: z.array(documentSchema).optional(),
  // Personal Details
  socialCategory: z.string().optional(),
  minorityGroup: z.string().optional(),
  bplBeneficiary: z.string().optional(),
  aayBeneficiary: z.string().optional(),
  ewsDisadvantaged: z.string().optional(),
  cwsn: z.string().optional(),
  impairmentType: z.string().optional(),
  disabilityPercentage: z.string().optional(),
  disabilityCertificate: z.string().optional(),
  nationality: z.string().optional(),
  outOfSchool: z.string().optional(),
  mainstreamedYear: z.string().optional(),
  motherTongue: z.string().optional(),
  pen: z.string().optional(),
  aadharNumber: z.string().optional(),
  nameOnAadhar: z.string().optional(),

  // Enrollment Details
  currentClass: z.string().optional(),
  currentSection: z.string().optional(),
  rollNumber: z.string().optional(),
  mediumOfInstruction: z.string().optional(),
  rteAct: z.string().optional(),
  rteEntitlement: z.string().optional(),
  previousClass: z.string().optional(),
  previousClassResult: z.string().optional(),
  academicStream: z.string().optional(),
  subjectsGroup: z.string().optional(),
  previousMarks: z.string().optional(),
  previousStatus: z.string().optional(),
  attendanceDays: z.string().optional(),
  previousGrade: z.string().optional(),

  // Facility Profile
  facilities: z.string().optional(),
  cwsnFacilities: z.string().optional(),
  sldScreened: z.string().optional(),
  sldType: z.string().optional(),
  asdScreened: z.string().optional(),
  adhdScreened: z.string().optional(),
  gifted: z.string().optional(),
  stateCompetitions: z.string().optional(),
  nccNss: z.string().optional(),
  digitalDevice: z.string().optional(),
  height: z.string().optional(),
  weight: z.string().optional(),
  distance: z.string().optional(),
  siblingIds: z.array(z.string()).optional(),
  optionalFeeIds: z.array(z.string()).optional(),
  optionalFeeAmounts: z.record(z.string(), z.number()).optional(),
});

type StudentFormData = z.infer<typeof studentSchema>;

const STEPS = [
  { id: "basic", label: "Basic Info", icon: User },
  { id: "personal", label: "Personal Details", icon: UserCircle },
  { id: "enrollment", label: "Enrollment", icon: GraduationCap },
  { id: "facility", label: "Facilities", icon: CheckCircle },
  { id: "contact", label: "Contact", icon: Mail },
  { id: "address", label: "Address", icon: MapPin },
  { id: "guardians", label: "Guardians", icon: Users },
  { id: "fees", label: "Optional Fees", icon: CreditCard },
  { id: "documents", label: "Documents", icon: FileText },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const stepVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 300 : -300,
    opacity: 0,
  }),
};

interface StudentFormProps {
  student?: Student;
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

function studentToFormDefaults(student: Student): StudentFormData {
  const nameFromFull =
    !student.firstName && !student.lastName && student.fullName
      ? splitFullName(student.fullName)
      : null;

  return {
    admissionNumber: student.admissionNumber || "",
    admissionDate: student.admissionDate || "",
    firstName: student.firstName || nameFromFull?.firstName || "",
    lastName: student.lastName || nameFromFull?.lastName || "",
    dateOfBirth: student.dateOfBirth || "",
    gender: student.gender,
    bloodGroup: student.bloodGroup,
    email: student.email || "",
    phone: student.phone || "",
    alternatePhone: student.alternatePhone || "",
    address: {
      street: student.address?.street || "",
      city: student.address?.city || "",
      state: student.address?.state || "",
      pincode: student.address?.pincode || "",
      country: student.address?.country || "India",
    },
    guardians: student.guardians || [],
    profilePicture: student.profilePicture || "",
    profilePictureFileKey: student.profilePictureFileKey || "",
    documents: student.documents || [],
    optionalFeeIds: student.optionalFeeIds || [],
    optionalFeeAmounts: student.optionalFeeAmounts || {},
    socialCategory: student.socialCategory || "",
    minorityGroup: "",
    bplBeneficiary: "",
    aayBeneficiary: "",
    ewsDisadvantaged: "",
    cwsn: "",
    impairmentType: "",
    disabilityPercentage: "",
    disabilityCertificate: "",
    nationality: "Indian",
    outOfSchool: "",
    mainstreamedYear: "",
    motherTongue: "",
    pen: student.pen || "",
    aadharNumber: "",
    nameOnAadhar: "",
    currentClass: student.currentClass || "",
    currentSection: student.currentSection || "",
    rollNumber: student.rollNumber || "",
    mediumOfInstruction: "",
    rteAct: "",
    rteEntitlement: "",
    previousClass: "",
    previousClassResult: "",
    academicStream: "",
    subjectsGroup: "",
    previousMarks: "",
    previousStatus: "",
    attendanceDays: "",
    previousGrade: "",
    facilities: "",
    cwsnFacilities: "",
    sldScreened: "",
    sldType: "",
    asdScreened: "",
    adhdScreened: "",
    gifted: "",
    stateCompetitions: "",
    nccNss: "",
    digitalDevice: "",
    height: "",
    weight: "",
    distance: "",
    siblingIds: student.siblingIds || [],
  };
}

function buildStudentPayloadFromForm(
  data: StudentFormData,
  userId: string | undefined,
  options: { isEdit: boolean },
): StudentInput | StudentUpdateInput {
  const documents =
    data.documents
      ?.filter((d) => d.url && d.label)
      .map((d) => {
        if (!d.url || !d.fileKey) return null;
        return {
          id: d.id,
          label: d.label,
          url: d.url,
          fileKey: d.fileKey,
          uploadedAt: d.uploadedAt || new Date().toISOString(),
          uploadedBy: d.uploadedBy || userId || "admin",
        };
      })
      .filter((d): d is StudentDocument => d !== null) || [];

  const payload = {
    ...(data.admissionDate && { admissionDate: data.admissionDate }),
    firstName: data.firstName,
    lastName: data.lastName,
    ...(data.dateOfBirth && { dateOfBirth: data.dateOfBirth }),
    ...(data.gender && { gender: data.gender }),
    ...(data.bloodGroup && { bloodGroup: data.bloodGroup }),
    ...(data.email && { email: data.email }),
    ...(data.phone && { phone: data.phone }),
    ...(data.alternatePhone && { alternatePhone: data.alternatePhone }),
    address: data.address
      ? {
          street: data.address.street || "",
          city: data.address.city || "",
          state: data.address.state || "",
          pincode: data.address.pincode || "",
          country: data.address.country || "India",
        }
      : {
          street: "",
          city: "",
          state: "",
          pincode: "",
          country: "India",
        },
    guardians:
      data.guardians?.map((g) => ({
        id: g.id,
        relationship: (g.relationship || "father") as
          | "father"
          | "mother"
          | "guardian"
          | "other",
        name: g.name || "",
        email: g.email,
        phone: g.phone || "",
        occupation: g.occupation,
        address: g.address,
        isPrimary: g.isPrimary,
      })) || [],
    ...(data.profilePicture && { profilePicture: data.profilePicture }),
    ...(data.profilePictureFileKey && {
      profilePictureFileKey: data.profilePictureFileKey,
    }),
    ...(data.currentClass && { currentClass: data.currentClass }),
    ...(data.currentSection && { currentSection: data.currentSection }),
    ...(data.rollNumber && { rollNumber: data.rollNumber }),
    ...(data.siblingIds && { siblingIds: data.siblingIds }),
    ...(data.optionalFeeIds && { optionalFeeIds: data.optionalFeeIds }),
    ...(data.optionalFeeAmounts && {
      optionalFeeAmounts: data.optionalFeeAmounts,
    }),
    ...(data.pen && { pen: data.pen }),
    ...(data.socialCategory && { socialCategory: data.socialCategory }),
    documents,
  };

  if (options.isEdit) {
    return {
      ...payload,
      ...(data.admissionNumber && { admissionNumber: data.admissionNumber }),
    } satisfies StudentUpdateInput;
  }

  return {
    admissionNumber: data.admissionNumber || `ADM-${Date.now()}`,
    ...payload,
  } satisfies StudentInput;
}

export function StudentForm({ student }: StudentFormProps = {}) {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const isEditMode = Boolean(student);
  const editStudentId =
    student?.id || (isEditMode ? (params.id as string | undefined) : undefined);
  const { user } = useAppStore();
  const [currentStep, setCurrentStep] = useState<StepId>("basic");
  const [direction, setDirection] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const documentInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [siblingSearchQuery, setSiblingSearchQuery] = useState("");
  const [hasSiblings, setHasSiblings] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);

  // Fetch fee configurations for the optional fees step
  const { data: feesData, loading: feesLoading } =
    useFirebaseRealtime<FeeConfiguration>("feeConfigurations", {
      asArray: true,
    });
  const feeConfigs = (feesData as FeeConfiguration[]) || [];

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        console.log("Fetching all classes for debugging...");
        // Fetch ALL classes to see what's going on
        const allClasses = await classService.getAll();
        console.log("All classes fetched:", allClasses);

        // Filter active ones manually to verify
        const activeClasses = allClasses.filter((c) => c.status === "active");
        console.log("Active classes filtered:", activeClasses);

        if (activeClasses.length === 0 && allClasses.length > 0) {
          console.warn(
            "No active classes found, but classes exist. Check 'status' field.",
          );
          // Fallback: Show all classes if none are 'active' (temporary fix/debug)
          setClasses(allClasses);
        } else {
          setClasses(activeClasses);
        }
      } catch (error) {
        console.error("Error fetching classes:", error);
      }
    };
    fetchClasses();
  }, []);

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: student
      ? studentToFormDefaults(student)
      : {
      admissionNumber: "",
      admissionDate: "",
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: undefined,
      bloodGroup: undefined,
      email: "",
      phone: "",
      alternatePhone: "",
      address: {
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "India",
      },
      guardians: [],
      profilePicture: "",
      profilePictureFileKey: "",
      documents: [],
      optionalFeeIds: [],
      optionalFeeAmounts: {},
      // Personal
      socialCategory: "",
      minorityGroup: "",
      bplBeneficiary: "",
      aayBeneficiary: "",
      ewsDisadvantaged: "",
      cwsn: "",
      impairmentType: "",
      disabilityPercentage: "",
      disabilityCertificate: "",
      nationality: "Indian",
      outOfSchool: "",
      mainstreamedYear: "",
      motherTongue: "",
      pen: "",
      aadharNumber: "",
      nameOnAadhar: "",
      // Enrollment
      currentClass: "",
      currentSection: "",
      rollNumber: "",
      mediumOfInstruction: "",
      rteAct: "",
      rteEntitlement: "",
      previousClass: "",
      previousClassResult: "",
      academicStream: "",
      subjectsGroup: "",
      previousMarks: "",
      previousStatus: "",
      attendanceDays: "",
      previousGrade: "",
      // Facility
      facilities: "",
      cwsnFacilities: "",
      sldScreened: "",
      sldType: "",
      asdScreened: "",
      adhdScreened: "",
      gifted: "",
      stateCompetitions: "",
      nccNss: "",
      digitalDevice: "",
      height: "",
      weight: "",
      distance: "",
      siblingIds: [],
    },
  });

  useEffect(() => {
    if (!student) return;
    form.reset(studentToFormDefaults(student));
    setHasSiblings((student.siblingIds?.length || 0) > 0);
  }, [student?.id, student?.updatedAt, student, form]);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const students = await studentService.getAll();
        setAllStudents(
          editStudentId
            ? students.filter((item) => item.id !== editStudentId)
            : students,
        );
      } catch (error) {
        console.error("Error loading students:", error);
      }
    };
    loadStudents();
  }, [editStudentId]);

  const { startUpload: startDocumentUpload, isUploading: isDocumentUploading } =
    useUploadThing("generalUploader", {
      onClientUploadComplete: async () => {
        // Handled in handleDocumentUpload
      },
      onUploadError: (error: Error) => {
        toast.error(`Document upload failed: ${error.message}`);
      },
    });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const nextStep = async () => {
    const stepFields: Record<StepId, (keyof StudentFormData)[]> = {
      basic: ["firstName", "lastName"],
      personal: [],
      enrollment: [],
      facility: [],
      contact: ["email", "phone"],
      address: ["address"],
      guardians: ["guardians"],
      fees: ["optionalFeeIds", "optionalFeeAmounts"],
      documents: [],
    };

    const fieldsToValidate = stepFields[currentStep];
    if (fieldsToValidate.length > 0) {
      const isValid = await form.trigger(
        fieldsToValidate as (keyof StudentFormData)[],
      );
      if (!isValid) return;
    }

    if (currentStepIndex < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (currentStepIndex > 0) {
      setDirection(-1);
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleDocumentUpload = async (
    documentId: string,
    file: File,
  ): Promise<void> => {
    try {
      const res = await startDocumentUpload([file]);
      if (res?.[0]?.url && res?.[0]?.key) {
        const documents = form.getValues("documents") || [];
        const docIndex = documents.findIndex((d) => d.id === documentId);
        if (docIndex !== -1) {
          const updatedDocs = [...documents];
          updatedDocs[docIndex] = {
            ...updatedDocs[docIndex],
            url: res[0].url,
            fileKey: res[0].key,
            uploadedAt: new Date().toISOString(),
            uploadedBy: user?.uid || "admin",
          };
          form.setValue("documents", updatedDocs);
          toast.success("Document uploaded!");
        }
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    }
  };

  const addDocument = () => {
    const currentDocuments = form.getValues("documents") || [];
    const newDocument: StudentDocument = {
      id: `doc-${Date.now()}`,
      label: "",
      url: "",
      fileKey: "",
      uploadedAt: "",
      uploadedBy: user?.uid || "admin",
    };
    form.setValue("documents", [...currentDocuments, newDocument]);
  };

  const removeDocument = (index: number) => {
    const documents = form.getValues("documents") || [];
    const newDocuments = documents.filter((_, i) => i !== index);
    form.setValue("documents", newDocuments);
  };

  const handleDocumentFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
    documentId: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 16 * 1024 * 1024) {
      toast.error("File size must be less than 16MB");
      return;
    }

    await handleDocumentUpload(documentId, file);
  };

  const addGuardian = () => {
    const currentGuardians = form.getValues("guardians") || [];
    const newGuardian: Guardian = {
      id: `guardian-${Date.now()}`,
      relationship: "father",
      name: "",
      email: "",
      phone: "",
      occupation: "",
      address: "",
      isPrimary: currentGuardians.length === 0,
    };
    form.setValue("guardians", [...currentGuardians, newGuardian]);
  };

  const removeGuardian = (index: number) => {
    const guardians = form.getValues("guardians") || [];
    const newGuardians = guardians.filter((_, i) => i !== index);
    if (guardians[index]?.isPrimary && newGuardians.length > 0) {
      newGuardians[0].isPrimary = true;
    }
    form.setValue("guardians", newGuardians);
  };

  const setPrimaryGuardian = (index: number) => {
    const guardians = form.getValues("guardians") || [];
    guardians.forEach((g, i) => {
      g.isPrimary = i === index;
    });
    form.setValue("guardians", [...guardians]);
  };

  const onSubmit = async (data: StudentFormData) => {
    setIsLoading(true);
    try {
      if (data.admissionNumber) {
        const existing = await studentService.getByAdmissionNumber(
          data.admissionNumber,
        );
        if (existing && existing.id !== editStudentId) {
          toast.error("Admission number already exists");
          setIsLoading(false);
          return;
        }
      }

      if (isEditMode && editStudentId) {
        const updateData = buildStudentPayloadFromForm(data, user?.uid, {
          isEdit: true,
        }) as StudentUpdateInput;
        await studentService.update(editStudentId, updateData);
        toast.success("Student updated successfully");
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          router.push(`/${role}/students/${editStudentId}`);
        }, 2000);
        return;
      }

      const studentData = buildStudentPayloadFromForm(data, user?.uid, {
        isEdit: false,
      }) as StudentInput;

      await studentService.create(studentData);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        router.push(`/${role}/students`);
      }, 3000);
    } catch (error) {
      console.error(
        isEditMode ? "Error updating student:" : "Error creating student:",
        error,
      );
      toast.error(
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Failed to update student. Please try again."
            : "Failed to create student. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const watchedGuardians = form.watch("guardians") || [];

  const renderStepContent = () => {
    switch (currentStep) {
      case "basic":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Student Name</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Enter the student's name. This is the only required information.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="John" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select date of birth"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="admissionNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Number</FormLabel>
                    <FormControl>
                      <Input placeholder="ADM-2024-001 (optional)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="admissionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Select admission date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <div className="flex gap-2 flex-wrap">
                        {(
                          [
                            { value: "male", label: "Male", icon: User },
                            {
                              value: "female",
                              label: "Female",
                              icon: UserCircle,
                            },
                          ] as const
                        ).map(({ value, label, icon: Icon }) => {
                          const isSelected = field.value === value;
                          return (
                            <motion.button
                              key={value}
                              type="button"
                              onClick={() =>
                                field.onChange(isSelected ? undefined : value)
                              }
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
                              <Icon className="h-5 w-5" />
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
                name="bloodGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Blood Group</FormLabel>
                    <FormControl>
                      <div className="grid grid-cols-4 gap-2">
                        {(
                          [
                            "A+",
                            "A-",
                            "B+",
                            "B-",
                            "AB+",
                            "AB-",
                            "O+",
                            "O-",
                          ] as const
                        ).map((option) => {
                          const isSelected = field.value === option;
                          return (
                            <motion.button
                              key={option}
                              type="button"
                              onClick={() =>
                                field.onChange(isSelected ? undefined : option)
                              }
                              className={`
                                relative px-3 py-2.5 rounded-lg border-2 transition-all text-sm font-medium
                                ${
                                  isSelected
                                    ? "border-primary bg-primary/10 text-primary shadow-md"
                                    : "border-border bg-background hover:border-primary/50 hover:bg-accent/50"
                                }
                              `}
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              initial={false}
                            >
                              <AnimatePresence>
                                {isSelected && (
                                  <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0, opacity: 0 }}
                                    className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground rounded-full p-0.5"
                                  >
                                    <Check className="h-2.5 w-2.5" />
                                  </motion.div>
                                )}
                              </AnimatePresence>
                              {option}
                            </motion.button>
                          );
                        })}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sibling Selection */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Siblings in School</h4>
                  <p className="text-xs text-muted-foreground">
                    Does the student have siblings studying here?
                  </p>
                </div>
                <Button
                  type="button"
                  variant={hasSiblings ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHasSiblings(!hasSiblings)}
                >
                  {hasSiblings ? "Yes, search siblings" : "No"}
                </Button>
              </div>

              <AnimatePresence>
                {hasSiblings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                  >
                    <div className="space-y-2">
                      <FormLabel>Search Siblings</FormLabel>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or admission number..."
                          value={siblingSearchQuery}
                          onChange={(e) =>
                            setSiblingSearchQuery(e.target.value)
                          }
                          className="pl-9"
                        />
                      </div>
                      {siblingSearchQuery && (
                        <Card className="max-h-[200px] overflow-y-auto">
                          <CardContent className="p-0">
                            {allStudents
                              .filter(
                                (s) =>
                                  (s.fullName
                                    ?.toLowerCase()
                                    .includes(
                                      siblingSearchQuery.toLowerCase(),
                                    ) ||
                                    s.admissionNumber
                                      ?.toLowerCase()
                                      .includes(
                                        siblingSearchQuery.toLowerCase(),
                                      )) &&
                                  !form.watch("siblingIds")?.includes(s.id),
                              )
                              .map((student) => (
                                <div
                                  key={student.id}
                                  className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer border-b last:border-0"
                                  onClick={() => {
                                    const currentIds =
                                      form.getValues("siblingIds") || [];
                                    form.setValue("siblingIds", [
                                      ...currentIds,
                                      student.id,
                                    ]);

                                    // Autofill details from sibling
                                    form.setValue("address", {
                                      street: student.address.street || "",
                                      city: student.address.city || "",
                                      state: student.address.state || "",
                                      pincode: student.address.pincode || "",
                                      country:
                                        student.address.country || "India",
                                    });

                                    if (student.phone) {
                                      form.setValue("phone", student.phone);
                                    }
                                    if (student.alternatePhone) {
                                      form.setValue(
                                        "alternatePhone",
                                        student.alternatePhone,
                                      );
                                    }

                                    if (
                                      student.guardians &&
                                      student.guardians.length > 0
                                    ) {
                                      form.setValue(
                                        "guardians",
                                        student.guardians.map((g) => ({
                                          id: `guardian-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                          relationship: g.relationship,
                                          name: g.name,
                                          email: g.email,
                                          phone: g.phone,
                                          occupation: g.occupation,
                                          address: g.address,
                                          isPrimary: g.isPrimary,
                                        })),
                                      );
                                    }

                                    toast.success(
                                      `Details autofilled from ${student.fullName}`,
                                    );
                                    setSiblingSearchQuery("");
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarImage
                                        src={student.profilePicture}
                                      />
                                      <AvatarFallback>
                                        {(
                                          student.firstName?.[0] || ""
                                        ).toUpperCase()}
                                        {(
                                          student.lastName?.[0] || ""
                                        ).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {student.fullName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {student.admissionNumber}
                                      </p>
                                    </div>
                                  </div>
                                  <Plus className="h-4 w-4 text-muted-foreground" />
                                </div>
                              ))}
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {form.watch("siblingIds")?.map((id) => {
                        const sibling = allStudents.find((s) => s.id === id);
                        if (!sibling) return null;
                        return (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="pl-1 py-1 pr-2 flex items-center gap-2"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={sibling.profilePicture} />
                              <AvatarFallback>
                                {sibling.firstName?.[0]?.toUpperCase() || "S"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs">{sibling.fullName}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const currentIds =
                                  form.getValues("siblingIds") || [];
                                form.setValue(
                                  "siblingIds",
                                  currentIds.filter((cid) => cid !== id),
                                );
                              }}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        );

      case "personal":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Personal Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Additional personal information.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="socialCategory"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Social Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="General">General</SelectItem>
                        <SelectItem value="SC">SC</SelectItem>
                        <SelectItem value="ST">ST</SelectItem>
                        <SelectItem value="OBC">OBC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="minorityGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minority Group</FormLabel>
                    <Input placeholder="NA" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="motherTongue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mother Tongue</FormLabel>
                    <Input placeholder="English" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <Input placeholder="Indian" {...field} />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="aadharNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Aadhar Number</FormLabel>
                    <Input placeholder="xxxx-xxxx-xxxx" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nameOnAadhar"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name as per Aadhar</FormLabel>
                    <Input placeholder="Name" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pen"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Permanent Education Number (PEN)</FormLabel>
                    <Input placeholder="PEN" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mainstreamedYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When Mainstreamed</FormLabel>
                    <Input placeholder="Year" {...field} />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bplBeneficiary"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>BPL Beneficiary</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="aayBeneficiary"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>AAY Beneficiary</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ewsDisadvantaged"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>EWS / Disadvantaged</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="cwsn"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>CWSN</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="outOfSchool"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Out of School Child?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="disabilityCertificate"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Disability Certificate</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="disabilityPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Disability Percentage (%)</FormLabel>
                    <Input placeholder="0" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="impairmentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type of Impairment</FormLabel>
                    <Input placeholder="NA" {...field} />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "enrollment":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Enrollment Details</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Academic and enrollment information.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currentClass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Class</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Class" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.name}>
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
                control={form.control}
                name="currentSection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Section</FormLabel>
                    <Input placeholder="e.g., A, B, C" {...field} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rollNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class/Section Roll No</FormLabel>
                    <Input placeholder="Roll No" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mediumOfInstruction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medium of Instruction</FormLabel>
                    <Input placeholder="English" {...field} />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="rteAct"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Admitted under RTE Act?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rteEntitlement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RTE Entitlement Claimed</FormLabel>
                    <Input placeholder="NA" {...field} />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="previousClass"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous Class Studied</FormLabel>
                    <Input placeholder="Class" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="previousClassResult"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result of Previous Class</FormLabel>
                    <Input placeholder="Promoted/Passed" {...field} />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="academicStream"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Stream</FormLabel>
                    <Input placeholder="NA" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subjectsGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subjects Group</FormLabel>
                    <Input placeholder="NA" {...field} />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="previousMarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marks Obtained (%)</FormLabel>
                    <Input placeholder="90" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="attendanceDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Attendance Days (Prev Year)</FormLabel>
                    <Input placeholder="200" {...field} />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="previousStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status in Previous Academic Year</FormLabel>
                  <Input
                    placeholder="Studied at Current/Same School"
                    {...field}
                  />
                </FormItem>
              )}
            />
          </div>
        );

      case "facility":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Facility Profile</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Facilities and other details.
              </p>
            </div>
            <FormField
              control={form.control}
              name="facilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facilities Provided</FormLabel>
                  <Input placeholder="Uniform, Books, etc." {...field} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cwsnFacilities"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facilities for CWSN</FormLabel>
                  <Input placeholder="NA" {...field} />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sldScreened"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Screened for SLD?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sldType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SLD Type</FormLabel>
                    <Input placeholder="NA" {...field} />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="asdScreened"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Screened for ASD?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="adhdScreened"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Screened for ADHD?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="gifted"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Gifted/Talented?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stateCompetitions"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>State Level Competitions?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nccNss"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>NCC/NSS/Scouts?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="digitalDevice"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel>Capable of handling digital devices?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="w-full">
                        <SelectItem value="Yes">Yes</SelectItem>
                        <SelectItem value="No">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (in CMs)</FormLabel>
                    <Input placeholder="100" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (in KGs)</FormLabel>
                    <Input placeholder="30" {...field} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="distance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Distance to School</FormLabel>
                    <Input placeholder="2 Km" {...field} />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "contact":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Contact Information
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add contact details (all optional).
              </p>
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="student@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alternatePhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Alternate Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="9876543210" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case "address":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Address</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add address information (all optional).
              </p>
            </div>
            <FormField
              control={form.control}
              name="address.street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="address.city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="City" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input placeholder="State" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.pincode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pincode</FormLabel>
                    <FormControl>
                      <Input placeholder="123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address.country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input placeholder="India" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case "guardians":
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">
                Guardians / Parents
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add guardian information (all optional, can be added later).
              </p>
            </div>
            {watchedGuardians.map((guardian, index) => (
              <Card key={guardian.id} className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">
                      Guardian {index + 1}
                      {guardian.isPrimary && (
                        <Badge className="ml-2">Primary</Badge>
                      )}
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    {!guardian.isPrimary && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPrimaryGuardian(index)}
                      >
                        Set Primary
                      </Button>
                    )}
                    {watchedGuardians.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeGuardian(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`guardians.${index}.relationship`}
                    render={({ field }) => (
                      <FormItem className="w-full">
                        <FormLabel>Relationship</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="w-full">
                            <SelectItem value="father">Father</SelectItem>
                            <SelectItem value="mother">Mother</SelectItem>
                            <SelectItem value="guardian">Guardian</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`guardians.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Guardian name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`guardians.${index}.phone`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="9876543210"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`guardians.${index}.email`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="guardian@example.com"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`guardians.${index}.occupation`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Occupation</FormLabel>
                        <FormControl>
                          <Input placeholder="Occupation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`guardians.${index}.address`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={addGuardian}
              className="w-full"
            >
              <Users className="h-4 w-4 mr-2" />
              Add Guardian
            </Button>
          </div>
        );

      case "fees": {
        const optionalFees = feeConfigs.filter((c) => c.isOptional);
        const watchedIds = form.watch("optionalFeeIds") || [];
        const watchedAmounts = (form.watch("optionalFeeAmounts") ||
          {}) as Record<string, number>;

        const toggleFee = (id: string, checked: boolean) => {
          const currentIds = [...watchedIds];
          const currentAmounts = { ...watchedAmounts };
          if (checked) {
            currentIds.push(id);
            currentAmounts[id] = 0;
          } else {
            const index = currentIds.indexOf(id);
            if (index > -1) currentIds.splice(index, 1);
            delete currentAmounts[id];
          }
          form.setValue("optionalFeeIds", currentIds);
          form.setValue("optionalFeeAmounts", currentAmounts);
        };

        const updateAmount = (id: string, amount: string) => {
          const currentAmounts = { ...watchedAmounts };
          currentAmounts[id] = parseFloat(amount) || 0;
          form.setValue("optionalFeeAmounts", currentAmounts);
        };

        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Optional Fees</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select any optional fees applicable to this student.
              </p>
            </div>
            {feesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : optionalFees.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                No optional fees configured.
              </p>
            ) : (
              <div className="grid gap-4">
                {optionalFees.map((fee) => {
                  const isSelected = watchedIds.includes(fee.id);
                  return (
                    <Card
                      key={fee.id}
                      className={`p-4 transition-colors ${isSelected ? "border-primary bg-primary/5" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`fee-${fee.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              toggleFee(fee.id, !!checked)
                            }
                          />
                          <div>
                            <label
                              htmlFor={`fee-${fee.id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                            >
                              {fee.name}
                            </label>
                            <p className="text-xs text-muted-foreground mt-1 lowercase">
                              Cycle: {fee.cycle}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-32">
                            <Input
                              type="number"
                              placeholder="Amount"
                              className="h-8 text-sm"
                              value={watchedAmounts[fee.id] || ""}
                              onChange={(e) =>
                                updateAmount(fee.id, e.target.value)
                              }
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5 text-right">
                              Set amount (₹)
                            </p>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
            <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-primary/10">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-primary/80">
                    Automated Billing Info
                  </p>
                  <p className="text-muted-foreground">
                    Mandatory fees (Tuition, Development, etc.) will be
                    automatically applied based on the selected class. Assigned
                    optional fees will also be included in the student's monthly
                    bills.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case "documents": {
        const watchedDocuments = form.watch("documents") || [];
        return (
          <div className="space-y-6">
            <ProfilePhotoField
              value={form.watch("profilePicture")}
              fileKey={form.watch("profilePictureFileKey")}
              onChange={(url, key) => {
                form.setValue("profilePicture", url || "");
                form.setValue("profilePictureFileKey", key || "");
              }}
              title="Profile Picture (Optional)"
              description="Upload a profile picture for the student (max 150 KB). Used on ID cards and linked parent login."
              editorTitle="Edit student photo"
              fallbackIcon={<GraduationCap className="h-16 w-16" />}
            />

            {/* Documents Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Additional Documents (Optional)
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add documents with custom labels. All fields are optional.
                </p>
              </div>

              {watchedDocuments.map((document, index) => (
                <Card key={document.id} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <h4 className="font-medium">Document {index + 1}</h4>
                    {watchedDocuments.length > 0 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => removeDocument(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name={`documents.${index}.label`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Document Label</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Birth Certificate, Medical Report"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div>
                      <input
                        ref={(el) => {
                          documentInputRefs.current[document.id] = el;
                        }}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          handleDocumentFileSelect(e, document.id)
                        }
                        className="hidden"
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            documentInputRefs.current[document.id]?.click()
                          }
                          disabled={isDocumentUploading}
                          className="w-full"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {document.url ? "Change Document" : "Upload Document"}
                        </Button>
                        {document.url && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a
                              href={document.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              View
                            </a>
                          </Button>
                        )}
                      </div>
                      {isDocumentUploading && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Uploading...
                        </p>
                      )}
                      {document.url && (
                        <p className="text-sm text-green-600 mt-2">
                          Document uploaded successfully
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addDocument}
                className="w-full"
              >
                <FileText className="h-4 w-4 mr-2" />
                Add Document
              </Button>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {isEditMode ? "Edit Student" : "Create Student"}
        </h1>
        <p className="text-muted-foreground">
          {isEditMode
            ? `Update details for ${student?.fullName || "this student"}${
                student?.admissionNumber
                  ? ` (Admission No: ${student.admissionNumber})`
                  : ""
              }.`
            : "Add a new student. Only name is required - other information can be added later."}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Step {currentStepIndex + 1} of {STEPS.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Step Indicators */}
      <div className="flex justify-between">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon;
          const isActive = index === currentStepIndex;
          const isCompleted = index < currentStepIndex;
          return (
            <div
              key={step.id}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-muted text-muted-foreground"
                }`}
              >
                <StepIcon className="h-5 w-5" />
              </div>
              <span
                className={`text-xs text-center ${
                  isActive ? "font-semibold" : "text-muted-foreground"
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {showSuccess && (
            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {isEditMode
                  ? "Student updated successfully! Redirecting to profile..."
                  : "Student created successfully! Redirecting to students list..."}
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {(() => {
                  const StepIcon = STEPS[currentStepIndex].icon;
                  return <StepIcon className="h-5 w-5" />;
                })()}
                {STEPS[currentStepIndex].label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentStep}
                  custom={direction}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                  }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentStepIndex < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      isEditMode && editStudentId
                        ? `/${role}/students/${editStudentId}`
                        : `/${role}/students`,
                    )
                  }
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? isEditMode
                      ? "Saving..."
                      : "Creating..."
                    : isEditMode
                      ? "Save Changes"
                      : "Create Student"}
                </Button>
              </div>
            )}
          </div>
        </form>
      </Form>

    </div>
  );
}
