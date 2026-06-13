"use client";

import type { Control, FieldPath, FieldValues } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BloodGroup } from "@/lib/types/student.type";
import {
  BLOOD_GROUP_OPTIONS,
  normalizeBloodGroup,
} from "@/lib/utils/blood-group";

interface BloodGroupFormFieldProps<T extends FieldValues> {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  optional?: boolean;
}

export function BloodGroupFormField<T extends FieldValues>({
  control,
  name,
  label = "Blood Group",
  optional = true,
}: BloodGroupFormFieldProps<T>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selected = normalizeBloodGroup(field.value) ?? field.value;
        const selectValue = selected || "none";

        return (
          <FormItem className="space-y-1.5">
            <FormLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex justify-between">
              {label}
              {optional ? (
                <span className="font-normal lowercase opacity-60">
                  Optional
                </span>
              ) : null}
            </FormLabel>
            <Select
              key={`${String(name)}-${selectValue}`}
              value={selectValue}
              onValueChange={(value) =>
                field.onChange(
                  value === "none" ? undefined : (value as BloodGroup),
                )
              }
            >
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select blood group" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {optional ? (
                  <SelectItem value="none">Not specified</SelectItem>
                ) : null}
                {BLOOD_GROUP_OPTIONS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
