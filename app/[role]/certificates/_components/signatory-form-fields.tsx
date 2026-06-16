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
import { schoolLetterheadDefaults } from "@/lib/config/school-letterhead";

interface SignatoryFormFieldsProps {
  form: UseFormReturn<{
    signatoryName: string;
    signatoryTitle: string;
  }>;
}

export function SignatoryFormFields({
  form,
}: SignatoryFormFieldsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Signatory</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name={"signatoryName" as "signatoryName"}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Signatory name</FormLabel>
              <FormControl>
                <Input {...field} placeholder={schoolLetterheadDefaults.signatoryName} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"signatoryTitle" as "signatoryTitle"}
          render={({ field }) => (
            <FormItem className="sm:col-span-2">
              <FormLabel>Signatory title</FormLabel>
              <FormControl>
                <Input {...field} placeholder={schoolLetterheadDefaults.signatoryTitle} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
}
