"use client";

import { DatePicker } from "@/components/ui/date-picker";
import { Autocomplete, type AutocompleteOption } from "@/components/core/autocomplete";
import type { User } from "@/lib/types/user.type";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

interface AttendanceFiltersProps {
  selectedDate: Date;
  selectedStaffId: string;
  staffs: User[];
  onDateSelect: (date: Date | undefined) => void;
  onStaffSelect: (staffId: string) => void;
}

export function AttendanceFilters({
  selectedDate,
  selectedStaffId,
  staffs,
  onDateSelect,
  onStaffSelect,
}: AttendanceFiltersProps) {
  const staffOptions = useMemo<AutocompleteOption[]>(() => {
    const options: AutocompleteOption[] = [
      { value: "all", label: "All Staff" },
    ];
    staffs.forEach((staff) => {
      options.push({
        value: staff.uid,
        label: staff.name,
      });
    });
    return options;
  }, [staffs]);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:flex-1 lg:flex-initial min-w-0">
      <DatePicker
        value={selectedDate}
        onSelect={onDateSelect}
        className="w-full sm:w-1/2 lg:w-[240px]"
      />
      <div className="w-full sm:w-1/2 lg:w-[240px] min-w-0">
        <Autocomplete
          options={staffOptions}
          value={selectedStaffId || "all"}
          onChange={onStaffSelect}
          placeholder="Select staff"
          emptyMessage="No staff found."
          className="w-full"
        />
      </div>
    </div>
  );
}
