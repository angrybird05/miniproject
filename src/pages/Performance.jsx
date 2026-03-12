import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";

const levelTone = {
  Good: "emerald",
  Average: "amber",
  Poor: "rose"
};

function levelForScore(score) {
  if (score >= 80) return "Good";
  if (score >= 65) return "Average";
  return "Poor";
}

export default function PerformancePage() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError("");
    api
      .performance(token)
      .then((data) => {
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Failed to load performance records");
        setRows([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token]);

  const tableRows = useMemo(() => {
    return rows.map((student) => {
      const attendance = Number(student.attendancePercentage ?? 0);
      const internalMarks = Number(student.internalMarks ?? 0);
      const assignmentScore = Number(student.assignmentScore ?? 0);
      const overall = Number(student.overallPerformanceScore ?? 0);
      const level = levelForScore(overall);
      return {
        name: student.name,
        studentId: student.studentId,
        attendance,
        internalMarks,
        assignmentScore,
        overall,
        level,
      };
    });
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Performance"
        description="Compare attendance behavior with internal scores, assignment outcomes, and overall performance."
      />

      <Card className="border-0">
        <CardContent className="p-6">
          {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Attendance %</TableHead>
                <TableHead>Internal Marks</TableHead>
                <TableHead>Assignment Score</TableHead>
                <TableHead>Overall Score</TableHead>
                <TableHead>Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-slate-500">
                    Loading performance...
                  </TableCell>
                </TableRow>
              ) : tableRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-slate-500">
                    No performance records found.
                  </TableCell>
                </TableRow>
              ) : tableRows.map((student) => (
                <TableRow key={student.studentId}>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.studentId}</TableCell>
                  <TableCell className="min-w-40">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">{student.attendance}%</p>
                      <Progress value={student.attendance} />
                    </div>
                  </TableCell>
                  <TableCell>{student.internalMarks}</TableCell>
                  <TableCell>{student.assignmentScore}</TableCell>
                  <TableCell className="min-w-40">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-slate-700">{student.overall}%</p>
                      <Progress value={student.overall} />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge tone={levelTone[student.level]}>{student.level}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
