"use client";

import { mutate } from "@atechhub/firebase";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { IdCardSettings } from "@/lib/types/id-card-settings.type";
import { useUploadThing } from "@/lib/utils/uploadthing";

export function IdCardSettingsPanel() {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const { data: settingsData, loading } = useFirebaseRealtime<IdCardSettings>(
    "settings/idCard",
    { asArray: false },
  );

  const settings = settingsData as IdCardSettings | null;
  const signatureUrl = settings?.principalSignatureUrl;

  const { startUpload } = useUploadThing("imageUploader", {
    onClientUploadComplete: async (res) => {
      const uploaded = res?.[0];
      if (!uploaded?.url) {
        setIsUploading(false);
        toast.error("Upload failed");
        return;
      }

      try {
        await mutate({
          action: "update",
          path: "settings/idCard",
          data: {
            principalSignatureUrl: uploaded.url,
            principalSignatureFileKey: uploaded.key,
            updatedAt: new Date().toISOString(),
          },
          actionBy: "admin",
        });
        toast.success("Principal signature saved");
      } catch (error) {
        console.error("Failed to save signature:", error);
        toast.error("Failed to save signature");
      } finally {
        setIsUploading(false);
      }
    },
    onUploadError: (error) => {
      setIsUploading(false);
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    startUpload([file]);
    event.target.value = "";
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await mutate({
        action: "update",
        path: "settings/idCard",
        data: {
          principalSignatureUrl: "",
          principalSignatureFileKey: "",
          updatedAt: new Date().toISOString(),
        },
        actionBy: "admin",
      });
      toast.success("Signature removed");
    } catch (error) {
      console.error("Failed to remove signature:", error);
      toast.error("Failed to remove signature");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Principal Signature</CardTitle>
        <CardDescription>
          Upload once — it appears on all student and staff ID cards.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-4">
        <div className="flex min-h-[56px] min-w-[140px] flex-col items-center justify-end rounded-md border bg-muted/30 px-4 py-2">
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : signatureUrl ? (
            <img
              src={signatureUrl}
              alt="Principal signature"
              className="max-h-12 max-w-[120px] object-contain"
            />
          ) : (
            <p className="text-xs text-muted-foreground">No signature uploaded</p>
          )}
          <p className="mt-1 text-[10px] font-semibold text-[#1e3a5f]">
            Principal
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={isUploading} asChild>
            <label className="cursor-pointer">
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Uploading…" : "Upload signature"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </Button>
          {signatureUrl ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRemove}
              disabled={isRemoving}
              aria-label="Remove signature"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
