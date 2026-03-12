import { ClipboardCheck, RefreshCcw } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";

function defaultDateValue() {
  return new Date().toISOString().slice(0, 10);
}

function defaultTimeValue() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function toAmPm(timeValue) {
  // Accepts "HH:MM" and returns "hh:MM AM/PM". If it's already formatted, return as-is.
  const m = String(timeValue || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return String(timeValue || "");
  const h = Number(m[1]);
  const minutes = m[2];
  if (!Number.isFinite(h)) return String(timeValue || "");
  const period = h >= 12 ? "PM" : "AM";
  const hh = String(((h + 11) % 12) + 1).padStart(2, "0");
  return `${hh}:${minutes} ${period}`;
}

export default function AttendanceManualPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState("");

  const [classCode, setClassCode] = useState("");
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(defaultDateValue);
  const [time, setTime] = useState(defaultTimeValue);
  const [scope, setScope] = useState("dept"); // dept | all
  const [statusByStudent, setStatusByStudent] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const selectedClass = useMemo(() => classes.find((c) => c.code === classCode) || null, [classes, classCode]);
  const eligibleStudents = useMemo(() => {
    if (scope === "all") return students;
    if (!selectedClass?.department) return students;
    const dept = String(selectedClass.department || "").trim().toLowerCase();
    return students.filter((s) => String(s.department || "").trim().toLowerCase() === dept);
  }, [students, selectedClass, scope]);

  const fetchClasses = () => {
    if (!token) return;
    setClassesLoading(true);
    setClassesError("");
    api
      .classes(token)
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch((e) => {
        setClassesError(e?.message || "Failed to load classes");
        setClasses([]);
      })
      .finally(() => setClassesLoading(false));
  };

  const fetchStudents = () => {
    if (!token) return;
    setStudentsLoading(true);
    setStudentsError("");
    api
      .students(token)
      .then((data) => setStudents(Array.isArray(data) ? data : []))
      .catch((e) => {
        setStudentsError(e?.message || "Failed to load students");
        setStudents([]);
      })
      .finally(() => setStudentsLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    fetchClasses();
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const preferred = String(searchParams.get("class") || "").trim();
    if (!preferred) return;
    setClassCode(preferred);
  }, [searchParams]);

  useEffect(() => {
    if (classCode) return;
    if (classesLoading) return;
    if (classes.length === 0) return;
    setClassCode(classes[0].code);
  }, [classCode, classesLoading, classes]);

  useEffect(() => {
    if (eligibleStudents.length === 0) {
      setStatusByStudent({});
      return;
    }
    setStatusByStudent((prev) => {
      const next = { ...(prev || {}) };
      const studentIds = new Set(eligibleStudents.map((s) => s.studentId));
      for (const s of eligibleStudents) {
        if (!next[s.studentId]) next[s.studentId] = "Absent";
      }
      for (const key of Object.keys(next)) {
        if (!studentIds.has(key)) delete next[key];
      }
      return next;
    });
  }, [eligibleStudents]);

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return eligibleStudents;
    return eligibleStudents.filter((s) => {
      const name = String(s.name || "").toLowerCase();
      const sid = String(s.studentId || "").toLowerCase();
      const dept = String(s.department || "").toLowerCase();
      return name.includes(q) || sid.includes(q) || dept.includes(q);
    });
  }, [eligibleStudents, query]);

  const counts = useMemo(() => {
    let present = 0;
    let late = 0;
    let absent = 0;
    eligibleStudents.forEach((s) => {
      const status = statusByStudent?.[s.studentId] || "Absent";
      if (status === "Present") present += 1;
      else if (status === "Late") late += 1;
      else absent += 1;
    });
    return { present, late, absent };
  }, [eligibleStudents, statusByStudent]);

  const markAll = (status) => {
    setStatusByStudent((prev) => {
      const next = { ...(prev || {}) };
      eligibleStudents.forEach((s) => {
        next[s.studentId] = status;
      });
      return next;
    });
  };

  const saveAttendance = () => {
    if (!token) return;
    if (!classCode) {
      toast({ title: "Select a class", description: "Please choose a class before saving attendance." });
      return;
    }
    if (eligibleStudents.length === 0) {
      toast({
        title: "No eligible students",
        description: "No students match this class department. Switch scope to All students or register matching students.",
      });
      return;
    }

    setSubmitting(true);
    const records = eligibleStudents.map((s) => ({
      studentId: s.studentId,
      status: statusByStudent?.[s.studentId] || "Absent",
    }));

    api
      .markAttendance(token, {
        classCode,
        date: date || undefined,
        time: time ? toAmPm(time) : undefined,
        records,
      })
      .then((result) => {
        const insertedCount = result?.insertedCount ?? 0;
        const skippedCount = result?.skippedCount ?? 0;
        const cooldownHours = result?.cooldownHours ?? 4;

        if (insertedCount > 0 && skippedCount === 0) {
          toast({
            title: "Attendance saved",
            description: `Marked ${insertedCount} students for ${classCode}.`,
          });
        } else if (insertedCount > 0 && skippedCount > 0) {
          toast({
            title: "Attendance saved",
            description: `Marked ${insertedCount}. Skipped ${skippedCount} already marked in the last ${cooldownHours} hours.`,
          });
        } else if (insertedCount === 0 && skippedCount > 0) {
          toast({
            title: "Already marked",
            description: `Attendance is already marked in the last ${cooldownHours} hours for this class.`,
          });
        } else {
          toast({ title: "No records saved", description: "No students were eligible to be marked." });
        }
      })
      .catch((e) => {
        toast({ title: "Save failed", description: e?.message || "Failed to save attendance" });
      })
      .finally(() => setSubmitting(false));
  };

  const headerAction = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone="emerald">Present: {counts.present}</Badge>
      <Badge tone="amber">Late: {counts.late}</Badge>
      <Badge tone="rose">Absent: {counts.absent}</Badge>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Attendance"
        description="Select a class and mark each student manually."
        action={headerAction}
      />

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Class Session</CardTitle>
            <CardDescription>Pick the class and session date/time.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {classesError ? <p className="text-sm text-rose-600">{classesError}</p> : null}

            <div className="space-y-2">
              <Label htmlFor="class-code">Class</Label>
              <Select
                id="class-code"
                value={classCode}
                disabled={classesLoading || classes.length === 0}
                onChange={(e) => setClassCode(e.target.value)}
              >
                {classesLoading ? <option value="">Loading...</option> : null}
                {!classesLoading && classes.length === 0 ? <option value="">No classes</option> : null}
                {classes.map((c) => (
                  <option key={c.id} value={c.code}>
                    {c.code} · {c.title}
                  </option>
                ))}
              </Select>
              {selectedClass ? (
                <p className="text-xs text-slate-500">
                  Department: {selectedClass.department} | Students: {eligibleStudents.length}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="attendance-scope">Scope</Label>
                <Select
                  id="attendance-scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                >
                  <option value="dept">Class department only</option>
                  <option value="all">All students</option>
                </Select>
              </div>
              {!classesLoading && classes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Create a class first in{" "}
                  <Link className="font-medium text-slate-900 underline" to="/classes">
                    Classes
                  </Link>
                  .
                </p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="session-date">Date</Label>
                <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-time">Time</Label>
                <Input id="session-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                <p className="text-xs text-slate-500">Saved as {toAmPm(time) || "auto"}.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => markAll("Present")} disabled={eligibleStudents.length === 0}>
                Mark All Present
              </Button>
              <Button variant="outline" onClick={() => markAll("Absent")} disabled={eligibleStudents.length === 0}>
                Mark All Absent
              </Button>
              <Button variant="outline" onClick={() => markAll("Late")} disabled={eligibleStudents.length === 0}>
                Mark All Late
              </Button>
            </div>

            <Button onClick={saveAttendance} disabled={submitting || classes.length === 0 || eligibleStudents.length === 0}>
              <ClipboardCheck className="h-4 w-4" />
              {submitting ? "Saving..." : "Save Attendance"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Students</CardTitle>
                <CardDescription>Set Present/Late/Absent for each student.</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  fetchStudents();
                  fetchClasses();
                }}
                disabled={studentsLoading || classesLoading}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {studentsError ? <p className="text-sm text-rose-600">{studentsError}</p> : null}
            <Input
              placeholder="Search students by name, ID, or department..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="w-[160px]">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-slate-500">
                      Loading students...
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-slate-500">
                      No students found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s) => (
                    <TableRow key={s.studentId}>
                      <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                      <TableCell>{s.studentId}</TableCell>
                      <TableCell>{s.department}</TableCell>
                      <TableCell>
                        <Select
                          value={statusByStudent?.[s.studentId] || "Absent"}
                          onChange={(e) =>
                            setStatusByStudent((prev) => ({
                              ...(prev || {}),
                              [s.studentId]: e.target.value,
                            }))
                          }
                        >
                          <option value="Present">Present</option>
                          <option value="Late">Late</option>
                          <option value="Absent">Absent</option>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <p className="text-xs text-slate-500">
              Tip: Students skipped during save are already marked within the last 4 hours for the same class.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
