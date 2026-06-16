import {
  ArrowRightLeft,
  Award,
  Baby,
  BadgeIndianRupee,
  Bell,
  BookOpen,
  BookText,
  Briefcase,
  Calendar,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Clock,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  Home,
  LogIn,
  List,
  LogOut,
  Printer,
  ScanLine,
  Settings,
  TrendingUp,
  User,
  UserCheck,
  Users,
  Users2Icon,
  Video,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { useAppStore } from "@/hooks/use-app-store";
import type { UserRole } from "@/lib/types/user.type";

export type NavigationSubItem = {
  title: string;
  url: string;
  icon?: React.ElementType;
  /** When set, used as-is instead of `/{role}{url}` */
  fullPath?: string;
};

export type NavigationItem = {
  title: string;
  url?: string;
  icon: React.ElementType;
  roles: UserRole[];
  /** When set, used as-is instead of `/{role}{url}` */
  fullPath?: string;
  subItems?: NavigationSubItem[];
};

const ADMIN_NAVIGATION: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    roles: ["admin"],
  },
  {
    title: "Staffs",
    icon: Users2Icon,
    roles: ["admin"],
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
    title: "Leave Management",
    icon: CalendarDays,
    roles: ["admin"],
    subItems: [
      { title: "Overview", url: "/leave", icon: CalendarDays },
      { title: "School Calendar", url: "/leave/calendar", icon: Calendar },
      { title: "Leave Types", url: "/leave/types", icon: BookText },
      { title: "Applications", url: "/leave/applications", icon: ClipboardList },
      { title: "Convert Absences", url: "/leave/convert", icon: ArrowRightLeft },
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
    roles: ["admin"],
  },
  {
    title: "Gate Scanners",
    icon: ScanLine,
    roles: ["admin"],
    fullPath: "/gate",
    subItems: [
      { title: "Scanner hub", url: "/gate", fullPath: "/gate", icon: ScanLine },
      { title: "Activity log", url: "/gate/activity", fullPath: "/gate/activity", icon: Bell },
      { title: "Entry Scanner", url: "/gate/entry", fullPath: "/gate/entry", icon: LogIn },
      { title: "Exit Scanner", url: "/gate/exit", fullPath: "/gate/exit", icon: LogOut },
    ],
  },
  {
    title: "ID Card Data",
    icon: CreditCard,
    roles: ["admin"],
    subItems: [
      { title: "Export / Import", url: "/id-cards", icon: CreditCard },
      { title: "Print ID Cards", url: "/id-cards/print", icon: Printer },
    ],
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
    roles: ["admin"],
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
];

function buildStaffNavigation(userId?: string): NavigationItem[] {
  const items: NavigationItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      roles: ["staff"],
    },
    {
      title: "My Attendance",
      url: "/attendance",
      icon: Clock,
      roles: ["staff"],
    },
    {
      title: "My Leave",
      url: "/leave",
      icon: CalendarDays,
      roles: ["staff"],
    },
  ];

  if (userId) {
    items.push({
      title: "My Schedule",
      url: `/staffs/${userId}/time-table`,
      icon: CalendarClock,
      roles: ["staff"],
    });
  }

  return items;
}

function buildStudentNavigation(studentId?: string): NavigationItem[] {
  const items: NavigationItem[] = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      roles: ["student"],
    },
    {
      title: "Fee Details",
      url: "/fees",
      icon: Wallet,
      roles: ["student"],
    },
    {
      title: "Class Time Table",
      url: "/time-table",
      icon: CalendarClock,
      roles: ["student"],
    },
    {
      title: "Gate activity",
      url: "/gate-activity",
      icon: Bell,
      roles: ["student"],
    },
  ];

  if (studentId) {
    items.push({
      title: "My Profile",
      url: `/students/${studentId}`,
      icon: User,
      roles: ["student"],
    });
  }

  return items;
}

const PARENT_NAVIGATION: NavigationItem[] = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    roles: ["parent"],
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
    roles: ["parent"],
  },
  {
    title: "Time Table",
    url: "/time-table",
    icon: CalendarClock,
    roles: ["parent"],
  },
];

export function useMenuItems() {
  const user = useAppStore((state) => state.user);
  const role = user?.role;

  const navigationItems = useMemo(() => {
    if (!role) return [];
    switch (role) {
      case "admin":
        return ADMIN_NAVIGATION;
      case "staff":
        return buildStaffNavigation(user.uid);
      case "student":
        return buildStudentNavigation(user.studentId);
      case "parent":
        return PARENT_NAVIGATION;
      default:
        return [];
    }
  }, [role, user?.uid, user?.studentId]);

  const settingsItems = useMemo(
    () => [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
    ],
    [],
  );

  return {
    navigationItems,
    settingsItems,
  };
}

/** @deprecated Use useMenuItems hook — kept for type exports and static admin list */
export function getAdminNavigationItems(): NavigationItem[] {
  return ADMIN_NAVIGATION;
}
