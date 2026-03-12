import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import AnalyticsCharts from "@/charts/AnalyticsCharts";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";
import { Card, CardContent } from "@/components/ui/card";

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError("");
    api
      .analytics(token)
      .then((d) => {
        if (!mounted) return;
        setData(d);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Failed to load analytics");
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
        title="Performance Analytics"
        description="Visualize attendance behavior, high achievers, at-risk students, and monthly trends."
      />
      {error ? (
        <Card className="border-0">
          <CardContent className="p-6 text-sm text-rose-600">{error}</CardContent>
        </Card>
      ) : (
        <AnalyticsCharts data={data || undefined} />
      )}
      {loading ? <p className="text-sm text-slate-500">Loading analytics...</p> : null}
    </div>
  );
}
