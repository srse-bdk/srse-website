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
import { Autocomplete, type AutocompleteOption } from "@/components/core/autocomplete";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { User } from "@/lib/types/user.type";
import type { AppointmentLetterData } from "./certificate-types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { List, MousePointer2 } from "lucide-react";

interface AppointmentFormFieldsProps {
  form: UseFormReturn<AppointmentLetterData>;
}

export function AppointmentFormFields({ form }: AppointmentFormFieldsProps) {
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
      if (staff.position) {
        form.setValue("positionTitle", staff.position);
      }
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Appointment Letter Details</CardTitle>
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
              Details like name, position/title, and gender will be filled automatically.
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

        <FormField
          control={form.control}
          name="positionTitle"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Position Title</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Mathematics Teacher" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="department"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Department (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Science, Arts" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date</FormLabel>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="salaryAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Salary Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value ? parseFloat(e.target.value) : undefined
                      )
                    }
                    placeholder="Enter amount"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salaryCurrency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Currency</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="₹">₹ (Rupee)</SelectItem>
                    <SelectItem value="$">$ (Dollar)</SelectItem>
                    <SelectItem value="€">€ (Euro)</SelectItem>
                    <SelectItem value="£">£ (Pound)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="reportingManager"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reporting Manager (Optional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Name of reporting manager" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="termsAndConditions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Terms and Conditions</FormLabel>
              <FormControl>
                <RichTextEditor
                  content={field.value}
                  onChange={(content) => field.onChange(content)}
                  placeholder="Enter terms and conditions, job responsibilities, etc..."
                />
              </FormControl>
              <FormDescription>
                Optional: Add detailed terms and conditions
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="additionalClauses"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Clauses</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Any additional clauses or information"
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
