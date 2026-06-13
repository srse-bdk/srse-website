"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { schoolCalendarService } from "@/lib/services";
import type {
  SchoolCalendarEntry,
  SchoolCalendarEntryType,
  SchoolCalendarSettings,
} from "@/lib/types/leave.type";

const ENTRY_TYPES: { value: SchoolCalendarEntryType; label: string }[] = [
  { value: "national_holiday", label: "National holiday" },
  { value: "state_holiday", label: "State holiday" },
  { value: "summer_vacation", label: "Summer vacation" },
  { value: "winter_vacation", label: "Winter vacation" },
  { value: "custom", label: "Custom" },
];

export default function LeaveCalendarPage() {
  const params = useParams();
  const role = params.role as string;

  const { data, loading } = useFirebaseRealtime<SchoolCalendarEntry>("schoolCalendar", {
    asArray: true,
  });
  const entries = ((data as SchoolCalendarEntry[]) || []).sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );

  const [settings, setSettings] = useState<SchoolCalendarSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [type, setType] = useState<SchoolCalendarEntryType>("national_holiday");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stateName, setStateName] = useState("");

  useEffect(() => {
    schoolCalendarService.ensureSettings().then(() =>
      schoolCalendarService.getSettings().then(setSettings),
    );
  }, []);

  const handleSettingsChange = async (
    key: keyof SchoolCalendarSettings,
    value: boolean,
  ) => {
    if (!settings) return;
    setSavingSettings(true);
    try {
      const next = { ...settings, [key]: value };
      await schoolCalendarService.updateSettings({ [key]: value });
      setSettings(next);
      toast.success("Calendar settings updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    try {
      await schoolCalendarService.createEntry({
        title,
        type,
        startDate,
        endDate: endDate || startDate,
        state: type === "state_holiday" ? stateName : undefined,
      });
      toast.success("Calendar entry added");
      setTitle("");
      setStartDate("");
      setEndDate("");
      setStateName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add entry");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await schoolCalendarService.deleteEntry(id);
      toast.success("Entry removed");
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
        <h1 className="text-2xl font-bold">School Calendar</h1>
        <p className="text-muted-foreground">
          Recurring rules and dated holidays / vacation ranges.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recurring holidays</CardTitle>
          <CardDescription>Applied automatically — no manual dates needed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings ? (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor="sundays">All Sundays</Label>
                <Switch
                  id="sundays"
                  checked={settings.sundaysHoliday}
                  disabled={savingSettings}
                  onCheckedChange={(checked) =>
                    handleSettingsChange("sundaysHoliday", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="secondSat">Second Saturday of each month</Label>
                <Switch
                  id="secondSat"
                  checked={settings.secondSaturdayHoliday}
                  disabled={savingSettings}
                  onCheckedChange={(checked) =>
                    handleSettingsChange("secondSaturdayHoliday", checked)
                  }
                />
              </div>
            </>
          ) : (
            <Loader2 className="size-5 animate-spin" />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add holiday or vacation</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Republic Day / Summer Break"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as SchoolCalendarEntryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTRY_TYPES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {type === "state_holiday" && (
              <div className="space-y-2">
                <Label>State</Label>
                <Input
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  placeholder="Odisha"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End date</Label>
              <Input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="Same as start for single day"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creating}>
                <Plus className="size-4 mr-2" />
                {creating ? "Adding..." : "Add entry"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Calendar entries</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="size-6 animate-spin mx-auto" />
          ) : entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dated entries yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{entry.title}</TableCell>
                    <TableCell className="capitalize">
                      {entry.type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell>
                      {entry.startDate}
                      {entry.endDate !== entry.startDate ? ` → ${entry.endDate}` : ""}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
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
