import { LogOut, Menu, Search } from "lucide-react";
import { useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import SidebarNav from "@/components/SidebarNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/utils/auth";

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r border-white/50 bg-slate-100/80 p-6 lg:block">
        <Link to="/" className="mb-8 flex items-center gap-3 px-2">
          <div className="rounded-2xl bg-slate-900 p-3 text-white shadow-lg">
            <span className="text-lg font-bold">SA</span>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Smart Attendance</p>
            <p className="text-sm text-slate-500">{user?.role === "Admin" ? "Admin Console" : "Student Portal"}</p>
          </div>
        </Link>
        <SidebarNav />
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 border-b border-white/60 bg-slate-50/80 px-4 py-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="lg:hidden" onClick={() => setOpen((value) => !value)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input 
                  className="w-72 pl-9" 
                  placeholder="Search students..." 
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && e.target.value.trim()) {
                      const val = e.target.value.trim();
                      e.target.value = "";
                      navigate(`/students?q=${encodeURIComponent(val)}`);
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">{user?.name || "Administrator"}</p>
                <p className="text-xs text-slate-500">{user?.role || "Admin"}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 font-semibold text-white shadow-lg">
                {(user?.name || "Admin")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((s) => s[0]?.toUpperCase())
                  .join("")}
              </div>
              <Button
                variant="ghost"
                className="hidden md:inline-flex"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
          {open ? (
            <div className="mt-4 rounded-2xl bg-white p-4 shadow-soft lg:hidden">
              <SidebarNav mobile />
            </div>
          ) : null}
        </header>

        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
