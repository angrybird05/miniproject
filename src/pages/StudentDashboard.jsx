import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";

export default function StudentDashboardPage() {
  const { token, user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError("");
    api
      .meSummary(token)
      .then((data) => {
        if (!mounted) return;
        setSummary(data);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Failed to load student summary");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Portal"
        description={`Welcome, ${user?.name || "Student"}. Track your attendance and performance in real time.`}
      />

      {error ? (
        <Card className="border-0">
          <CardContent className="p-6 text-sm text-rose-600">{error}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Attendance Percentage</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">
              {summary ? `${summary.attendancePercentage}%` : "—"}
            </p>
            <div className="mt-4">
              <Progress value={summary?.attendancePercentage ?? 0} />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Present: {summary?.attendanceBreakdown?.Present ?? 0} · Late: {summary?.attendanceBreakdown?.Late ?? 0} · Absent:{" "}
              {summary?.attendanceBreakdown?.Absent ?? 0}
            </p>
            {loading ? <p className="mt-3 text-sm text-slate-500">Loading...</p> : null}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardContent className="p-6">
            <p className="text-sm text-slate-500">Overall Performance</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{summary ? `${summary.overallScore}%` : "—"}</p>
            <div className="mt-4">
              <Progress value={summary?.overallScore ?? 0} />
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Internal: {summary?.internalMarks ?? 0} · Assignment: {summary?.assignmentScore ?? 0}
            </p>
            {loading ? <p className="mt-3 text-sm text-slate-500">Loading...</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card className="border-0">
        <CardContent className="p-6">
          <p className="text-sm text-slate-500">Profile</p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{summary?.name || user?.name || "Student"}</p>
          <p className="text-sm text-slate-500">
            {summary?.studentId ? `Student ID: ${summary.studentId}` : null}
            {summary?.department ? ` · ${summary.department}` : null}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

