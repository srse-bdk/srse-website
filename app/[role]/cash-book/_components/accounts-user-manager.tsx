"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
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
import { accountsUserService } from "@/lib/services/accounts-user.service";
import type { User } from "@/lib/types/user.type";

export function AccountsUserManager() {
  const user = useAppStore((state) => state.user);
  const [accounts, setAccounts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Accounts Clerk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const list = await accountsUserService.getAll();
      setAccounts(list);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load accounts users",
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
      await accountsUserService.create(
        { name: name.trim(), email: email.trim(), password },
        user?.uid || "admin",
      );
      toast.success("Accounts login created");
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
          <Wallet className="size-5" />
          Accounts login
        </CardTitle>
        <CardDescription>
          Create a restricted login for the accounts clerk. They can use the
          daily cash book and weekly summary only — not students, staff, or
          site settings. After creating, they sign in at{" "}
          <span className="font-medium">/signin</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        ) : accounts.length > 0 ? (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-medium">Existing accounts users</p>
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
            No accounts users yet. Create one for the school clerk.
          </p>
        )}

        <form onSubmit={handleCreate} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="accounts-name">Display name</Label>
            <Input
              id="accounts-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. School Accounts"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accounts-email">Login email</Label>
            <Input
              id="accounts-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="accounts@school.local"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accounts-password">Password</Label>
            <Input
              id="accounts-password"
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
            Create accounts login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
