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
import type { OfficialAppointmentLetterData } from "./letter-types";
import { StaffPersonPicker } from "./staff-person-picker";
import { SignatoryFormFields } from "./signatory-form-fields";
import type { User } from "@/lib/types/user.type";

interface AppointmentLetterFormFieldsProps {
  form: UseFormReturn<OfficialAppointmentLetterData>;
}

export function AppointmentLetterFormFields({
  form,
}: AppointmentLetterFormFieldsProps) {
  const handleStaffSelect = (staff: User) => {
    if (staff.scanId) {
      form.setValue("employeeId", staff.scanId);
    }
    if (staff.position) {
      form.setValue("positionTitle", staff.position);
    }
  };

  return (
    <div className="space-y-6">
      <StaffPersonPicker
        form={form}
        nameField="employeeName"
        onStaffSelect={handleStaffSelect}
        manualLabel="Any person"
      />

      <Card>
        <CardHeader>
          <CardTitle>Appointment details</CardTitle>
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
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Joining date</FormLabel>
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
                <FormLabel>Employee ID (optional)</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Optional" />
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
            name="positionTitle"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Position title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g. Assistant Teacher – Level 2" />
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
            name="monthlySalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly salary (INR, optional)</FormLabel>
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
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="probationMonths"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Probation (months)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={0}
                    max={12}
                    value={field.value ?? 6}
                    onChange={(event) =>
                      field.onChange(Number(event.target.value) || 0)
                    }
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
