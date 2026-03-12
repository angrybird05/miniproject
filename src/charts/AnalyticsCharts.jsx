import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import ChartCard from "@/charts/ChartCard";
import {
  attendanceVsPerformance,
  lowAttendanceStudents,
  monthlyPerformanceTrend,
  topPerformers
} from "@/utils/mockData";

const axisStyle = { fontSize: 12, fill: "#64748b" };

export default function AnalyticsCharts({ data }) {
  const series = data || {
    attendanceVsPerformance,
    topPerformers,
    lowAttendanceStudents,
    monthlyPerformanceTrend,
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <ChartCard title="Attendance vs Performance" description="Relationship between attendance consistency and academic score.">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.attendanceVsPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="attendance" stroke="#0ea5e9" strokeWidth={3} />
              <Line type="monotone" dataKey="performance" stroke="#10b981" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Top Performing Students" description="High performers based on overall performance score.">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series.topPerformers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Bar dataKey="score" fill="#0ea5e9" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Low Attendance Students" description="Students who need early intervention based on attendance.">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series.lowAttendanceStudents} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={axisStyle} />
              <YAxis dataKey="name" type="category" tick={axisStyle} />
              <Tooltip />
              <Bar dataKey="attendance" fill="#f59e0b" radius={[0, 10, 10, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Monthly Performance Trends" description="Month over month change in student performance.">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.monthlyPerformanceTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={axisStyle} />
              <YAxis tick={axisStyle} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
