"use client";

import {
  BookText,
  CheckCircle,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { subjectService } from "@/lib/services";
import type { Subject } from "@/lib/types/subject.type";
import { ExportSubjectsButton } from "./export-subjects-button";
import { ImportSubjectsDialog } from "./import-subjects-dialog";
import { cn } from "@/lib/utils";

interface SubjectsTableProps {
  subjects: Subject[];
}

export function SubjectsTable({ subjects }: SubjectsTableProps) {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter subjects based on search term
  const filteredSubjects = subjects.filter(
    (subject) =>
      subject.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subject.code?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDelete = async () => {
    if (!subjectToDelete) return;

    setIsDeleting(true);
    try {
      await subjectService.delete(subjectToDelete.id);
      toast.success("Subject deleted successfully");
      setDeleteDialogOpen(false);
      setSubjectToDelete(null);
      // Real-time hook will automatically update the data
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete subject",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteDialog = (subject: Subject) => {
    setSubjectToDelete(subject);
    setDeleteDialogOpen(true);
  };

  const getStatusDot = (status: Subject["status"]) => {
    return status === "active" ? (
      <span className="h-2 w-2 rounded-full bg-green-500" title="Active" />
    ) : (
      <span className="h-2 w-2 rounded-full bg-yellow-500" title="Inactive" />
    );
  };

  // Bulk selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredSubjects.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
    }
  };

  const handleDialogSuccess = () => {
    // Real-time hook will automatically update the data
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Modern Toolbar with Glassmorphism */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4 sm:p-6 transition-all duration-200">
        {/* Search Bar */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Search subjects by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 h-11 text-sm sm:text-base border-border/50 bg-background/50 focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-200"
          />
        </div>
        <AnimatePresence>
          {selectedIds.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              transition={{
                duration: 0.2,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                  className="text-xs sm:text-sm text-muted-foreground font-medium"
                >
                  {selectedIds.length} selected
                </motion.span>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: 0.1, duration: 0.2 }}
                  className="flex gap-2"
                >
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.info("Bulk activate feature coming soon");
                    }}
                    className="flex items-center gap-1 bg-emerald-500 text-white hover:bg-emerald-600 text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Activate</span>
                    <span className="sm:hidden">Act</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.info("Bulk deactivate feature coming soon");
                    }}
                    className="flex items-center gap-1 bg-rose-500 text-white hover:bg-rose-600 text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                  >
                    <XCircle className="h-3 w-3" />
                    <span className="hidden sm:inline">Deactivate</span>
                    <span className="sm:hidden">Deact</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      toast.info("Bulk delete feature coming soon");
                    }}
                    className="flex items-center gap-1 bg-red-600 text-white hover:bg-red-700 text-xs sm:text-sm transition-all duration-200 hover:scale-105"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span className="hidden sm:inline">Delete</span>
                    <span className="sm:hidden">Del</span>
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Subjects Table Card with Modern Styling */}
      <Card className="border-2 border-gradient-to-r from-primary/20 via-transparent to-accent/20 shadow-xl transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="p-3 sm:p-4 pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <BookText className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <div>
                <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                  Subject Management
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs mt-0.5 leading-tight">
                  {filteredSubjects.length} of {subjects.length} subjects
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button
                onClick={() => router.push(`/${role}/subjects/create`)}
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
                size="sm"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Subject</span>
                <span className="sm:hidden">Add</span>
              </Button>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
              >
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Import</span>
              </Button>
              <ExportSubjectsButton subjects={filteredSubjects} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-8">
              <BookText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                No subjects found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchTerm
                  ? "Try adjusting your search terms."
                  : "Get started by adding your first subject."}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => router.push(`/${role}/subjects/create`)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subject
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={
                      selectedIds.length === filteredSubjects.length &&
                      filteredSubjects.length > 0
                    }
                    onCheckedChange={handleSelectAll}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                    Select All
                  </label>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {filteredSubjects.map((subject) => {
                  const isSelected = selectedIds.includes(subject.id);
                  return (
                    <div
                      key={subject.id}
                      className={cn(
                        "group relative flex items-center gap-2 px-3 py-2 rounded-full border transition-all duration-200 cursor-pointer bg-card hover:shadow-sm",
                        isSelected
                          ? "border-primary/50 bg-primary/5 shadow-sm"
                          : "border-border/50 hover:border-primary/30"
                      )}
                      onClick={() => handleSelectOne(subject.id, !isSelected)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handleSelectOne(subject.id, checked as boolean)}
                        className="h-4 w-4 rounded-full flex-shrink-0 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      />
                      
                      <div className="flex items-center gap-2 min-w-0">
                        {getStatusDot(subject.status)}
                        <span className="font-medium text-sm truncate max-w-[150px] sm:max-w-[200px]">
                          {subject.name}
                        </span>
                        {subject.code && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-muted/50 rounded-md font-mono flex-shrink-0">
                            {subject.code}
                          </Badge>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 ml-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity rounded-full flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/${role}/subjects/${subject.id}/edit`);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(subject);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Subject</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{subjectToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ImportSubjectsDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
