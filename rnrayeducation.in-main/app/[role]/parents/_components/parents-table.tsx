"use client";

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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Student } from "@/lib/types/student.type";
import type { User } from "@/lib/types/user.type";
import {
  Baby,
  CheckCircle,
  Edit,
  Key,
  Mail,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  Users,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { BulkActionDialog } from "./bulk-action-dialog";
import { DeleteParentDialog } from "./delete-parent-dialog";
import { EditParentDialog } from "./edit-parent-dialog";

interface ParentsTableProps {
  parents: User[];
  students: Student[];
  onRefresh: () => void;
}

export function ParentsTable({
  parents,
  students,
  onRefresh,
}: ParentsTableProps) {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedParent, setSelectedParent] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<string>("");

  // Student Map for quick lookup
  const studentMap = new Map(students.map((s) => [s.id, s]));

  // Filter parents
  const filteredParents = parents.filter(
    (parent) =>
      parent.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      parent.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">
            Active
          </Badge>
        );
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-none">
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(filteredParents.map((p) => p.id));
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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success("Parents list refreshed");
    } catch (_error) {
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  const openDeleteDialog = (parent: User) => {
    setSelectedParent(parent);
    setDeleteDialogOpen(true);
  };

  const openEditDialog = (parent: User) => {
    setSelectedParent(parent);
    setEditDialogOpen(true);
  };

  const openBulkActionDialog = (action: string) => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one parent");
      return;
    }
    setBulkAction(action);
    setBulkActionDialogOpen(true);
  };

  const handleBulkActionSuccess = () => {
    setSelectedIds([]);
    onRefresh();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
            Parents
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage parent accounts and their linked students.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
          <Button
            onClick={() => toast.info("Import feature coming soon")}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button
            onClick={() => router.push(`/${role}/parents/create`)}
            className="flex items-center gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Parent</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-lg p-4 sm:p-6 transition-all duration-200">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <Input
            placeholder="Search parents by name or email..."
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
              className="mt-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm text-muted-foreground font-medium">
                  {selectedIds.length} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-500 text-white hover:bg-emerald-600 text-xs sm:text-sm"
                    onClick={() => openBulkActionDialog("active")}
                  >
                    <CheckCircle className="h-3 w-3 mr-1" /> Activate
                  </Button>
                  <Button
                    size="sm"
                    className="bg-rose-500 text-white hover:bg-rose-600 text-xs sm:text-sm"
                    onClick={() => openBulkActionDialog("inactive")}
                  >
                    <XCircle className="h-3 w-3 mr-1" /> Deactivate
                  </Button>
                  <Button
                    size="sm"
                    className="bg-red-600 text-white hover:bg-red-700 text-xs sm:text-sm"
                    onClick={() => openBulkActionDialog("delete")}
                  >
                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      <Card className="border-2 border-gradient-to-r from-primary/20 via-transparent to-accent/20 shadow-xl">
        <CardHeader className="p-3 sm:p-4 pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Parent Directory</CardTitle>
          </div>
          <CardDescription>
            {filteredParents.length} records found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px] pl-4">
                    <Checkbox
                      checked={
                        selectedIds.length === filteredParents.length &&
                        filteredParents.length > 0
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Parent Name</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Linked Children</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right pr-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredParents.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No parents found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredParents.map((parent) => (
                    <TableRow key={parent.id}>
                      <TableCell className="pl-4">
                        <Checkbox
                          checked={selectedIds.includes(parent.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(parent.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {parent.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" /> {parent.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {parent.validChildrenIds &&
                          parent.validChildrenIds.length > 0 ? (
                            parent.validChildrenIds.map((childId) => {
                              const child = studentMap.get(childId);
                              return child ? (
                                <Badge
                                  key={childId}
                                  variant="outline"
                                  className="text-xs gap-1"
                                >
                                  <Baby className="h-3 w-3" />
                                  {child.fullName}
                                </Badge>
                              ) : null;
                            })
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              No children linked
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(parent.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(parent.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right pr-4">
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
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(parent)}
                            >
                              <Edit className="mr-2 h-4 w-4" /> Edit Name
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                router.push(
                                  `/${role}/parents/${parent.id}/password`,
                                )
                              }
                            >
                              <Key className="mr-2 h-4 w-4" />
                              Change Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => openDeleteDialog(parent)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DeleteParentDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        parent={selectedParent}
        onSuccess={onRefresh}
      />

      <EditParentDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        parent={selectedParent}
        onSuccess={onRefresh}
      />

      <BulkActionDialog
        open={bulkActionDialogOpen}
        onOpenChange={setBulkActionDialogOpen}
        selectedIds={selectedIds}
        bulkAction={bulkAction}
        onSuccess={handleBulkActionSuccess}
      />
    </div>
  );
}
