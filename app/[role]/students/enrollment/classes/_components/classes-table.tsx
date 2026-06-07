"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MoreHorizontal,
  Search,
  BookOpen,
  Edit,
  Plus,
  Upload,
  CheckCircle,
  XCircle,
  Trash2,
} from "lucide-react";
import type { Class } from "@/lib/types/class.type";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ImportClassesDialog } from "./import-classes-dialog";
import { ExportClassesButton } from "./export-classes-button";
import { BulkDeleteClassesDialog } from "./bulk-delete-classes-dialog";

interface ClassesTableProps {
  classes: Class[];
}

export function ClassesTable({ classes }: ClassesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const role = pathname.split("/")[1];
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Filter classes
  const filteredClasses = classes.filter((classItem) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();
    return (
      classItem.name.toLowerCase().includes(searchLower) ||
      classItem.description?.toLowerCase().includes(searchLower) ||
      classItem.academicYear.toLowerCase().includes(searchLower) ||
      classItem.sections.some((section) =>
        section.toLowerCase().includes(searchLower),
      ) ||
      classItem.status.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: Class["status"]) => {
    return status === "active" ? (
      <Badge
        variant="default"
        className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      >
        Active
      </Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  // Bulk selection functions
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredClasses.map((c) => c.id));
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

  const handleBulkDeleteSuccess = () => {
    setSelectedIds([]);
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
            placeholder="Search by name, description, academic year, section, or status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
                    onClick={() => setBulkDeleteDialogOpen(true)}
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

      {/* Classes Table Card with Modern Styling */}
      <Card className="border-2 border-gradient-to-r from-primary/20 via-transparent to-accent/20 shadow-xl transition-all duration-300 hover:shadow-2xl">
        <CardHeader className="p-3 sm:p-4 pb-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-row justify-between items-center w-full sm:w-auto sm:gap-3">
              <BookOpen className="h-6 w-6 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              <div className="text-right sm:text-left">
                <CardTitle className="text-sm sm:text-base font-semibold leading-tight">
                  Class Management
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-xs mt-0.5 leading-tight">
                  {filteredClasses.length} of {classes.length} classes
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Button
                onClick={() =>
                  router.push(`/${role}/students/enrollment/classes/create`)
                }
                className="flex items-center gap-2 transition-all duration-200 hover:scale-105 hover:shadow-md"
                size="sm"
              >
                <Plus className="h-6 w-6" />
                <span className="hidden sm:inline">Create Class</span>
                <span className="sm:hidden">Create</span>
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
              <ExportClassesButton classes={filteredClasses} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          {filteredClasses.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">
                No classes found
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search terms."
                  : "Get started by creating your first class."}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() =>
                    router.push(`/${role}/students/enrollment/classes/create`)
                  }
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={
                            selectedIds.length === filteredClasses.length &&
                            filteredClasses.length > 0
                          }
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Academic Year</TableHead>
                      <TableHead>Sections</TableHead>
                      <TableHead>Capacity/Section</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClasses.map((classItem) => (
                      <TableRow key={classItem.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.includes(classItem.id)}
                            onCheckedChange={(checked) =>
                              handleSelectOne(classItem.id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {classItem.name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {classItem.academicYear}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap max-w-[200px]">
                            {classItem.sections.slice(0, 3).map((section) => (
                              <Badge
                                key={section}
                                variant="outline"
                                className="text-xs"
                              >
                                {section}
                              </Badge>
                            ))}
                            {classItem.sections.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{classItem.sections.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {classItem.capacityPerSection}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(classItem.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/${role}/students/enrollment/classes/${classItem.id}`,
                                  )
                                }
                              >
                                <BookOpen className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/${role}/students/enrollment/classes/${classItem.id}/edit`,
                                  )
                                }
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {filteredClasses.map((classItem) => (
                  <Card key={classItem.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedIds.includes(classItem.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(classItem.id, checked as boolean)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <div className="font-medium text-sm">
                              {classItem.name}
                            </div>
                            {classItem.description && (
                              <div className="text-xs text-muted-foreground truncate">
                                {classItem.description}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <p className="text-muted-foreground">
                                Academic Year
                              </p>
                              <p className="font-medium">
                                {classItem.academicYear}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Capacity</p>
                              <p className="font-medium">
                                {classItem.capacityPerSection}/section
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sections</p>
                              <div className="flex gap-1 flex-wrap">
                                {classItem.sections
                                  .slice(0, 3)
                                  .map((section) => (
                                    <Badge
                                      key={section}
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {section}
                                    </Badge>
                                  ))}
                                {classItem.sections.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{classItem.sections.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Status</p>
                              <div className="mt-1">
                                {getStatusBadge(classItem.status)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 flex-shrink-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/${role}/students/enrollment/classes/${classItem.id}`,
                              )
                            }
                          >
                            <BookOpen className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              router.push(
                                `/${role}/students/enrollment/classes/${classItem.id}/edit`,
                              )
                            }
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ImportClassesDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onSuccess={handleDialogSuccess}
      />
      <BulkDeleteClassesDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        selectedIds={selectedIds}
        onSuccess={handleBulkDeleteSuccess}
      />
    </div>
  );
}
