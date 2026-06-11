"use client";

import { useAppStore } from "@/hooks/use-app-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CalendarClock,
  Clock,
  Mail,
  Phone,
  Sparkles,
  User,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export function StaffDashboard() {
  const router = useRouter();
  const params = useParams();
  const role = params.role as string;
  const user = useAppStore((state) => state.user);

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "S";

  const quickLinks = [
    {
      title: "My Attendance",
      description: "Punch in/out and view your attendance history",
      icon: Clock,
      href: `/${role}/attendance`,
    },
    ...(user?.uid
      ? [
          {
            title: "My Schedule",
            description: "View your teaching timetable",
            icon: CalendarClock,
            href: `/${role}/staffs/${user.uid}/time-table`,
          },
        ]
      : []),
    {
      title: "Profile Settings",
      description: "Update your name and profile photo",
      icon: User,
      href: `/${role}/settings`,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 p-4 sm:p-6">
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-inner">
          <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {getGreeting()}, {user?.name?.split(" ")[0] || "Staff"}!
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Your personal workspace — attendance, schedule, and profile.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16 border-2 border-border">
            <AvatarImage src={user?.profilePicture} alt={user?.name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle>{user?.name}</CardTitle>
            <p className="text-sm text-muted-foreground capitalize">
              {user?.staffType?.replace("-", " ") || "Staff"}
              {user?.position ? ` · ${user.position}` : ""}
            </p>
            {user?.email ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {user.email}
              </p>
            ) : null}
            {user?.phoneNumber ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {user.phoneNumber}
              </p>
            ) : null}
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Card
              key={link.title}
              className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
              onClick={() => router.push(link.href)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{link.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{link.description}</p>
                <Button variant="link" className="px-0 mt-2 h-auto">
                  Open →
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
