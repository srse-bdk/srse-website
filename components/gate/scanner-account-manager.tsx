"use client";

import { useEffect, useState } from "react";
import { Loader2, Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/hooks/use-app-store";
import { scannerUserService } from "@/lib/services/scanner-user.service";
import type { User } from "@/lib/types/user.type";

export function ScannerAccountManager() {
  const user = useAppStore((state) => state.user);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Gate Scanner Kiosk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const list = await scannerUserService.getAll();
      setAccounts(list);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load scanner accounts",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      void loadAccounts();
    }
  }, [user?.role]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      toast.error("Email and password (min 8 chars) are required");
      return;
    }
    setCreating(true);
    try {
      await scannerUserService.create(
        { name: name.trim(), email: email.trim(), password },
        user?.uid || "admin",
      );
      toast.success("Scanner kiosk account created");
      setEmail("");
      setPassword("");
      await loadAccounts();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create account",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="size-5" />
          Scanner kiosk login
        </CardTitle>
        <CardDescription>
          Create a dedicated account for gate devices. Scanner logins notify all
          admins with device details. Sign in on the kiosk at{" "}
          <span className="font-medium">/signin</span>, then use{" "}
          <span className="font-medium">/gate/entry</span> or{" "}
          <span className="font-medium">/gate/exit</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : accounts.length > 0 ? (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Existing scanner accounts</p>
            {accounts.map((account) => (
              <div
                key={account.uid}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span className="font-medium">{account.name}</span>
                <span className="text-muted-foreground">{account.email}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No scanner accounts yet. Create one for each gate device.
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scanner-name">Display name</Label>
            <Input
              id="scanner-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Gate Entry"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scanner-email">Login email</Label>
            <Input
              id="scanner-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gate-entry@school.local"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="scanner-password">Password</Label>
            <Input
              id="scanner-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              minLength={8}
              required
            />
          </div>
          <Button type="submit" disabled={creating}>
            {creating && <Loader2 className="size-4 mr-2 animate-spin" />}
            Create scanner account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
