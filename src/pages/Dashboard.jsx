import { Activity, ArrowUpRight, BellRing, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import AnalyticsCharts from "@/charts/AnalyticsCharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";

export default function DashboardPage() {
  const { token } = useAuth();
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError("");
    Promise.all([api.statsSummary(token), api.analytics(token)])
      .then(([s, a]) => {
        if (!mounted) return;
        setSummary(s);
        setAnalytics(a);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Failed to load dashboard data");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const statCards = useMemo(() => {
    const totalStudents = summary?.totalStudents ?? "—";
    const totalClasses = summary?.totalClasses ?? "—";
    const attendancePercentage =
      summary?.attendancePercentage != null ? `${summary.attendancePercentage}%` : "—";
    const avgPerformance =
      summary?.averageStudentPerformance != null ? `${summary.averageStudentPerformance}%` : "—";

    return [
      { title: "Total Students", value: String(totalStudents), change: "Live", icon: "Users", tone: "from-sky-500 to-cyan-400" },
      { title: "Total Classes", value: String(totalClasses), change: "Live", icon: "BookOpen", tone: "from-amber-400 to-orange-400" },
      { title: "Attendance Percentage", value: String(attendancePercentage), change: "Live", icon: "CalendarCheck2", tone: "from-emerald-500 to-teal-400" },
      { title: "Average Performance", value: String(avgPerformance), change: "Live", icon: "TrendingUp", tone: "from-fuchsia-500 to-pink-400" }
    ];
  }, [summary]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Live overview of attendance operations and academic outcomes."
        action={<Button>Generate Report</Button>}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </section>

      <section className="grid gap-6">
        {error ? (
          <Card className="border-0">
            <CardContent className="p-6 text-sm text-rose-600">{error}</CardContent>
          </Card>
        ) : (
          <AnalyticsCharts data={analytics || undefined} />
        )}
        {loading ? <p className="text-sm text-slate-500">Loading dashboard analytics...</p> : null}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Recent Alerts</CardTitle>
            <CardDescription>Students and classes needing quick action.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { icon: BellRing, title: "Low attendance detected", meta: "Kabir Singh dropped below 70% attendance.", badge: "Urgent" },
              { icon: Activity, title: "Performance improvement", meta: "Class CSE-3 average score improved by 5.2%.", badge: "Update" },
              { icon: Clock3, title: "Late attendance spike", meta: "8 students marked late in the 9:00 AM session.", badge: "Review" }
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-4 rounded-2xl bg-slate-50 p-4">
                <div className="rounded-2xl bg-sky-100 p-3 text-sky-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <Badge tone={item.badge === "Urgent" ? "rose" : item.badge === "Update" ? "emerald" : "amber"}>{item.badge}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.meta}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-0 bg-slate-900 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">Campus AI Status</p>
                <p className="mt-2 text-2xl font-semibold">Face recognition engine active</p>
              </div>
              <ArrowUpRight className="h-6 w-6 text-emerald-300" />
            </div>
            <p className="mt-3 text-sm text-slate-300">
              Real-time recognition latency is stable at 0.8 seconds with 97.8% matching confidence.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
