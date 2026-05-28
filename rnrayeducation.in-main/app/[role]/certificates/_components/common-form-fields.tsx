"use client";

import { UseFormReturn } from "react-hook-form";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { useUploadThing } from "@/lib/utils/uploadthing";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/ui/rich-text-editor";


interface CommonFormFieldsProps {
  form: UseFormReturn<any>;
  isUploadingLogo?: boolean;
  isUploadingSignature?: boolean;
  onLogoUpload?: (file: File) => void;
  onSignatureUpload?: (file: File) => void;
}

export function CommonFormFields({
  form,
  isUploadingLogo = false,
  isUploadingSignature = false,
  onLogoUpload,
  onSignatureUpload,
}: CommonFormFieldsProps) {
  const watchedLogo = form.watch("schoolLogo");
  const watchedSignature = form.watch("signatureImage");

  return (
    <div className="space-y-6">
      {/* Header/Logo Section */}
      <Card>
        <CardHeader>
          <CardTitle>Header & Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="schoolLogo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Logo</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {watchedLogo ? (
                      <div className="relative inline-block">
                        <Image
                          src={watchedLogo}
                          alt="School Logo"
                          width={100}
                          height={100}
                          className="object-contain border rounded"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            field.onChange("");
                            form.setValue("schoolLogo", "");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onLogoUpload) {
                              onLogoUpload(file);
                            }
                          }}
                          disabled={isUploadingLogo}
                          className="cursor-pointer"
                        />
                        {isUploadingLogo && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Uploading...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  Upload your school logo (max 4MB)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="schoolName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Enter school name"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="schoolAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>School Address</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Enter school address"
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="headerFontSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Header Font Size</FormLabel>
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
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="headerTextColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Header Text Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" {...field} className="w-20 h-10" />
                      <Input
                        type="text"
                        {...field}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* Certificate Body Section */}
      <Card>
        <CardHeader>
          <CardTitle>Certificate Body</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="certificateTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Certificate Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter certificate title" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bodyContent"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Body Content</FormLabel>
                <FormControl>
                  <RichTextEditor
                    content={field.value}
                    onChange={(content) => field.onChange(content)}
                    placeholder="Enter certificate body content..."
                  />
                </FormControl>
                <FormDescription>
                  Use the editor to format your certificate content
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="fontFamily"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font Family</FormLabel>
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
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Times New Roman">
                        Times New Roman
                      </SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                      <SelectItem value="Helvetica">Helvetica</SelectItem>
                      <SelectItem value="Courier New">Courier New</SelectItem>
                      <SelectItem value="Roboto">Roboto</SelectItem>
                      <SelectItem value="Open Sans">Open Sans</SelectItem>
                      <SelectItem value="Lato">Lato</SelectItem>
                      <SelectItem value="Montserrat">Montserrat</SelectItem>
                      <SelectItem value="Playfair Display">
                        Playfair Display
                      </SelectItem>
                      <SelectItem value="Outfit">Outfit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="fontSize"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Font Size</FormLabel>
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
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="textColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Text Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" {...field} className="w-20 h-10" />
                      <Input
                        type="text"
                        {...field}
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lineSpacing"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Line Spacing</FormLabel>
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
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="1.5">1.5</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="2.5">2.5</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="textAlignment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Text Alignment</FormLabel>
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
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="center">Center</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                    <SelectItem value="justify">Justify</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Footer/Signature Section */}
      <Card>
        <CardHeader>
          <CardTitle>Footer & Signature</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="signatoryName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signatory Name</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Enter signatory name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="signatoryTitle"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signatory Title</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Principal, Director" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="signatureImage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Signature Image</FormLabel>
                <FormControl>
                  <div className="space-y-2">
                    {watchedSignature ? (
                      <div className="relative inline-block">
                        <Image
                          src={watchedSignature}
                          alt="Signature"
                          width={150}
                          height={60}
                          className="object-contain border rounded bg-white"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            field.onChange("");
                            form.setValue("signatureImage", "");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file && onSignatureUpload) {
                              onSignatureUpload(file);
                            }
                          }}
                          disabled={isUploadingSignature}
                          className="cursor-pointer"
                        />
                        {isUploadingSignature && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Uploading...
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </FormControl>
                <FormDescription>
                  Upload signature image (max 4MB)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateFormat"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date Format</FormLabel>
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
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    <SelectItem value="DD MMM YYYY">DD MMM YYYY</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateInputType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date Input Type</FormLabel>
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
                    <SelectItem value="picker">Calendar Picker</SelectItem>
                    <SelectItem value="manual">Manual Text Input</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Choose how you want to enter dates
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="footerText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Footer Text</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Additional footer text (optional)"
                    rows={2}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Layout & Styling Section */}
      <Card>
        <CardHeader>
          <CardTitle>Layout & Styling</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="borderStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Border Style</FormLabel>
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
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="borderWidth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Border Width (px)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                      min={0}
                      max={10}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="borderColor"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Border Color</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input type="color" {...field} className="w-20 h-10" />
                    <Input
                      type="text"
                      {...field}
                      placeholder="#000000"
                      className="flex-1"
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="backgroundColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Color</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input type="color" {...field} className="w-20 h-10" />
                      <Input
                        type="text"
                        {...field}
                        placeholder="#ffffff"
                        className="flex-1"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="padding"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Padding (px)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) =>
                        field.onChange(parseInt(e.target.value) || 0)
                      }
                      min={0}
                      max={100}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
