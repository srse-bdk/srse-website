"use client";

import { useState } from "react";
import {
  CheckCircle,
  Clock,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { testimonialService } from "@/lib/services/testimonial.service";
import type { Testimonial } from "@/lib/types/testimonial.type";
import { TestimonialDialog } from "./_components/testimonial-dialog";
import { toast } from "sonner";

export default function TestimonialsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Testimonial | null>(null);

  const { data, loading, error } = useFirebaseRealtime<Testimonial>(
    "testimonials",
    {
      asArray: true,
      sort: (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    },
  );

  const testimonials = (data as Testimonial[]) || [];

  const stats = {
    total: testimonials.length,
    published: testimonials.filter((t) => t.status === "published").length,
    drafts: testimonials.filter((t) => t.status === "draft").length,
  };

  const handleCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (testimonial: Testimonial) => {
    setEditing(testimonial);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this testimonial?")) return;
    try {
      await testimonialService.delete(id);
      toast.success("Testimonial deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete testimonial");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Failed to load testimonials."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Testimonials
          </h1>
          <p className="text-muted-foreground">
            Add parent quotes collected offline. Published entries appear on the
            homepage.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add testimonial
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Total
            </CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Published
            </CardDescription>
            <CardTitle className="text-3xl">{stats.published}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Drafts
            </CardDescription>
            <CardTitle className="text-3xl">{stats.drafts}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All testimonials</CardTitle>
          <CardDescription>
            Lower display order numbers appear first on the homepage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {testimonials.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
              <MessageSquare className="h-10 w-10 opacity-40" />
              <p>No testimonials yet. Add the first one when you are ready.</p>
              <Button variant="outline" onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add testimonial
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {testimonials.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{t.name}</p>
                      <Badge
                        variant={
                          t.status === "published" ? "default" : "secondary"
                        }
                      >
                        {t.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Order: {t.sortOrder ?? 0}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{t.role}</p>
                    <p className="text-sm leading-relaxed">{t.quote}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(t)}
                    >
                      <Pencil className="mr-1 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TestimonialDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        testimonial={editing}
        onSuccess={() => setEditing(null)}
      />
    </div>
  );
}
