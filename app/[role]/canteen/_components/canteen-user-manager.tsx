"use client";

import { useEffect, useState } from "react";
import { Coffee, Loader2 } from "lucide-react";
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
import { canteenUserService } from "@/lib/services/canteen-user.service";
import type { User } from "@/lib/types/user.type";

export function CanteenUserManager() {
  const user = useAppStore((state) => state.user);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Canteen");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const list = await canteenUserService.getAll();
      setAccounts(list);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load canteen users",
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

  if (user?.role !== "admin") {
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 8) {
      toast.error("Email and password (min 8 chars) are required");
      return;
    }
    setCreating(true);
    try {
      await canteenUserService.create(
        { name: name.trim(), email: email.trim(), password },
        user?.uid || "admin",
      );
      toast.success("Canteen login created");
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
          <Coffee className="size-5" />
          Canteen login
        </CardTitle>
        <CardDescription>
          Create a login for canteen staff. They can view breakfast orders and
          mark payments collected at the counter. Sign in at{" "}
          <span className="font-medium">/signin</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : accounts.length > 0 ? (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Existing canteen users</p>
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
            No canteen users yet. Create one for the canteen counter.
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="canteen-name">Display name</Label>
            <Input
              id="canteen-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Canteen Staff"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="canteen-email">Login email</Label>
            <Input
              id="canteen-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="canteen@school.local"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="canteen-password">Password</Label>
            <Input
              id="canteen-password"
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
            Create canteen login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
