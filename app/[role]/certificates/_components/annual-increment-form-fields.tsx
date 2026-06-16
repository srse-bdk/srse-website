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
import type { AnnualIncrementLetterData } from "./letter-types";
import { StaffPersonPicker } from "./staff-person-picker";
import { SignatoryFormFields } from "./signatory-form-fields";
import type { User } from "@/lib/types/user.type";

interface AnnualIncrementFormFieldsProps {
  form: UseFormReturn<AnnualIncrementLetterData>;
}

export function AnnualIncrementFormFields({
  form,
}: AnnualIncrementFormFieldsProps) {
  const handleStaffSelect = (staff: User) => {
    if (staff.scanId) {
      form.setValue("employeeId", staff.scanId);
    }
    if (staff.position) {
      // no job title field on increment letter body
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
          <CardTitle>Annual increment details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="letterDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Letter date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="effectiveDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Effective from</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee ID</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. 24SR003" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Bhadrak" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="revisedSalary"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Revised monthly salary (INR)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    value={field.value ?? ""}
                    onChange={(event) =>
                      field.onChange(
                        event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      )
                    }
                    placeholder="e.g. 4000"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      <SignatoryFormFields
        form={
          form as unknown as UseFormReturn<{
            signatoryName: string;
            signatoryTitle: string;
          }>
        }
      />
    </div>
  );
}
