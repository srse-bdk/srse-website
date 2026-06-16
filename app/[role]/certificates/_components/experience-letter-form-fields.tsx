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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import type { OfficialExperienceLetterData } from "./letter-types";
import { StaffPersonPicker } from "./staff-person-picker";
import { SignatoryFormFields } from "./signatory-form-fields";
import type { User } from "@/lib/types/user.type";

interface ExperienceLetterFormFieldsProps {
  form: UseFormReturn<OfficialExperienceLetterData>;
}

export function ExperienceLetterFormFields({
  form,
}: ExperienceLetterFormFieldsProps) {
  const handleStaffSelect = (staff: User) => {
    if (staff.scanId) {
      form.setValue("employeeId", staff.scanId);
    }
    if (staff.position) {
      form.setValue("designation", staff.position);
    }
  };

  return (
    <div className="space-y-6">
      <StaffPersonPicker
        form={form}
        nameField="personName"
        onStaffSelect={handleStaffSelect}
        manualLabel="Any person"
      />

      <Card>
        <CardHeader>
          <CardTitle>Experience details</CardTitle>
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
            name="employeeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reference / Emp ID (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="designation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Designation</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Assistant Teacher" />
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
                <FormLabel>Location (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Bhadrak" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment start date</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employment end date (optional)</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="additionalParagraph"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Additional paragraph (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={4}
                    placeholder="Optional custom closing paragraph"
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
