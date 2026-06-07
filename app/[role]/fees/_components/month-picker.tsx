"use client";

import * as React from "react";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface MonthPickerProps {
  date: Date;
  setDate: (date: Date) => void;
}

export function MonthPicker({ date, setDate }: MonthPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [menuYear, setMenuYear] = React.useState(date.getFullYear());

  React.useEffect(() => {
    if (open) {
      setMenuYear(date.getFullYear());
    }
  }, [open, date]);

  const nextMonth = () => {
    setDate(addMonths(date, 1));
  };

  const prevMonth = () => {
    setDate(subMonths(date, 1));
  };

  const nextYear = () => {
    setMenuYear((prev) => prev + 1);
  };

  const prevYear = () => {
    setMenuYear((prev) => prev - 1);
  };

  const selectMonth = (monthIndex: number) => {
    const newDate = new Date(menuYear, monthIndex, 1);
    setDate(newDate);
    setOpen(false);
  };

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={prevMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[180px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "MMMM yyyy") : <span>Pick a month</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={prevYear}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="font-semibold">{menuYear}</div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={nextYear}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {months.map((month, index) => {
                const isSelected =
                  date.getMonth() === index && date.getFullYear() === menuYear;
                return (
                  <Button
                    key={month}
                    variant={isSelected ? "default" : "outline"}
                    className={cn(
                      "h-9 w-full text-xs",
                      !isSelected &&
                        "hover:bg-accent hover:text-accent-foreground",
                    )}
                    onClick={() => selectMonth(index)}
                  >
                    {month.slice(0, 3)}
                  </Button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8"
        onClick={nextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
