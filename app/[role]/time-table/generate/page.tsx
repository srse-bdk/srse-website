"use client";

import {
  ArrowLeft,
  BookOpen,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Download,
  List,
  Loader2,
  MapPin,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { timeTableService } from "@/lib/services/time-table.service";
import type { Class } from "@/lib/types/class.type";
import type { Subject } from "@/lib/types/subject.type";
import type {
  DayOfWeek,
  TimeTable,
  TimeTableConfig,
  TimeTableSlot,
} from "@/lib/types/time-table.type";
import type { User } from "@/lib/types/user.type";
import { cn } from "@/lib/utils";

const DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function GenerateTimeTablePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = params.role as string;
  const editTimeTableId = searchParams.get("editId") || "";
  const isEditMode = Boolean(editTimeTableId);

  // Configuration State
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");

  // Generate academic years (Current and Next)
  const academicYears = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    // const month = now.getMonth();
    // Indian academic year traditionally starts in April
    const startYear = year;
    return [
      `${startYear}-${(startYear + 1).toString().slice(-2)}`,
      `${startYear + 1}-${(startYear + 2).toString().slice(-2)}`,
    ];
  }, []);

  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(
    academicYears[0],
  );

  const [config, setConfig] = useState<TimeTableConfig>({
    startTime: "08:00",
    endTime: "14:00",
    periodDuration: 45,
    lunchBreakStartTime: "11:30",
    lunchBreakDuration: 30,
    daysOfWeek: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ],
    numberOfPeriods: 6,
  });

  // Load config from localStorage on mount
  useEffect(() => {
    if (isEditMode) return;
    try {
      const savedConfig = localStorage.getItem("timetable_config");
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
    } catch (err) {
      console.error("Failed to parse saved config from localStorage", err);
    }
  }, [isEditMode]);

  // Save config to localStorage when it changes
  useEffect(() => {
    if (isEditMode) return;
    try {
      localStorage.setItem("timetable_config", JSON.stringify(config));
    } catch (err) {
      console.error("Failed to save config to localStorage", err);
    }
  }, [config, isEditMode]);

  const [schedule, setSchedule] = useState<Record<DayOfWeek, TimeTableSlot[]>>({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState("config");
  const [initializedEditTimeTableId, setInitializedEditTimeTableId] =
    useState<string>("");

  // Constraints State
  const [isFirstClassTeacher, setIsFirstClassTeacher] =
    useState<boolean>(false);
  const [firstClassTeacherSubjectId, setFirstClassTeacherSubjectId] =
    useState<string>("");
  const [rules, setRules] = useState<
    { subjectId: string; maxPeriods: number }[]
  >([]);

  // Data Fetching
  const { data: classesData, loading: classesLoading } =
    useFirebaseRealtime<Class>("classes", { asArray: true });
  const { data: subjectsData, loading: subjectsLoading } =
    useFirebaseRealtime<Subject>("subjects", { asArray: true });
  const { data: staffsData } = useFirebaseRealtime<User>("users", {
    asArray: true,
    filter: (u) => u.role === "staff",
  });

  const classes = (classesData as Class[]) || [];
  const allSubjects = (subjectsData as Subject[]) || [];
  const staffs = (staffsData as User[]) || [];
  const subjectById = useMemo(
    () => new Map(allSubjects.map((subject) => [subject.id, subject])),
    [allSubjects],
  );

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const classSubjects = useMemo(() => {
    const scopedSubjects = new Map<string, Subject>();

    // Primary source: staff assignment mapping in current structure.
    for (const staff of staffs) {
      for (const assignment of staff.subjectAssignments || []) {
        if (!assignment.subjectId) continue;
        if (selectedClassId && assignment.classId !== selectedClassId) continue;
        if (selectedSection && assignment.section !== selectedSection) continue;
        if (
          selectedAcademicYear &&
          assignment.academicYear !== selectedAcademicYear
        ) {
          continue;
        }

        const subject = subjectById.get(assignment.subjectId);
        if (subject) {
          scopedSubjects.set(subject.id, subject);
        }
      }
    }

    // Legacy fallback: old subjects that still carry class/section/year fields.
    for (const subject of allSubjects) {
      if (
        subject.classId === selectedClassId &&
        (!selectedSection ||
          !subject.section ||
          subject.section === selectedSection) &&
        (!selectedAcademicYear || subject.academicYear === selectedAcademicYear)
      ) {
        scopedSubjects.set(subject.id, subject);
      }
    }

    return Array.from(scopedSubjects.values());
  }, [
    allSubjects,
    staffs,
    subjectById,
    selectedClassId,
    selectedSection,
    selectedAcademicYear,
  ]);

  const subjectAssignmentStaffIdBySubjectId = useMemo(() => {
    const map = new Map<string, string>();

    for (const staff of staffs) {
      for (const assignment of staff.subjectAssignments || []) {
        if (!assignment.subjectId) continue;
        if (selectedClassId && assignment.classId !== selectedClassId) continue;
        if (selectedSection && assignment.section !== selectedSection) continue;
        if (
          selectedAcademicYear &&
          assignment.academicYear !== selectedAcademicYear
        )
          continue;
        if (!map.has(assignment.subjectId)) {
          map.set(assignment.subjectId, staff.id);
        }
      }
    }

    return map;
  }, [staffs, selectedClassId, selectedSection, selectedAcademicYear]);

  // Update academic year when class changes (if not already set)
  useEffect(() => {
    if (selectedClass?.academicYear && !isEditMode) {
      setSelectedAcademicYear(selectedClass.academicYear);
    }
  }, [selectedClass, isEditMode]);

  // Fetch existing time tables for conflict checking
  const { data: allTimeTablesData, loading: allTimeTablesLoading } =
    useFirebaseRealtime<TimeTable>("time-tables", { asArray: true });
  const allTimeTables = (allTimeTablesData as TimeTable[]) || [];
  const editingTimeTable = useMemo(
    () => allTimeTables.find((tt) => tt.id === editTimeTableId),
    [allTimeTables, editTimeTableId],
  );

  useEffect(() => {
    if (!isEditMode || !editTimeTableId) return;
    if (initializedEditTimeTableId === editTimeTableId) return;
    if (allTimeTablesLoading) return;

    if (!editingTimeTable) {
      toast.error("Unable to load this timetable for editing.");
      router.push(`/${role}/time-table`);
      setInitializedEditTimeTableId(editTimeTableId);
      return;
    }

    setSelectedClassId(editingTimeTable.classId);
    setSelectedSection(editingTimeTable.section);
    setSelectedAcademicYear(editingTimeTable.academicYear);
    setConfig(editingTimeTable.config);
    setSchedule({
      Monday: editingTimeTable.schedule.Monday || [],
      Tuesday: editingTimeTable.schedule.Tuesday || [],
      Wednesday: editingTimeTable.schedule.Wednesday || [],
      Thursday: editingTimeTable.schedule.Thursday || [],
      Friday: editingTimeTable.schedule.Friday || [],
      Saturday: editingTimeTable.schedule.Saturday || [],
      Sunday: editingTimeTable.schedule.Sunday || [],
    });
    setActiveTab("schedule");
    setInitializedEditTimeTableId(editTimeTableId);
  }, [
    isEditMode,
    editTimeTableId,
    initializedEditTimeTableId,
    allTimeTablesLoading,
    editingTimeTable,
    router,
    role,
  ]);

  // Helper: Check for teacher conflict across all classes
  const checkTeacherConflict = (
    day: DayOfWeek,
    startTime: string,
    endTime: string,
    staffId: string,
  ) => {
    if (!staffId) return null;

    for (const tt of allTimeTables) {
      // Skip checking against the current class/section we are editing
      if (
        tt.classId === selectedClassId &&
        tt.section === selectedSection &&
        tt.academicYear === selectedAcademicYear
      )
        continue;

      const daySchedule = tt.schedule[day] || [];
      for (const slot of daySchedule) {
        if (slot.staffId === staffId && slot.subjectId) {
          // Overlap check: (StartA < EndB) and (EndA > StartB)
          if (startTime < slot.endTime && endTime > slot.startTime) {
            return {
              className: tt.className,
              section: tt.section,
              time: `${slot.startTime} - ${slot.endTime}`,
              subject: slot.subjectName,
            };
          }
        }
      }
    }
    return null;
  };

  // Computed: Get staff name for a subject
  const getSubjectStaff = (subjectId: string) => {
    const subject = subjectById.get(subjectId);
    if (!subject) return { id: "", name: "Not Assigned" };

    const assignedStaffId = subjectAssignmentStaffIdBySubjectId.get(subjectId);
    if (assignedStaffId) {
      const assignedStaff = staffs.find((s) => s.id === assignedStaffId);
      if (assignedStaff) {
        return {
          id: assignedStaff.id,
          name: assignedStaff.name || "Unknown Teacher",
        };
      }
    }

    const legacyStaff = subject.staffId
      ? staffs.find((s) => s.id === subject.staffId)
      : null;
    if (legacyStaff) {
      return {
        id: legacyStaff.id,
        name: legacyStaff.name || "Unknown Teacher",
      };
    }

    return { id: "", name: "Not Assigned" };
  };

  // Helper: Time calculation
  const addMinutes = (time: string, minutes: number) => {
    const [h, m] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(h, m, 0);
    const newDate = new Date(date.getTime() + minutes * 60000);
    return `${newDate.getHours().toString().padStart(2, "0")}:${newDate.getMinutes().toString().padStart(2, "0")}`;
  };

  const constrainedRules = useMemo(() => {
    const deduped = new Map<string, number>();
    rules.forEach((rule) => {
      const trimmedSubjectId = rule.subjectId?.trim();
      if (
        !trimmedSubjectId ||
        !Number.isFinite(rule.maxPeriods) ||
        rule.maxPeriods < 1
      )
        return;
      deduped.set(trimmedSubjectId, Math.floor(rule.maxPeriods));
    });

    return Array.from(deduped.entries()).map(([subjectId, maxPeriods]) => ({
      subjectId,
      maxPeriods,
    }));
  }, [rules]);

  const maxPeriodsBySubject = useMemo(() => {
    const map = new Map<string, number>();
    constrainedRules.forEach((rule) => {
      map.set(rule.subjectId, rule.maxPeriods);
    });
    return map;
  }, [constrainedRules]);

  const getSubjectPeriodsCount = (
    targetSchedule: Record<DayOfWeek, TimeTableSlot[]> = schedule,
  ) => {
    const counts: Record<string, number> = {};
    config.daysOfWeek.forEach((day) => {
      (targetSchedule[day] || []).forEach((slot) => {
        if (slot.isLunchBreak || !slot.subjectId || slot.isForceAssigned) return;
        counts[slot.subjectId] = (counts[slot.subjectId] || 0) + 1;
      });
    });
    return counts;
  };

  const getFirstTeachingSlotIndex = (
    day: DayOfWeek,
    targetSchedule: Record<DayOfWeek, TimeTableSlot[]> = schedule,
  ) => (targetSchedule[day] || []).findIndex((slot) => !slot.isLunchBreak);

  const getSlotConstraintViolation = (
    day: DayOfWeek,
    index: number,
    subjectId: string,
    targetSchedule: Record<DayOfWeek, TimeTableSlot[]> = schedule,
  ) => {
    if (!subjectId) return null;

    const daySchedule = targetSchedule[day] || [];
    const slot = daySchedule[index];
    if (!slot || slot.isLunchBreak)
      return "Cannot assign a subject to a break slot.";

    if (isFirstClassTeacher && firstClassTeacherSubjectId) {
      const firstTeachingSlotIndex = getFirstTeachingSlotIndex(
        day,
        targetSchedule,
      );
      if (
        firstTeachingSlotIndex === index &&
        subjectId !== firstClassTeacherSubjectId
      ) {
        const requiredSubjectName =
          classSubjects.find((s) => s.id === firstClassTeacherSubjectId)
            ?.name || "the class teacher subject";
        return `First period on ${day} must be ${requiredSubjectName}.`;
      }
    }

    const maxPeriods = maxPeriodsBySubject.get(subjectId);
    if (typeof maxPeriods === "number") {
      const counts = getSubjectPeriodsCount(targetSchedule);
      const adjustedCount =
        (counts[subjectId] || 0) - (slot.subjectId === subjectId ? 1 : 0) + 1;
      if (adjustedCount > maxPeriods) {
        const subjectName =
          classSubjects.find((s) => s.id === subjectId)?.name ||
          "Selected subject";
        return `${subjectName} cannot exceed ${maxPeriods} periods in a week.`;
      }
    }

    const { id: staffId, name: staffName } = getSubjectStaff(subjectId);
    const conflict = checkTeacherConflict(
      day,
      slot.startTime,
      slot.endTime,
      staffId,
    );
    if (conflict) {
      return `${staffName} is already teaching ${conflict.subject} in Class ${conflict.className} (${conflict.section}) at ${conflict.time}.`;
    }

    return null;
  };

  const getSelectableSubjectsForSlot = (day: DayOfWeek, index: number) => {
    const daySchedule = schedule[day] || [];
    const slot = daySchedule[index];
    if (!slot || slot.isLunchBreak) return [];

    if (slot.isForceAssigned) {
      return classSubjects;
    }

    return classSubjects.filter((subject) => {
      // Keep the currently selected subject visible even if constraints changed later.
      if (subject.id === slot.subjectId) return true;
      return !getSlotConstraintViolation(day, index, subject.id);
    });
  };

  const validateScheduleBeforeSave = () => {
    const errors: string[] = [];

    if (isFirstClassTeacher && !firstClassTeacherSubjectId) {
      errors.push(
        "Please select the class teacher subject in Generation Constraints & Rules.",
      );
    }

    if (isFirstClassTeacher && firstClassTeacherSubjectId) {
      const requiredSubjectName =
        classSubjects.find((s) => s.id === firstClassTeacherSubjectId)?.name ||
        "selected class teacher subject";
      config.daysOfWeek.forEach((day) => {
        const firstTeachingSlotIndex = getFirstTeachingSlotIndex(day);
        if (firstTeachingSlotIndex < 0) return;
        const firstSlot = schedule[day]?.[firstTeachingSlotIndex];
        if (!firstSlot || (firstSlot.subjectId !== firstClassTeacherSubjectId && !firstSlot.isForceAssigned)) {
          errors.push(`${day}: first period must be ${requiredSubjectName}.`);
        }
      });
    }

    const counts = getSubjectPeriodsCount(schedule);
    maxPeriodsBySubject.forEach((maxPeriods, subjectId) => {
      const assigned = counts[subjectId] || 0;
      if (assigned > maxPeriods) {
        const subjectName =
          classSubjects.find((s) => s.id === subjectId)?.name || subjectId;
        errors.push(
          `${subjectName} exceeds max weekly limit (${assigned}/${maxPeriods}).`,
        );
      }
    });

    config.daysOfWeek.forEach((day) => {
      (schedule[day] || []).forEach((slot) => {
        if (slot.isLunchBreak || !slot.subjectId || !slot.staffId || slot.isForceAssigned) return;

        const conflict = checkTeacherConflict(
          day,
          slot.startTime,
          slot.endTime,
          slot.staffId,
        );
        if (!conflict) return;

        errors.push(
          `${day} ${slot.startTime}-${slot.endTime}: ${slot.staffName || "Teacher"} is already teaching ${conflict.subject} in Class ${conflict.className} (${conflict.section}).`,
        );
      });
    });

    return errors;
  };

  // Logic: Initialize or Rebuild Schedule Structure
  useEffect(() => {
    if (!selectedClassId) return;

    const newSchedule: Record<DayOfWeek, TimeTableSlot[]> = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: [],
      Sunday: [],
    };

    DAYS.forEach((day) => {
      if (config.daysOfWeek.includes(day)) {
        const slots: TimeTableSlot[] = [];
        let currentStartTime = config.startTime;
        let pIndex = 0;
        let lunchAdded = false;

        while (pIndex < config.numberOfPeriods) {
          // Check if current slot is lunch break
          if (
            !lunchAdded &&
            config.lunchBreakDuration > 0 &&
            currentStartTime >= config.lunchBreakStartTime
          ) {
            const lunchEndTime = addMinutes(
              currentStartTime,
              config.lunchBreakDuration,
            );
            slots.push({
              subjectId: "lunch",
              subjectName: "Lunch Break",
              staffId: "",
              staffName: "",
              startTime: currentStartTime,
              endTime: lunchEndTime,
              isLunchBreak: true,
            });
            currentStartTime = lunchEndTime;
            lunchAdded = true;
            continue; // Re-check if the new currentStartTime should be another lunch (not likely) or regular period
          }

          const endTime = addMinutes(currentStartTime, config.periodDuration);

          // Preserve existing assignments if possible by matching start time
          const existingSlot = schedule[day]?.find(
            (s) => s.startTime === currentStartTime && !s.isLunchBreak,
          );

          slots.push({
            subjectId: existingSlot?.subjectId || "",
            subjectName: existingSlot?.subjectName || "",
            staffId: existingSlot?.staffId || "",
            staffName: existingSlot?.staffName || "",
            startTime: currentStartTime,
            endTime: endTime,
            isForceAssigned: existingSlot?.isForceAssigned || false,
          });

          currentStartTime = endTime;
          pIndex++;
        }
        newSchedule[day] = slots;
      }
    });

    setSchedule(newSchedule);
  }, [
    selectedClassId,
    config.numberOfPeriods,
    config.startTime,
    config.periodDuration,
    config.lunchBreakStartTime,
    config.lunchBreakDuration,
    config.daysOfWeek,
  ]);

  // Handler: Update a slot assignment
  const handleSlotChange = (
    day: DayOfWeek,
    index: number,
    subjectId: string,
  ) => {
    if (subjectId === "none") {
      const firstTeachingSlotIndex = getFirstTeachingSlotIndex(day);
      if (
        isFirstClassTeacher &&
        firstClassTeacherSubjectId &&
        index === firstTeachingSlotIndex
      ) {
        const requiredSubjectName =
          classSubjects.find((s) => s.id === firstClassTeacherSubjectId)
            ?.name || "class teacher subject";
        toast.error(
          `First period on ${day} must stay assigned to ${requiredSubjectName}.`,
        );
        return;
      }

      const updatedSchedule = { ...schedule };
      updatedSchedule[day][index] = {
        ...updatedSchedule[day][index],
        subjectId: "",
        subjectName: "",
        staffId: "",
        staffName: "",
      };
      setSchedule(updatedSchedule);
      return;
    }

    const subject = classSubjects.find((s) => s.id === subjectId);
    const { id: staffId, name: staffName } = getSubjectStaff(subjectId);
    
    // Check if slot is force assigned
    const isForceAssigned = !!schedule[day]?.[index]?.isForceAssigned;

    if (!isForceAssigned) {
      const violation = getSlotConstraintViolation(day, index, subjectId);
      if (violation) {
        toast.error(violation, { duration: 5000 });
        return;
      }
    }

    const updatedSchedule = { ...schedule };
    updatedSchedule[day][index] = {
      ...updatedSchedule[day][index],
      subjectId,
      subjectName: subject?.name || "",
      staffId,
      staffName,
    };

    setSchedule(updatedSchedule);
  };

  const handleForceAssignToggle = (day: DayOfWeek, index: number, isForceAssigned: boolean) => {
    const updatedSchedule = { ...schedule };
    if (!updatedSchedule[day]) return;
    updatedSchedule[day][index] = {
      ...updatedSchedule[day][index],
      isForceAssigned,
    };
    setSchedule(updatedSchedule);
  };

  // Handler: Auto Generate Magic using Puter.js
  const autoGenerateSchedule = async () => {
    if (!selectedClassId || !selectedSection) {
      toast.error("Please select both class and section first");
      return;
    }

    if (classSubjects.length === 0) {
      toast.error(
        "No subjects mapped for this class, section, and academic year. Assign them in Staffs first.",
      );
      return;
    }

    if (isFirstClassTeacher && !firstClassTeacherSubjectId) {
      toast.error(
        "Please select the class teacher's subject for the first period.",
      );
      return;
    }

    try {
      // @ts-expect-error
      if (!window.puter || !window.puter.ai) {
        toast.error(
          "AI engine is still loading or unavailable. Please reload the page.",
        );
        return;
      }

      setIsAutoGenerating(true);

      // Construct the prompt describing the problem
      const promptStr = `You are a timetable generator. I will provide you with the configuration and subjects. You must return ONLY valid JSON representing the schedule.
The JSON must be an object with keys matching EXACTLY the days of the week requested, and the values must be an array of objects representing the slots for that day. 
Each slot object MUST have "subjectId", "subjectName", "staffId", "staffName", "startTime", "endTime".
If a slot is a lunch break, it MUST have "isLunchBreak": true, and "subjectId" = "lunch".
If a slot is empty/free, use empty strings for the subject/staff but still provide the time.

Configuration:
Days: ${config.daysOfWeek.join(", ")}
Start Time: ${config.startTime}
End Time: ${config.endTime}
Periods per day: ${config.numberOfPeriods}
Period Duration: ${config.periodDuration} minutes
Lunch Break: ${config.lunchBreakDuration > 0 ? `Starts at ${config.lunchBreakStartTime} for ${config.lunchBreakDuration} minutes` : "No lunch break"}

Available Subjects:
${classSubjects
  .map((sub) => {
    const staff = getSubjectStaff(sub.id);
    return `- ID: ${sub.id}, Name: "${sub.name}", Staff ID: "${staff.id}", Staff Name: "${staff.name}"`;
  })
  .join("\n")}

Constraints & Rules:
1. Ensure the timings match exactly with the periods described. (Increment start time by ${config.periodDuration} mins for each period).
2. Evenly distribute subjects across the week.
${isFirstClassTeacher ? `3. FIRST CLASS -> CLASS TEACHER constraint: The very first period of EACH day MUST be assigned to the subject ID "${firstClassTeacherSubjectId}".` : ""}
${
  rules.length > 0
    ? `4. Maximum periods per week constraints:
${rules
  .map((r) => {
    const subName =
      classSubjects.find((s) => s.id === r.subjectId)?.name || "Unknown";
    return `   - "${subName}" (ID: ${r.subjectId}) can appear AT MOST ${r.maxPeriods} times throughout the entire week.`;
  })
  .join("\n")}`
    : ""
}

Respond ONLY with raw JSON, starting directly with { and ending with }. Do not use markdown like \`\`\`json.`;

      // Call Puter AI
      let response;
      try {
        // @ts-expect-error
        response = await window.puter.ai.chat(promptStr, {
          model: "google/gemma-3n-e2b-it:free",
        });
        // If Puter returns a soft error payload, throw it to trigger fallback
        if (response && response.success === false) {
          throw new Error(response.error || "Unknown API error");
        }
      } catch (err) {
        console.warn(
          "Selected AI model failed, falling back to default high-availability model.",
          err,
        );
        // @ts-expect-error
        response = await window.puter.ai.chat(promptStr);
      }

      let jsonText = response.text || response?.message?.content || "";
      // Strip markdown block if model added it
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```/g, "").trim();
      }

      try {
        const parsedSchedule = JSON.parse(jsonText);

        // Validate if the parsed JSON matches our Record<DayOfWeek, TimeTableSlot[]>
        // Map parsed data into the React state
        const newSchedule: Record<DayOfWeek, TimeTableSlot[]> = {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
          Saturday: [],
          Sunday: [],
        };

        config.daysOfWeek.forEach((day) => {
          if (parsedSchedule[day]) {
            newSchedule[day] = parsedSchedule[day];
          } else {
            // fallback if missing
            newSchedule[day] = schedule[day] || [];
          }
        });

        setSchedule(newSchedule);
        toast.success("Schedule generated successfully generated by AI! ✨");
        setActiveTab("schedule");
      } catch (err) {
        console.error("AI returned invalid JSON:", jsonText, err);
        toast.error("AI returned invalid schedule format. Try again.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate schedule. Check console.");
    } finally {
      setIsAutoGenerating(false);
    }
  };

  // Handler: Save
  const handleSave = async () => {
    if (!selectedClassId || !selectedSection) {
      toast.error("Please select both class and section");
      return;
    }

    const validationErrors = validateScheduleBeforeSave();
    if (validationErrors.length > 0) {
      toast.error(validationErrors[0], { duration: 6000 });
      if (validationErrors.length > 1) {
        toast.error(
          `Please fix ${validationErrors.length - 1} more timetable rule issue(s).`,
        );
      }
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        classId: selectedClassId,
        className: selectedClass?.name || "",
        section: selectedSection,
        academicYear: selectedAcademicYear,
        config,
        schedule,
      };

      if (isEditMode && editTimeTableId) {
        await timeTableService.update(editTimeTableId, payload);
        toast.success("Time table updated successfully!");
      } else {
        await timeTableService.create(payload);
        toast.success("Time table generated and saved successfully!");
      }

      router.push(`/${role}/time-table`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save time table");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-8 space-y-8 max-w-[1600px] animate-in fade-in duration-500">
      <Script src="https://js.puter.com/v2/" strategy="lazyOnload" />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {isEditMode ? "Edit Time Table" : "Time Table Creator"}
            </h1>
          </div>
          <p className="text-muted-foreground ml-10">
            {isEditMode
              ? "Update and refine the existing weekly schedule."
              : "Configure and generate optimized weekly schedules."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push(`/${role}/time-table`)}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            View All
          </Button>
          <Button
            variant="outline"
            onClick={autoGenerateSchedule}
            disabled={!selectedClassId || !selectedSection || isAutoGenerating}
            className="gap-2 border-primary/20 text-primary hover:bg-primary/5 transition-all active:scale-95"
          >
            {isAutoGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Auto-Magic Fill
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || !selectedClassId}
            className="gap-2 shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEditMode ? "Update Time Table" : "Save & Generate"}
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger
            value="schedule"
            className="gap-2"
            disabled={!selectedClassId}
          >
            <Clock className="h-4 w-4" />
            Schedule Builder
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Class Selection Card */}
            <Card className="shadow-sm border-primary/10 bg-card/50 backdrop-blur-sm h-full">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <CardTitle className="text-lg">Class Target</CardTitle>
                </div>
                <CardDescription>
                  Select the group for this time table
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Input
                    value={selectedAcademicYear}
                    onChange={(e) => setSelectedAcademicYear(e.target.value)}
                    placeholder="e.g. 2024-25"
                    className="w-full bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select
                    value={selectedClassId}
                    onValueChange={setSelectedClassId}
                    disabled={isEditMode}
                  >
                    <SelectTrigger className="w-full bg-background/50">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={selectedSection}
                    onValueChange={setSelectedSection}
                    disabled={!selectedClassId || isEditMode}
                  >
                    <SelectTrigger className="w-full bg-background/50">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedClass?.sections.map((sec) => (
                        <SelectItem key={sec} value={sec}>
                          {sec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedClassId && (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-3 mt-4 animate-in slide-in-from-bottom-2">
                    <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                    <div className="text-sm">
                      <p className="font-semibold text-primary">
                        Found {classSubjects.length} subjects
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-xs">
                        Ready to allocate into the schedule grid.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timing Config Card */}
            <Card className="lg:col-span-2 shadow-sm border-primary/10 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <CardTitle className="text-lg">
                    Schedule Configuration
                  </CardTitle>
                </div>
                <CardDescription>
                  Define the operational hours and period structure
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>School Start Time</Label>
                      <Input
                        type="time"
                        value={config.startTime}
                        onChange={(e) =>
                          setConfig({ ...config, startTime: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>School End Time</Label>
                      <Input
                        type="time"
                        value={config.endTime}
                        onChange={(e) =>
                          setConfig({ ...config, endTime: e.target.value })
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Period Duration (min)</Label>
                      <Input
                        type="number"
                        value={config.periodDuration}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            periodDuration: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>No. of Periods</Label>
                      <Input
                        type="number"
                        min={1}
                        max={12}
                        value={config.numberOfPeriods}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            numberOfPeriods: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 p-4 rounded-2xl bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/70 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Lunch Break Settings
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Start Time</Label>
                      <Input
                        type="time"
                        value={config.lunchBreakStartTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lunchBreakStartTime: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Duration (min)</Label>
                      <Input
                        type="number"
                        value={config.lunchBreakDuration}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            lunchBreakDuration: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-4 mt-2">
                    <Label className="text-xs mb-3 block">Working Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS.map((day) => (
                        <button
                          key={day}
                          onClick={() => {
                            const newDays = config.daysOfWeek.includes(day)
                              ? config.daysOfWeek.filter((d) => d !== day)
                              : [...config.daysOfWeek, day];
                            setConfig({ ...config, daysOfWeek: newDays });
                          }}
                          className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all",
                            config.daysOfWeek.includes(day)
                              ? "bg-primary text-primary-foreground shadow-md scale-105"
                              : "bg-background text-muted-foreground border hover:border-primary/30",
                          )}
                        >
                          {day.substring(0, 3)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
              <div className="p-4 border-t bg-muted/20 flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={autoGenerateSchedule}
                  disabled={
                    !selectedClassId || !selectedSection || isAutoGenerating
                  }
                  className="gap-2 text-primary hover:text-primary hover:bg-primary/5"
                >
                  {isAutoGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Auto-Generate Schedule
                </Button>
                <Button
                  onClick={() => setActiveTab("schedule")}
                  disabled={!selectedClassId}
                  className="gap-2"
                >
                  Next: Build Schedule
                  <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            </Card>

            {/* Constraints Card */}
            <Card className="lg:col-span-3 shadow-sm border-primary/10 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <List className="h-4 w-4 text-primary" />
                  <CardTitle className="text-lg">
                    Generation Constraints & Rules
                  </CardTitle>
                </div>
                <CardDescription>
                  Fine-tune the magical AI generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* First Class Teacher */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="first-class-teacher"
                    checked={isFirstClassTeacher}
                    onCheckedChange={(c) => setIsFirstClassTeacher(!!c)}
                  />
                  <label
                    htmlFor="first-class-teacher"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Assign Class Teacher to First Period
                  </label>
                </div>
                {isFirstClassTeacher && (
                  <div className="ml-6 space-y-2 max-w-sm">
                    <Label>Select Class Teacher's Subject</Label>
                    <Select
                      value={firstClassTeacherSubjectId}
                      onValueChange={setFirstClassTeacherSubjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {classSubjects.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Custom rules */}
                <div>
                  <Label className="mb-2 block">
                    Subject Specific Limits (Max Periods / Week)
                  </Label>
                  <div className="space-y-3">
                    {rules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="flex flex-wrap md:flex-nowrap items-center gap-3"
                      >
                        <Select
                          value={rule.subjectId}
                          onValueChange={(val) => {
                            const newRules = [...rules];
                            newRules[idx].subjectId = val;
                            setRules(newRules);
                          }}
                        >
                          <SelectTrigger className="w-[200px] bg-background/50">
                            <SelectValue placeholder="Select Subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {classSubjects.map((sub) => (
                              <SelectItem key={sub.id} value={sub.id}>
                                {sub.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">
                            Max Periods:
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            value={rule.maxPeriods}
                            onChange={(e) => {
                              const newRules = [...rules];
                              newRules[idx].maxPeriods =
                                parseInt(e.target.value) || 1;
                              setRules(newRules);
                            }}
                            className="w-20 bg-background/50"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newRules = [...rules];
                            newRules.splice(idx, 1);
                            setRules(newRules);
                          }}
                          className="hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setRules([...rules, { subjectId: "", maxPeriods: 1 }])
                      }
                      className="gap-2 mt-2"
                    >
                      <Plus className="h-4 w-4" /> Add Rule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-6">
          <Card className="shadow-2xl border-primary/20 bg-background/80 backdrop-blur-md overflow-hidden">
            <div className="p-4 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-background">
                  {selectedClass?.name} - {selectedSection}
                </Badge>
                <span className="text-sm text-muted-foreground">|</span>
                <span className="text-sm font-medium">
                  {config.daysOfWeek.length} Days Active
                </span>
              </div>
              <div className="text-xs text-muted-foreground italic flex items-center gap-2">
                <Users className="h-3 w-3" />
                Teachers are auto-assigned from staff subject assignments
              </div>
            </div>

            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="p-4 border-r text-left text-xs font-bold uppercase tracking-widest text-muted-foreground w-40">
                      Period / Day
                    </th>
                    {config.daysOfWeek.map((day) => (
                      <th
                        key={day}
                        className="p-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground min-w-[200px]"
                      >
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const activeDay = config.daysOfWeek[0] || "Monday";
                    const rows = schedule[activeDay] || [];
                    let currentPeriodNumber = 1;

                    return rows.map((templateSlot, rowIdx) => {
                      const isLunch = templateSlot.isLunchBreak;
                      const periodLabel = isLunch
                        ? "Break"
                        : `Period ${currentPeriodNumber++}`;

                      return (
                        <tr
                          key={rowIdx}
                          className={cn(
                            "border-t transition-colors",
                            isLunch
                              ? "bg-orange-50/50 hover:bg-orange-50"
                              : "hover:bg-muted/5",
                          )}
                        >
                          <td
                            className={cn(
                              "p-4 border-r bg-muted/10",
                              isLunch && "bg-orange-100/20",
                            )}
                          >
                            <div className="flex flex-col gap-1">
                              <span
                                className={cn(
                                  "text-sm font-bold",
                                  isLunch ? "text-orange-600" : "text-primary",
                                )}
                              >
                                {periodLabel}
                              </span>
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                                <Clock className="h-3 w-3" />
                                {templateSlot.startTime} -{" "}
                                {templateSlot.endTime}
                              </div>
                            </div>
                          </td>
                          {config.daysOfWeek.map((day) => {
                            const slot = schedule[day]?.[rowIdx];
                            if (!slot)
                              return (
                                <td key={`${day}-${rowIdx}`} className="p-3" />
                              );
                            const availableSubjects =
                              getSelectableSubjectsForSlot(day, rowIdx);

                            if (isLunch) {
                              return (
                                <td
                                  key={`${day}-${rowIdx}`}
                                  className="p-3 text-center"
                                >
                                  <div className="py-3 px-4 rounded-lg bg-orange-100/30 border border-orange-200/50 text-orange-700 font-bold text-xs uppercase tracking-widest">
                                    Lunch Break
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={`${day}-${rowIdx}`} className="p-3">
                                <Select
                                  value={slot.subjectId || ""}
                                  onValueChange={(val) =>
                                    handleSlotChange(day, rowIdx, val)
                                  }
                                >
                                  <SelectTrigger
                                    className={cn(
                                      "h-auto py-3 px-4 border-dashed transition-all duration-300",
                                      slot.subjectId
                                        ? "bg-card border-primary/20 shadow-sm"
                                        : "bg-muted/30 opacity-60 hover:opacity-100",
                                    )}
                                  >
                                    <SelectValue placeholder="Select Subject">
                                      {slot.subjectId ? (
                                        <div className="text-left w-full space-y-1">
                                          <div className="text-sm font-bold leading-tight">
                                            {slot.subjectName}
                                          </div>
                                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <Users className="h-2.5 w-2.5" />
                                            {slot.staffName}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Plus className="h-3 w-3" />
                                          Empty Slot
                                        </div>
                                      )}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <div className="p-2 border-b bg-muted/20 flex items-center justify-between mb-1" onPointerDown={(e) => e.stopPropagation()}>
                                        <label htmlFor={`force-${day}-${rowIdx}`} className="text-xs font-semibold text-foreground cursor-pointer flex-1">
                                            Force Assign Subject
                                            <p className="text-[10px] text-muted-foreground font-normal">Ignores conflicts</p>
                                        </label>
                                        <Checkbox
                                            id={`force-${day}-${rowIdx}`}
                                            checked={slot.isForceAssigned || false}
                                            onCheckedChange={(c) => handleForceAssignToggle(day, rowIdx, !!c)}
                                        />
                                    </div>
                                    <SelectItem value="none">
                                      -- Empty --
                                    </SelectItem>
                                    {availableSubjects.length === 0 && (
                                      <SelectItem
                                        value={`no-option-${day}-${rowIdx}`}
                                        disabled
                                      >
                                        No valid subjects available
                                      </SelectItem>
                                    )}
                                    {availableSubjects.map((sub) => (
                                      <SelectItem key={sub.id} value={sub.id}>
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {sub.name}
                                          </span>
                                          <span className="text-[10px] text-muted-foreground">
                                            Teacher:{" "}
                                            {getSubjectStaff(sub.id).name}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-4">
              <div className="p-3 bg-emerald-500/20 rounded-xl">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-bold text-emerald-900">
                  Consistency Checked
                </h4>
                <p className="text-sm text-emerald-700/80">
                  The system automatically ensures each slot is calculated
                  within your operational hours.
                </p>
              </div>
            </div>
            <Card
              className="shadow-lg hover:shadow-xl transition-all border-primary/10 group cursor-pointer"
              onClick={handleSave}
            >
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary transition-colors">
                    <Download className="h-8 w-8 text-primary group-hover:text-white transition-colors" />
                  </div>
                  <div>
                    <h4 className="font-bold">Finalize & Download</h4>
                    <p className="text-sm text-muted-foreground">
                      Save this schedule to the database and get your PDF.
                    </p>
                  </div>
                </div>
                <Plus className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
