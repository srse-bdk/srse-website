"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { leaveTypeService, staffLeaveAccrualService } from "@/lib/services";
import {
  ACCRUAL_LEAVE_CODES,
  FULL_LEAVE_POLICY_DESCRIPTION,
} from "@/lib/config/leave-accrual";
import type { LeaveType } from "@/lib/types/leave.type";

function LeaveTypeEditRow({
  type,
  onDelete,
}: {
  type: LeaveType;
  onDelete: (id: string) => void;
}) {
  const [name, setName] = useState(type.name);
  const [maxDays, setMaxDays] = useState(String(type.maxDaysPerYear));
  const [isPaid, setIsPaid] = useState(type.isPaid !== false);
  const [isActive, setIsActive] = useState(type.isActive !== false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(type.name);
    setMaxDays(String(type.maxDaysPerYear));
    setIsPaid(type.isPaid !== false);
    setIsActive(type.isActive !== false);
  }, [type]);

  const isDirty =
    name !== type.name ||
    maxDays !== String(type.maxDaysPerYear) ||
    isPaid !== (type.isPaid !== false) ||
    isActive !== (type.isActive !== false);

  const handleSave = async () => {
    const parsedMaxDays = Number.parseInt(maxDays, 10);
    if (!name.trim() || Number.isNaN(parsedMaxDays) || parsedMaxDays < 1) {
      toast.error("Enter a valid name and max days.");
      return;
    }

    setSaving(true);
    try {
      await leaveTypeService.update(type.id, {
        name: name.trim(),
        maxDaysPerYear: parsedMaxDays,
        isPaid,
        isActive,
      });
      toast.success(`${type.code} updated`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{type.code}</TableCell>
      <TableCell>
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="min-w-[10rem]"
        />
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min={1}
          value={maxDays}
          onChange={(event) => setMaxDays(event.target.value)}
          className="w-20"
        />
      </TableCell>
      <TableCell>
        <Switch checked={isPaid} onCheckedChange={setIsPaid} />
      </TableCell>
      <TableCell>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!isDirty || saving}
            onClick={() => void handleSave()}
            title="Save changes"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(type.id)}
            title="Delete leave type"
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function LeaveTypesPage() {
  const params = useParams();
  const role = params.role as string;

  const { data, loading } = useFirebaseRealtime<LeaveType>("leaveTypes", {
    asArray: true,
  });
  const types = ((data as LeaveType[]) || []).sort((a, b) =>
    a.code.localeCompare(b.code),
  );

  const [creating, setCreating] = useState(false);
  const [syncingPolicy, setSyncingPolicy] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [maxDays, setMaxDays] = useState("4");
  const [isPaid, setIsPaid] = useState(true);

  useEffect(() => {
    void leaveTypeService.ensureAccrualTypesPresent();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      await leaveTypeService.create({
        code: code.toUpperCase(),
        name,
        maxDaysPerYear: Number.parseInt(maxDays, 10),
        isPaid,
      });
      toast.success("Leave type created");
      setCode("");
      setName("");
      setMaxDays("4");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await leaveTypeService.delete(id);
      toast.success("Leave type deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  };

  const handleApplyPolicyCaps = async () => {
    setSyncingPolicy(true);
    try {
      const [typesUpdated, accrualsUpdated] = await Promise.all([
        leaveTypeService.syncAccrualAnnualLimits(),
        staffLeaveAccrualService.syncAccrualDaysFromPolicy(),
      ]);
      toast.success(
        `Policy applied. Updated ${typesUpdated} leave type cap(s) and ${accrualsUpdated} accrual record(s).`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to apply policy caps",
      );
    } finally {
      setSyncingPolicy(false);
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/${role}/leave`}>
          <ArrowLeft className="size-4 mr-2" />
          Leave Management
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leave Types</h1>
          <p className="text-muted-foreground">{FULL_LEAVE_POLICY_DESCRIPTION}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Edit names and max days below, then click save on each row. Changes
            are no longer overwritten when you open this page.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={syncingPolicy}
          onClick={() => void handleApplyPolicyCaps()}
        >
          {syncingPolicy ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 size-4" />
          )}
          Apply policy caps (CL/SL/EL)
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add leave type</CardTitle>
          <CardDescription>
            Policy types: {ACCRUAL_LEAVE_CODES.join(", ")}. Other types (e.g.
            LWP) can be added manually.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="CL"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Casual Leave"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Max days / year</Label>
              <Input
                type="number"
                min={1}
                value={maxDays}
                onChange={(e) => setMaxDays(e.target.value)}
                required
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-4">
              <Switch checked={isPaid} onCheckedChange={setIsPaid} id="paid" />
              <Label htmlFor="paid">Paid leave</Label>
            </div>
            <Button type="submit" disabled={creating}>
              <Plus className="size-4 mr-2" />
              {creating ? "Adding..." : "Add type"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configured types</CardTitle>
          <CardDescription>
            Click the save icon after editing a row. Max days for CL, SL, and EL
            should match annual caps unless you have a special case.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="size-6 animate-spin mx-auto" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Max days</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <LeaveTypeEditRow
                    key={type.id}
                    type={type}
                    onDelete={handleDelete}
                  />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
