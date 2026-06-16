"use client";

import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import type { TermsConditionsLetterData } from "./letter-types";
import { StaffPersonPicker } from "./staff-person-picker";
import type { User } from "@/lib/types/user.type";

interface TermsConditionsFormFieldsProps {
  form: UseFormReturn<TermsConditionsLetterData>;
}

export function TermsConditionsFormFields({
  form,
}: TermsConditionsFormFieldsProps) {
  const handleStaffSelect = (staff: User) => {
    if (staff.position) {
      form.setValue("jobTitle", staff.position);
    }
  };

  return (
    <div className="space-y-6">
      <StaffPersonPicker
        form={form}
        nameField="employeeName"
        onStaffSelect={handleStaffSelect}
      />

      <Card>
        <CardHeader>
          <CardTitle>Terms &amp; conditions details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="jobTitle"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Job title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g. Assistant Teacher – Level 2"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reportingTo"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Reporting to</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Principal, S R School of Excellence"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="noticePeriodMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notice period (months)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={field.value ?? 2}
                    onChange={(event) =>
                      field.onChange(Number(event.target.value) || 2)
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="acknowledgmentDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Acknowledgment date (optional)</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
