"use client";

import Link from "next/link";
import { Bell, LogIn, LogOut, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScannerAccountManager } from "@/components/gate/scanner-account-manager";
import { useAppStore } from "@/hooks/use-app-store";

export default function GateHubPage() {
  const user = useAppStore((state) => state.user);
  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <ScanLine className="size-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Gate Scanners</h1>
          <p className="text-sm text-muted-foreground">
            Entry and exit scanners for staff and students.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <LogIn className="size-5" />
              Entry Scanner
            </CardTitle>
            <CardDescription>
              School entrance — records check-in and arrival.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Link href="/gate/entry">Open Entry Scanner</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <LogOut className="size-5" />
              Exit Scanner
            </CardTitle>
            <CardDescription>
              School exit — records check-out and dismissal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
              <Link href="/gate/exit">Open Exit Scanner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-5" />
              Activity log
            </CardTitle>
            <CardDescription>
              View kiosk login history and student entry/exit scans.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" asChild>
              <Link href="/gate/activity">Open activity log</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {isAdmin && <ScannerAccountManager />}
    </div>
  );
}
