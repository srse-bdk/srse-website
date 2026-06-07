"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AcademicYearPickerProps {
  selectedYear: string;
  onYearChange: (year: string) => void;
}

export function AcademicYearPicker({
  selectedYear,
  onYearChange,
}: AcademicYearPickerProps) {
  // Generate academic years: current year - 2 to current year + 2
  const currentYear = new Date().getFullYear();
  const years = React.useMemo(() => {
    const options = [];
    for (let i = -2; i <= 2; i++) {
      const year = currentYear + i;
      options.push(`${year}-${year + 1}`);
    }
    return options;
  }, [currentYear]);

  return (
    <Select value={selectedYear} onValueChange={onYearChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select Academic Year" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
