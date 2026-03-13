import { BarChart3, BookOpen, CalendarDays, Camera, ClipboardCheck, LayoutDashboard, UserPlus2, Users, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useAuth } from "@/utils/auth";

export default function SidebarNav({ mobile = false }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const links = isAdmin
    ? [
        { to: "/", label: "Dashboard", icon: LayoutDashboard },
        { to: "/classes", label: "Classes", icon: BookOpen },
        { to: "/students", label: "Students", icon: Users },
        { to: "/register-student", label: "Register Student", icon: UserPlus2 },
        { to: "/attendance/camera", label: "Camera Attendance", icon: Camera },
        { to: "/attendance/manual", label: "Manual Attendance", icon: ClipboardCheck },
        { to: "/records", label: "Attendance Records", icon: CalendarDays },
        { to: "/performance", label: "Student Performance", icon: Users },
        { to: "/analytics", label: "Analytics", icon: BarChart3 },
        { to: "/profile", label: "Settings", icon: Settings },
      ]
    : [
        { to: "/", label: "Home", icon: LayoutDashboard },
        { to: "/records", label: "My Attendance", icon: CalendarDays },
        { to: "/performance", label: "My Performance", icon: Users },
        { to: "/profile", label: "Settings", icon: Settings },
      ];

  return (
    <nav className={cn("space-y-2", mobile && "grid grid-cols-2 gap-2 space-y-0")}>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all",
              isActive
                ? "bg-slate-900 text-white shadow-lg"
                : "text-slate-600 hover:bg-white hover:text-slate-900",
            )
          }
        >
          <Icon className="h-4 w-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
