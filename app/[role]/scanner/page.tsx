"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LogIn, LogOut, ScanLine } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ScannerHubPage() {
  const params = useParams();
  const role = params.role as string;

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
          <ScanLine className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Gate Scanners
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5 sm:mt-1">
            Use a dedicated device at each gate — entry for check-in, exit for check-out.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 max-w-3xl">
        <Card className="border-emerald-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-800">
              <LogIn className="size-5" />
              Entry Scanner
            </CardTitle>
            <CardDescription>
              Place at the school entrance. Records staff check-in and student arrival.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700">
              <Link href={`/${role}/scanner/entry`}>Open Entry Scanner</Link>
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
              Place at the school exit. Records staff check-out and student dismissal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
              <Link href={`/${role}/scanner/exit`}>Open Exit Scanner</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
