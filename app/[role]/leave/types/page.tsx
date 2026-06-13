"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { leaveTypeService } from "@/lib/services";
import { QUARTERLY_ACCRUAL_DESCRIPTION } from "@/lib/config/leave-accrual";
import type { LeaveType } from "@/lib/types/leave.type";

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
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [maxDays, setMaxDays] = useState("12");
  const [isPaid, setIsPaid] = useState(true);

  useEffect(() => {
    leaveTypeService.ensureDefaults().then(() =>
      leaveTypeService.syncAccrualAnnualLimits(),
    );
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
      setMaxDays("12");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (type: LeaveType, isActive: boolean) => {
    try {
      await leaveTypeService.update(type.id, { isActive });
      toast.success("Leave type updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
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

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-7xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/${role}/leave`}>
          <ArrowLeft className="size-4 mr-2" />
          Leave Management
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold">Leave Types</h1>
        <p className="text-muted-foreground">
          {QUARTERLY_ACCRUAL_DESCRIPTION} Annual caps: CL 8, SL 8, EL 4.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add leave type</CardTitle>
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
                  <TableRow key={type.id}>
                    <TableCell className="font-medium">{type.code}</TableCell>
                    <TableCell>{type.name}</TableCell>
                    <TableCell>{type.maxDaysPerYear}</TableCell>
                    <TableCell>{type.isPaid !== false ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <Switch
                        checked={type.isActive !== false}
                        onCheckedChange={(checked) => handleToggle(type, checked)}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(type.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
