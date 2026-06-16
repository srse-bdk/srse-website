"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/hooks/use-app-store";
import { clearScannerLoginSessionFlag } from "@/lib/services/scanner-login-notification.service";
import { cn } from "@/lib/utils";

export function GateShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAppStore((state) => state.user);

  const handleLogout = async () => {
    try {
      if (user?.uid) {
        clearScannerLoginSessionFlag(user.uid);
      }
      const { firebaseAuth } = await import("@atechhub/firebase");
      await firebaseAuth({ action: "logout" });
      router.push("/signin?next=/gate");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { href: "/gate", label: "Hub", exact: true },
    ...(user?.role === "admin"
      ? [{ href: "/gate/activity", label: "Activity" }]
      : []),
    { href: "/gate/entry", label: "Entry" },
    { href: "/gate/exit", label: "Exit" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2 font-semibold">
            <ScanLine className="size-5 text-primary" />
            <span>Gate Scanner</span>
          </div>
          <nav className="hidden sm:flex items-center gap-1">
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Button
                  key={item.href}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href={item.href}>{item.label}</Link>
                </Button>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {user?.role === "admin" && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/dashboard">Admin</Link>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="size-4 mr-1" />
              Sign out
            </Button>
          </div>
        </div>
        <nav className="flex sm:hidden border-t px-2 py-1 gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-3 py-1.5 text-sm",
                  active
                    ? "bg-secondary font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
