"use client";

import { useFirebaseRealtime } from "@/hooks/use-firebase-realtime";
import type { Student } from "@/lib/types/student.type";
import type { FeeConfiguration } from "@/lib/types/fee.type";
import { useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Users,
  FileText,
  Edit,
  Calendar,
  CreditCard,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AddOptionalFeeDialog } from "./_components/add-optional-fee-dialog";
// Import separated components if I had them, but I'll inline for now to keep it simple as per request to "change ui of this page"
// Actually, I'll build it robustly.

export default function StudentProfilePage() {
  const params = useParams();
  const studentId = params.id as string;
  const role = params.role as string;

  const {
    data: studentData,
    loading: studentLoading,
    error,
  } = useFirebaseRealtime<Student>(`students/${studentId}`, { asArray: false });

  // Also fetch fee configs to display names of assigned optional fees
  const { data: feesData, loading: feesLoading } =
    useFirebaseRealtime<FeeConfiguration>("feeConfigurations", {
      asArray: true,
    });

  const student = studentData as Student | null;
  const allFees = (feesData as FeeConfiguration[]) || [];

  if (studentLoading || feesLoading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6 max-w-7xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Student Not Found</CardTitle>
            <CardDescription className="text-red-700">
              {error instanceof Error
                ? error.message
                : "The requested student profile could not be loaded."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Filter by fee ID presence in either optionalFeeIds array or optionalFeeAmounts map keys
  const assignedOptionalFees = allFees.filter((f) => {
    const feeIds = student.optionalFeeIds || [];
    const feeAmounts = student.optionalFeeAmounts || {};

    const hasId = feeIds.includes(f.id);
    const hasAmount = Object.prototype.hasOwnProperty.call(feeAmounts, f.id);

    return hasId || hasAmount;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500 hover:bg-emerald-600">Active</Badge>
        );
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>;
      case "graduated":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600">
            Graduated
          </Badge>
        );
      case "transferred":
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600">
            Transferred
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-8 max-w-7xl">
      {/* Modern Profile Header */}
      <div className="relative rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background shadow-md">
            <AvatarImage
              src={student.profilePicture}
              className="object-cover"
            />
            <AvatarFallback className="bg-primary/10 text-primary">
              <GraduationCap className="h-12 w-12" />
            </AvatarFallback>
          </Avatar>

          <div className="text-center sm:text-left space-y-2 flex-1">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {student.fullName}
              </h1>
              {getStatusBadge(student.status)}
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                <span>{student.admissionNumber}</span>
              </div>
              {student.currentClass && (
                <div className="flex items-center gap-1.5 text-foreground font-medium">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  <span>
                    Class {student.currentClass}{" "}
                    {student.currentSection
                      ? `- ${student.currentSection}`
                      : ""}
                  </span>
                </div>
              )}
              {student.rollNumber && (
                <div className="flex items-center gap-1.5">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs">
                    Roll: {student.rollNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto flex justify-center sm:justify-end">
          <Button asChild variant="outline" className="gap-2">
            <Link href={`/${role}/students/${student.id}/edit`}>
              <Edit className="h-4 w-4" />
              Edit Profile
            </Link>
          </Button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex md:grid-cols-4 p-1 h-auto gap-1 bg-muted/50 rounded-lg">
          <TabsTrigger value="overview" className="h-9 px-4 rounded-md">
            Overview
          </TabsTrigger>
          <TabsTrigger value="academic" className="h-9 px-4 rounded-md">
            Academics & Fees
          </TabsTrigger>
          <TabsTrigger value="guardians" className="h-9 px-4 rounded-md">
            Guardians
          </TabsTrigger>
          <TabsTrigger value="documents" className="h-9 px-4 rounded-md">
            Documents
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Personal Info */}
            <Card className="md:col-span-2 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Personal Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Full Name
                  </span>
                  <p className="font-medium">{student.fullName}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Date of Birth
                  </span>
                  <p className="font-medium flex items-center gap-2">
                    {student.dateOfBirth
                      ? new Date(student.dateOfBirth).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Gender
                  </span>
                  <p className="font-medium capitalize">{student.gender}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Blood Group
                  </span>
                  <p className="font-medium">{student.bloodGroup || "-"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Admission Date
                  </span>
                  <p className="font-medium">
                    {student.admissionDate
                      ? new Date(student.admissionDate).toLocaleDateString()
                      : "-"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card className="shadow-sm h-fit">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Phone className="h-5 w-5 text-primary" />
                  Contact Info
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-md shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      Primary Phone
                    </span>
                    <p className="text-sm font-medium">
                      {student.phone || "-"}
                    </p>
                  </div>
                </div>

                {student.alternatePhone && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-md shrink-0">
                      <Phone className="h-4 w-4 text-primary" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs text-muted-foreground font-medium">
                        Alternate Phone
                      </span>
                      <p className="text-sm font-medium">
                        {student.alternatePhone}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-md shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      Address
                    </span>
                    <div className="text-sm font-medium leading-relaxed">
                      {student.address.street && (
                        <p>{student.address.street}</p>
                      )}
                      <p>
                        {[
                          student.address.city,
                          [student.address.state, student.address.pincode]
                            .filter(Boolean)
                            .join(" - "),
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                      {student.address.country && (
                        <p>{student.address.country}</p>
                      )}
                      {!student.address.street &&
                        !student.address.city &&
                        !student.address.state &&
                        !student.address.country && <p>-</p>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="academic" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Enrollment Status */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  Academic Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {student.currentClass ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/40 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          Current Class
                        </p>
                        <p className="text-lg font-bold">
                          {student.currentClass}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="text-base px-3 py-1 bg-background"
                      >
                        Section {student.currentSection || "A"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 border rounded-md">
                        <p className="text-xs text-muted-foreground">
                          Roll Number
                        </p>
                        <p className="font-semibold">
                          {student.rollNumber || "Not Assigned"}
                        </p>
                      </div>
                      <div className="p-3 border rounded-md">
                        <p className="text-xs text-muted-foreground">
                          Academic Year
                        </p>
                        <p className="font-semibold">
                          {student.admissionDate
                            ? new Date(student.admissionDate).getFullYear()
                            : new Date().getFullYear()}
                        </p>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full mt-2" asChild>
                      <Link href={`/${role}/students/enrollment/enroll`}>
                        View Enrollment History
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No active enrollment found.
                    </p>
                    <Button asChild>
                      <Link href={`/${role}/students/enrollment/enroll`}>
                        Enroll Student Now
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Optional Fees Section */}
            <Card>
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Optional Fees
                </CardTitle>
                <AddOptionalFeeDialog student={student} />
              </CardHeader>
              <CardContent className="pt-6">
                {/* DEBUG SECTION */}
                <div className="mb-4 p-2 bg-yellow-100 text-xs font-mono rounded border border-yellow-300">
                  <p>DEBUG INFO:</p>
                  <p>All Fees Count: {allFees.length}</p>
                  <p>
                    Student Fee IDs: {JSON.stringify(student.optionalFeeIds)}
                  </p>
                  <p>
                    Student Fee Amounts:{" "}
                    {JSON.stringify(student.optionalFeeAmounts)}
                  </p>
                  <p>Assigned Count: {assignedOptionalFees.length}</p>
                </div>

                <div className="space-y-4">
                  {assignedOptionalFees.length > 0 ? (
                    <div className="space-y-2">
                      {assignedOptionalFees.map((fee) => {
                        const amount =
                          student.optionalFeeAmounts?.[fee.id] ?? 0;
                        return (
                          <div
                            key={fee.id}
                            className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                          >
                            <div className="space-y-1">
                              <div className="font-medium flex items-center gap-2">
                                {fee.name}
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] h-5"
                                >
                                  {fee.cycle}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Academic Year: {fee.academicYear}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold block">
                                ₹ {amount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="border border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center">
                      <div className="p-3 bg-muted rounded-full mb-3">
                        <CreditCard className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-sm">No Optional Fees</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        Assign transport, library, or other optional fees to
                        this student.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="guardians" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Guardians & Parents
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {student.guardians?.map((guardian) => (
                  <div
                    key={guardian.id}
                    className="group relative border rounded-xl p-5 hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {guardian.name}
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {guardian.relationship}
                          </Badge>
                          {guardian.isPrimary && (
                            <Badge className="bg-primary/15 text-primary hover:bg-primary/20 border-0">
                              Primary Contact
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 text-sm">
                      {guardian.phone && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{guardian.phone}</span>
                        </div>
                      )}
                      {guardian.email && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span>{guardian.email}</span>
                        </div>
                      )}
                      {guardian.occupation && (
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Building2 className="h-4 w-4" />
                          <span>{guardian.occupation}</span>
                        </div>
                      )}
                      {guardian.address && (
                        <div className="mt-3 pt-3 border-t text-muted-foreground">
                          <p className="text-xs font-medium uppercase mb-1">
                            Address
                          </p>
                          <span className="leading-relaxed">
                            {guardian.address}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {(!student.guardians || student.guardians.length === 0) && (
                  <p className="col-span-2 text-center py-8 text-muted-foreground">
                    No guardian information found.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <Card>
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Uploaded Documents
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {student.documents && student.documents.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {student.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                    >
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="font-medium truncate" title={doc.label}>
                          {doc.label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                        <Button
                          variant="link"
                          className="px-0 h-auto text-xs mt-2"
                          asChild
                        >
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Document
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <div className="p-3 bg-muted rounded-full inline-block mb-3">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium">No Documents</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    There are no documents uploaded for this student.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
