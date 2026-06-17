"use client";

import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import type { TermsConditionsLetterData } from "./letter-types";
import { StaffPersonPicker } from "./staff-person-picker";
import {
  SpellcheckInput,
  SpellcheckTextarea,
} from "./spellcheck-text-field";
import { defaultAdditionalRoleText } from "@/lib/config/school-letterhead";
import type { User } from "@/lib/types/user.type";

interface TermsConditionsFormFieldsProps {
  form: UseFormReturn<TermsConditionsLetterData>;
}

export function TermsConditionsFormFields({
  form,
}: TermsConditionsFormFieldsProps) {
  const includeAdditionalRole = form.watch("includeAdditionalRole");

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
                  <SpellcheckInput
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
                  <SpellcheckInput
                    {...field}
                    placeholder="Principal, S R School of Excellence"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="sm:col-span-2 space-y-3 rounded-lg border p-4">
            <FormField
              control={form.control}
              name="includeAdditionalRole"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between gap-4 space-y-0">
                  <div>
                    <FormLabel>Additional role (Job Title &amp; Responsibilities)</FormLabel>
                    <FormDescription>
                      Appended to the first bullet on the printed letter.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            {includeAdditionalRole ? (
              <FormField
                control={form.control}
                name="additionalRoleText"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional role text</FormLabel>
                    <FormControl>
                      <SpellcheckTextarea
                        {...field}
                        rows={3}
                        placeholder={defaultAdditionalRoleText}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>

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
