"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Youtube, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { videoService } from "@/lib/services/video.service";
import { toast } from "sonner";
import { VideoDialog } from "./_components/video-dialog";
import type { Video } from "@/lib/types/video.type";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function VideoManagementPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);

  const {
    data: videos,
    loading,
    error,
  } = useFirebaseRealtime<Video>("videos", {
    asArray: true,
  });

  const handleCreate = () => {
    setEditingVideo(null);
    setDialogOpen(true);
  };

  const handleEdit = (video: Video) => {
    setEditingVideo(video);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this video?")) {
      try {
        await videoService.delete(id);
        toast.success("Video deleted successfully");
      } catch (err) {
        console.error(err);
        toast.error("Failed to delete video");
      }
    }
  };

  if (error) {
    return (
      <div className="p-8 text-destructive">
        Error loading videos: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Video Management
          </h1>
          <p className="text-muted-foreground">
            Manage videos displayed in the gallery.
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Video
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-[200px] w-full" />
              <CardContent className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (videos as Video[]).length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Youtube className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-semibold">No videos yet</h3>
          <p className="text-muted-foreground max-w-sm mb-6">
            Get started by adding your first video from YouTube.
          </p>
          <Button onClick={handleCreate}>Add Video</Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(videos as Video[]).map((video) => (
            <Card key={video.id} className="overflow-hidden group">
              <div className="relative">
                <AspectRatio ratio={16 / 9} className="bg-muted">
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtubeId}`}
                    title={video.title}
                    className="h-full w-full pointer-events-none" // Disable interaction in list view
                  />
                  <div className="absolute inset-0 bg-transparent" />
                </AspectRatio>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-8 w-8"
                      >
                        <span className="sr-only">Open menu</span>
                        <div className="flex flex-col gap-1">
                          <div className="h-1 w-1 bg-current rounded-full" />
                          <div className="h-1 w-1 bg-current rounded-full" />
                          <div className="h-1 w-1 bg-current rounded-full" />
                        </div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEdit(video)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(video.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-semibold truncate">{video.title}</h3>
                  <Link
                    href={video.url}
                    target="_blank"
                    className="text-muted-foreground hover:text-primary"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
                {video.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {video.description}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VideoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        video={editingVideo}
        onSuccess={() => setDialogOpen(false)}
      />
    </div>
  );
}
