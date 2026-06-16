"use client";

import { UseFormReturn } from "react-hook-form";
import { List, MousePointer2 } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Autocomplete, type AutocompleteOption } from "@/components/core/autocomplete";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { User } from "@/lib/types/user.type";

type PersonForm = {
  staffSelectionMode?: "list" | "manual";
  gender?: "male" | "female" | "other";
};

interface StaffPersonPickerProps<T extends PersonForm> {
  form: UseFormReturn<T>;
  nameField: keyof T & string;
  onStaffSelect?: (staff: User) => void;
  includeNonStaff?: boolean;
  manualLabel?: string;
}

export function StaffPersonPicker<T extends PersonForm>({
  form,
  nameField,
  onStaffSelect,
  includeNonStaff = false,
  manualLabel = "Manual entry",
}: StaffPersonPickerProps<T>) {
  const { data: usersData } = useFirebaseRealtime<User>("users", {
    asArray: true,
  });

  const staffList =
    (usersData as User[])?.filter(
      (user) => user.role === "staff" || (includeNonStaff && user.role !== "student"),
    ) || [];

  const staffOptions: AutocompleteOption[] = staffList.map((staff) => ({
    label: staff.scanId
      ? `${staff.name} (${staff.scanId})`
      : staff.name,
    value: staff.uid,
  }));

  const staffSelectionMode = form.watch("staffSelectionMode" as any) || "manual";
  const currentName = form.watch(nameField as any) as string;

  const handleStaffSelect = (uid: string) => {
    const staff = staffList.find((item) => item.uid === uid);
    if (!staff) return;

    form.setValue(nameField as any, staff.name as any);
    if (staff.gender) {
      form.setValue("gender" as any, staff.gender as any);
    }
    onStaffSelect?.(staff);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle>Person details</CardTitle>
        <FormField
          control={form.control}
          name={"staffSelectionMode" as any}
          render={({ field }) => (
            <Tabs
              value={field.value || "manual"}
              onValueChange={field.onChange}
              className="w-[220px]"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list" className="gap-1 text-xs">
                  <List className="h-3.5 w-3.5" />
                  Staff
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-1 text-xs">
                  <MousePointer2 className="h-3.5 w-3.5" />
                  {manualLabel}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {staffSelectionMode === "list" ? (
          <FormItem>
            <FormLabel>Choose from staff list</FormLabel>
            <FormControl>
              <Autocomplete
                options={staffOptions}
                value={
                  staffList.find((staff) => staff.name === currentName)?.uid || ""
                }
                onChange={handleStaffSelect}
                placeholder="Select staff member"
                emptyMessage="No staff found."
              />
            </FormControl>
            <FormDescription>
              Name and gender are filled automatically. You can still edit below.
            </FormDescription>
          </FormItem>
        ) : null}

        <FormField
          control={form.control}
          name={nameField as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Full name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={"gender" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gender (for salutation)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
