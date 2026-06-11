"use client";

import { Camera, Crop, Loader2, User, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageEditor } from "@/components/ui/image-editor";
import { fetchImageUrlAsFile } from "@/lib/utils/fetch-image-as-file";
import { formatFileSize } from "@/lib/utils/image-optimization";
import { prepareProfilePhotoFile } from "@/lib/utils/profile-photo";
import { useUploadThing } from "@/lib/utils/uploadthing";

export interface ProfilePhotoFieldProps {
  value?: string;
  fileKey?: string;
  onChange: (url: string | undefined, fileKey: string | undefined) => void;
  title?: string;
  description?: string;
  editorTitle?: string;
  fallbackIcon?: React.ReactNode;
  disabled?: boolean;
}

export function ProfilePhotoField({
  value,
  fileKey: _fileKey,
  onChange,
  title = "Profile Picture",
  description = "Upload a profile picture (max 150 KB). Used on ID cards.",
  editorTitle = "Edit photo",
  fallbackIcon,
  disabled = false,
}: ProfilePhotoFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(value);
  const [editorFile, setEditorFile] = useState<File | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);

  useEffect(() => {
    setPreview(value);
  }, [value]);

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      if (res?.[0]?.url && res?.[0]?.key) {
        onChange(res[0].url, res[0].key);
        setPreview(res[0].url);
        toast.success("Profile picture uploaded!");
      }
    },
    onUploadError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  const openEditorWithFile = (file: File) => {
    setEditorFile(file);
    setShowImageEditor(true);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image size must be less than 10MB");
      return;
    }

    openEditorWithFile(file);
  };

  const handleAdjustPhoto = async () => {
    if (!value?.trim()) return;

    setIsAdjusting(true);
    try {
      const file = await fetchImageUrlAsFile(value, "profile-photo.jpg");
      openEditorWithFile(file);
    } catch (error) {
      console.error("Error loading photo for adjustment:", error);
      toast.error("Could not load the current photo. Try uploading a new one.");
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleImageEditorSave = async (optimizedFile: File) => {
    setShowImageEditor(false);
    setEditorFile(null);

    try {
      const prepared = await prepareProfilePhotoFile(optimizedFile);
      await startUpload([prepared]);
      toast.success(`Photo ready (${formatFileSize(prepared.size)}, max 150 KB)`);
    } catch (error) {
      console.error("Error uploading image:", error);
      const message =
        error instanceof Error ? error.message : "Failed to upload photo";
      toast.error(message);
    }
  };

  const handleRemove = () => {
    onChange(undefined, undefined);
    setPreview(undefined);
  };

  const busy = isUploading || isAdjusting;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <Avatar className="h-32 w-32">
          <AvatarImage src={preview || undefined} />
          <AvatarFallback>
            {fallbackIcon ?? <User className="h-16 w-16" />}
          </AvatarFallback>
        </Avatar>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || busy}
        />

        <div className="flex flex-wrap justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || busy}
          >
            <Camera className="mr-2 h-4 w-4" />
            {preview ? "Change Photo" : "Upload Photo"}
          </Button>

          {preview ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleAdjustPhoto}
                disabled={disabled || busy}
              >
                {isAdjusting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Crop className="mr-2 h-4 w-4" />
                )}
                Adjust Photo
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemove}
                disabled={disabled || busy}
              >
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </>
          ) : null}
        </div>

        {isUploading ? (
          <p className="text-sm text-muted-foreground">Uploading...</p>
        ) : null}
      </div>

      {editorFile ? (
        <ImageEditor
          imageFile={editorFile}
          open={showImageEditor}
          onSave={handleImageEditorSave}
          aspectRatio={1}
          circularCrop={false}
          title={editorTitle}
          onCancel={() => {
            setShowImageEditor(false);
            setEditorFile(null);
          }}
        />
      ) : null}
    </div>
  );
}
