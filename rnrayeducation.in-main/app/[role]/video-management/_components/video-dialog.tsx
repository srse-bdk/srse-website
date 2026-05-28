"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { videoService } from "@/lib/services/video.service";
import type { Video } from "@/lib/types/video.type";

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Please enter a valid URL"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface VideoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  video?: Video | null;
  onSuccess: () => void;
}

export function VideoDialog({
  open,
  onOpenChange,
  video,
  onSuccess,
}: VideoDialogProps) {
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      url: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      if (video) {
        setValue("title", video.title);
        setValue("url", video.url);
        setValue("description", video.description || "");
      } else {
        reset({
          title: "",
          url: "",
          description: "",
        });
      }
    }
  }, [open, video, setValue, reset]);

  const extractYoutubeId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  const onSubmit = async (values: FormValues) => {
    const youtubeId = extractYoutubeId(values.url);

    if (!youtubeId) {
      toast.error("Invalid YouTube URL. Could not extract video ID.");
      return;
    }

    setSaving(true);
    try {
      if (video) {
        await videoService.update(video.id, {
          ...values,
          youtubeId,
        });
        toast.success("Video updated successfully");
      } else {
        await videoService.create({
          ...values,
          youtubeId,
        });
        toast.success("Video added successfully");
      }
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{video ? "Edit Video" : "Add Video"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register("title")}
              placeholder="Video title"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="url">YouTube URL</Label>
            <Input
              id="url"
              {...register("url")}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {errors.url && (
              <p className="text-sm text-destructive">{errors.url.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Supports standard YouTube URLs, short links (youtu.be), and embed
              links.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Brief description of the video..."
            />
            {errors.description && (
              <p className="text-sm text-destructive">
                {errors.description.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {video ? "Save Changes" : "Add Video"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
