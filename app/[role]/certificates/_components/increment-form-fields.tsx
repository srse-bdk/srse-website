"use client";

import { UseFormReturn } from "react-hook-form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import { Autocomplete, type AutocompleteOption } from "@/components/core/autocomplete";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { User } from "@/lib/types/user.type";
import type { IncrementLetterData } from "./certificate-types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, MousePointer2 } from "lucide-react";

interface IncrementFormFieldsProps {
  form: UseFormReturn<IncrementLetterData>;
}

export function IncrementFormFields({ form }: IncrementFormFieldsProps) {
  const { data: staffsData } = useFirebaseRealtime<User>("users", {
    asArray: true,
  });

  const staffs = (staffsData as User[])?.filter((u) => u.role === "staff") || [];

  const staffOptions: AutocompleteOption[] = staffs.map((s) => ({
    label: s.name,
    value: s.uid,
  }));

  const staffSelectionMode = form.watch("staffSelectionMode");

  const handleStaffSelect = (uid: string) => {
    const staff = staffs.find((s) => s.uid === uid);
    if (staff) {
      form.setValue("staffName", staff.name);
      if (staff.gender) {
        form.setValue("gender", staff.gender as any);
      }
    }
  };

  const previousSalary = form.watch("previousSalary");
  const newSalary = form.watch("newSalary");

  const calculatedIncrement = useMemo(() => {
    if (previousSalary && newSalary && newSalary > previousSalary) {
      const amount = newSalary - previousSalary;
      const percentage = ((amount / previousSalary) * 100).toFixed(2);
      return { amount, percentage: parseFloat(percentage) };
    }
    return null;
  }, [previousSalary, newSalary]);

  // Auto-update increment fields when salaries change
  useMemo(() => {
    if (calculatedIncrement) {
      form.setValue("incrementAmount", calculatedIncrement.amount);
      form.setValue("incrementPercentage", calculatedIncrement.percentage);
    }
  }, [calculatedIncrement, form]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Increment Letter Details</CardTitle>
        <FormField
          control={form.control}
          name="staffSelectionMode"
          render={({ field }) => (
            <Tabs
              value={field.value}
              onValueChange={field.onChange}
              className="w-[200px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  List
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <MousePointer2 className="h-4 w-4" />
                  Own
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {staffSelectionMode === "list" ? (
          <FormItem>
            <FormLabel>Choose Staff Member</FormLabel>
            <FormControl>
              <Autocomplete
                options={staffOptions}
                value={
                  staffs.find((s) => s.name === form.watch("staffName"))?.uid ||
                  ""
                }
                onChange={handleStaffSelect}
                placeholder="Select a staff member"
                emptyMessage="No staff found."
              />
            </FormControl>
            <FormDescription>
              Details like name and gender will be filled automatically.
            </FormDescription>
            <FormMessage />
          </FormItem>
        ) : (
          <FormField
            control={form.control}
            name="staffName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Staff Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter staff name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="previousSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Previous Salary</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="Enter previous salary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newSalary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Salary</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="Enter new salary"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {calculatedIncrement && (
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <p className="text-sm font-medium">Auto-calculated:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormField
                  control={form.control}
                  name="incrementAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Increment Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          value={field.value || calculatedIncrement.amount}
                          readOnly
                          className="bg-background"
                        />
                      </FormControl>
                      <FormDescription>
                        Auto-calculated (editable)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div>
                <FormField
                  control={form.control}
                  name="incrementPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Increment Percentage</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? parseFloat(e.target.value)
                                : undefined
                            )
                          }
                          value={field.value || calculatedIncrement.percentage}
                          readOnly
                          className="bg-background"
                        />
                      </FormControl>
                      <FormDescription>
                        Auto-calculated (editable)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        )}

        {staffSelectionMode === "manual" && (
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Used for Mr./Ms. and He/She replacements
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="effectiveDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Effective Date</FormLabel>
              {(form as any).watch("dateInputType") === "manual" ? (
                <FormControl>
                  <Input {...field} placeholder="e.g., 01/01/2020" />
                </FormControl>
              ) : (
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Pick a date"
                  />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason/Justification</FormLabel>
              <FormControl>
                <RichTextEditor
                  content={field.value}
                  onChange={(content) => field.onChange(content)}
                  placeholder="Enter reason for increment, performance justification, etc..."
                />
              </FormControl>
              <FormDescription>
                Optional: Add reason or justification for the increment
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="additionalNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Any additional notes or information"
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
