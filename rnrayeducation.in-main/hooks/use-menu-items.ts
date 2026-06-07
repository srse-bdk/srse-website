import {
  Award,
  Baby,
  BadgeIndianRupee,
  Bell,
  BookOpen,
  BookText,
  Briefcase,
  Calendar,
  CalendarClock,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  Home,
  List,
  ScanLine,
  Settings,
  TrendingUp,
  UserCheck,
  Users,
  Users2Icon,
  Video,
  Wallet,
} from "lucide-react";
import type { UserRole } from "@/lib/types/user.type";

export type NavigationSubItem = {
  title: string;
  url: string;
  icon?: React.ElementType;
};

export type NavigationItem = {
  title: string;
  url?: string; // Optional - if has subItems, url is optional
  icon: React.ElementType;
  roles: UserRole[];
  subItems?: NavigationSubItem[];
};

export function useMenuItems() {
  const navigationItems: NavigationItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      roles: ["admin", "staff", "parent"],
    },
    {
      title: "Staffs",
      icon: Users2Icon,
      roles: ["admin", "staff"],
      subItems: [
        { title: "Staffs List", url: "/staffs", icon: List },
        { title: "Teaching", url: "/staffs?type=teaching", icon: Users2Icon },
        {
          title: "Non-teaching",
          url: "/staffs?type=non-teaching",
          icon: Users,
        },
        { title: "Attendance", url: "/attendance", icon: Clock },
      ],
    },
    {
      title: "Students",
      icon: GraduationCap,
      roles: ["admin"],
      subItems: [
        { title: "Students List", url: "/students", icon: List },
        {
          title: "Class Enrollment",
          url: "/students/enrollment",
          icon: UserCheck,
        },
        {
          title: "Class Management",
          url: "/students/enrollment/classes",
          icon: BookOpen,
        },
        {
          title: "Attendance",
          url: "/students/attendance",
          icon: Calendar,
        },
      ],
    },
    {
      title: "Blogs",
      url: "/blogs",
      icon: FileText,
      roles: ["admin"],
    },
    {
      title: "Send Notifications",
      url: "/notifications",
      icon: Bell,
      roles: ["admin"],
    },
    {
      title: "Subjects",
      url: "/subjects",
      icon: BookText,
      roles: ["admin"],
    },
    {
      title: "Time Table",
      url: "/time-table",
      icon: CalendarClock,
      roles: ["admin", "staff"],
    },
    {
      title: "Gate Scanner",
      url: "/scanner",
      icon: ScanLine,
      roles: ["admin", "staff"],
    },
    {
      title: "ID Card Data",
      url: "/id-cards",
      icon: CreditCard,
      roles: ["admin"],
    },
    {
      title: "Certificates",
      icon: Award,
      roles: ["admin"],
      subItems: [
        {
          title: "Experience Certificate",
          url: "/certificates/experience",
          icon: Briefcase,
        },
        {
          title: "Appointment Letter",
          url: "/certificates/appointment",
          icon: FileCheck,
        },
        {
          title: "Increment Letter",
          url: "/certificates/increment",
          icon: TrendingUp,
        },
      ],
    },

    {
      title: "Fees Management",
      icon: Wallet,
      roles: ["admin", "staff"],
      subItems: [
        { title: "Dashboard", url: "/fees", icon: Home },
        { title: "Fee Structure", url: "/fees/structure", icon: Settings },
        {
          title: "Financial Activities",
          url: "/financial-activities",
          icon: BadgeIndianRupee,
        },
        {
          title: "Income / Expenses",
          url: "/income-expenses",
          icon: TrendingUp,
        },
      ],
    },
    {
      title: "Parents",
      url: "/parents",
      icon: Users,
      roles: ["admin"],
    },
    {
      title: "Video Management",
      url: "/video-management",
      icon: Video,
      roles: ["admin"],
    },
    {
      title: "My Children",
      url: "/children",
      icon: Baby,
      roles: ["parent"],
    },
    {
      title: "Fee Details",
      url: "/fees",
      icon: Wallet,
      roles: ["parent", "student"],
    },
  ];

  const settingsItems = [
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
    },
  ];

  const filteredSettingsItems = (role: UserRole) => {
    if (role === "student") return [];
    return settingsItems;
  };

  return {
    navigationItems,
    settingsItems: filteredSettingsItems,
  };
}
