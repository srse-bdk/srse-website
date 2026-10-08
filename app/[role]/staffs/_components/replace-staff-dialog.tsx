"use client";

import { useState } from "react";
import { Loader2, UserRoundPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { staffService } from "@/lib/services";
import type { User } from "@/lib/types/user.type";

interface ReplaceStaffDialogProps {
  staff: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (newStaffId: string) => void;
}

export function ReplaceStaffDialog({
  staff,
  open,
  onOpenChange,
  onSuccess,
}: ReplaceStaffDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfJoining, setDateOfJoining] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setName("");
    setEmail("");
    setPassword("");
    setPhoneNumber("");
    setDateOfJoining("");
    setGender("female");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleReplace = async () => {
    if (!staff) return;
    if (!name.trim() || name.trim().length < 2) {
      toast.error("Enter the new staff name");
      return;
    }
    if (!email.trim()) {
      toast.error("Enter a login email for the new staff");
      return;
    }
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSaving(true);
    try {
      const result = await staffService.replaceStaff({
        outgoingStaffId: staff.id,
        name: name.trim(),
        email: email.trim(),
        password,
        phoneNumber: phoneNumber.trim() || undefined,
        gender,
        dateOfJoining: dateOfJoining || undefined,
      });
      toast.success(
        `Created ${name.trim()}. Copied ${result.copiedAssignments} class assignments, updated ${result.timetableSlotsUpdated} timetable slots. ${staff.name} is now inactive. Leaves were not copied.`,
      );
      handleOpenChange(false);
      onSuccess?.(result.newStaffId);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to replace staff",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="h-5 w-5" />
            Replace staff
          </DialogTitle>
          <DialogDescription>
            Create a new profile for the replacement teacher, copy{" "}
            <strong>{staff?.name}</strong>&apos;s class/subject assignments and
            timetable slots, then deactivate the outgoing profile. Leave
            applications and leave balances are not copied.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="replace-name">New staff name</Label>
            <Input
              id="replace-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ankita Mohanty"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="replace-email">Login email</Label>
            <Input
              id="replace-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. srse16@gmail.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="replace-password">Temporary password</Label>
            <Input
              id="replace-password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min 6 characters"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="replace-doj">Date of joining</Label>
            <Input
              id="replace-doj"
              type="date"
              value={dateOfJoining}
              onChange={(e) => setDateOfJoining(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="replace-phone">Phone (optional)</Label>
              <Input
                id="replace-phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select
                value={gender}
                onValueChange={(v) =>
                  setGender(v as "male" | "female" | "other")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleReplace} disabled={saving || !staff}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UserRoundPlus className="mr-2 h-4 w-4" />
            )}
            Create &amp; replace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
