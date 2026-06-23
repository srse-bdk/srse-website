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
import { Checkbox } from "@/components/ui/checkbox";
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
        <CardContent className="grid gaps-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="designation"
            render={({ field}) => (
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
            name="startDate"
            render={({ field}) => (
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
            render={({ field}) => (
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
            render={({ field}) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Print options</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="skipLetterhead"
            render={({ field}) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Print on pre-printed letterhead</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Hides the digital header and footer while keeping the same
                    spacing and background logo watermark so content does not
                    overlap your printed letterhead.
                  </p>
                </div>
              </FormItem>
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
