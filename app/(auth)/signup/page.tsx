"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignUpPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Registration closed</CardTitle>
        <CardDescription>
          New accounts can only be created by school administrators. Please
          contact the school office if you need access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full">
          <Link href="/">Back to website</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
