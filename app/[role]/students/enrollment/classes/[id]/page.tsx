"use client";

import { useParams, useRouter } from "next/navigation";
import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Edit, ArrowLeft, Users } from "lucide-react";
import type { Class } from "@/lib/types/class.type";
import Link from "next/link";
import { useFirebaseRealtime as useEnrollmentsRealtime } from "@/hooks/use-firebase-realtime";
import type { Enrollment } from "@/lib/types/enrollment.type";

export default function ClassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const role = params.role as string;
  const classId = params.id as string;

  const { data, loading, error } = useFirebaseRealtime<Class>(
    `classes/${classId}`,
    {
      asArray: false,
    },
  );

  const { data: enrollmentsData } = useEnrollmentsRealtime<Enrollment>(
    "enrollments",
    {
      asArray: true,
    },
  );

  const classData = data as Class | null;
  const enrollments = (enrollmentsData as Enrollment[]) || [];

  // Get enrollments for this class
  const classEnrollments = enrollments.filter(
    (e) => e.classId === classId && e.status === "active",
  );

  // Count enrollments per section
  const sectionCounts = classData?.sections.reduce((acc, section) => {
    const count = classEnrollments.filter((e) => e.section === section).length;
    acc[section] = count;
    return acc;
  }, {} as Record<string, number>) || {};

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !classData) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>
              {error instanceof Error
                ? error.message
                : "Class not found or failed to load."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: Class["status"]) => {
    return status === "active" ? (
      <Badge variant="default">Active</Badge>
    ) : (
      <Badge variant="secondary">Inactive</Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{classData.name}</h1>
            <p className="text-muted-foreground mt-1">
              Class details and enrollment information
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/${role}/students/enrollment/classes/${classId}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Class
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Class Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Class Name</p>
              <p className="font-medium text-lg">{classData.name}</p>
            </div>
            {classData.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="font-medium">{classData.description}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Academic Year</p>
              <p className="font-medium">{classData.academicYear}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              {getStatusBadge(classData.status)}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Capacity Per Section</p>
              <p className="font-medium">{classData.capacityPerSection} students</p>
            </div>
            {classData.order !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Order</p>
                <p className="font-medium">{classData.order}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Sections & Enrollment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Sections</p>
              <div className="flex flex-wrap gap-2">
                {classData.sections.map((section) => {
                  const count = sectionCounts[section] || 0;
                  const capacity = classData.capacityPerSection;
                  const available = capacity - count;
                  return (
                    <div
                      key={section}
                      className="border rounded-lg p-3 flex-1 min-w-[120px]"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-sm">
                          Section {section}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>
                          Enrolled: <span className="font-medium">{count}</span>
                        </p>
                        <p>
                          Available:{" "}
                          <span
                            className={`font-medium ${
                              available > 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {available}
                          </span>
                        </p>
                        <p>
                          Capacity: <span className="font-medium">{capacity}</span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Enrollments</p>
              <p className="font-medium text-lg">
                {classEnrollments.length} students
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

