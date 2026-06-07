"use client";

import { DynamicBreadcrumb } from "@/components/core/dynamic-breadcrumb";
import { ParentForm } from "../_components/parent-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CreateParentPage() {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create Parent Account</h1>
                <p className="text-muted-foreground">
                    Create a new parent account and link it to existing students.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Account Details</CardTitle>
                    <CardDescription>Enter the parent's personal information and select their children.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ParentForm />
                </CardContent>
            </Card>
        </div>
    );
}
