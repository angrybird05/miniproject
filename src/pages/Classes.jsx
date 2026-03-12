import { BookOpen, Camera, ClipboardCheck, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";

export default function ClassesPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [department, setDepartment] = useState("");

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    setLoading(true);
    setError("");
    api
      .classes(token, { q: query || undefined })
      .then((data) => {
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        if (!mounted) return;
        setError(e?.message || "Failed to load classes");
        setRows([]);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [token, query]);

  const canCreate = useMemo(() => code.trim() && title.trim() && department.trim(), [code, title, department]);

  const createClass = () => {
    if (!token) return;
    if (!canCreate) {
      toast({ title: "Missing fields", description: "Please fill Code, Title, and Department." });
      return;
    }
    setCreating(true);
    api
      .createClass(token, { code: code.trim(), title: title.trim(), department: department.trim() })
      .then(() => {
        toast({ title: "Class created", description: `${code.trim()} added successfully.` });
        setCode("");
        setTitle("");
        setDepartment("");
        setQuery("");
      })
      .catch((e) => {
        toast({ title: "Create failed", description: e?.message || "Failed to create class" });
      })
      .finally(() => setCreating(false));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes"
        description="Create and manage class definitions, then take attendance for a selected class."
        action={
          <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            <BookOpen className="h-4 w-4" />
            <span>{rows.length} classes</span>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Create Class</CardTitle>
            <CardDescription>Define a class code, title, and department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class-code">Class Code</Label>
              <Input
                id="class-code"
                placeholder="e.g. CSE-3"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-title">Title</Label>
              <Input
                id="class-title"
                placeholder="e.g. Data Structures"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-dept">Department</Label>
              <Input
                id="class-dept"
                placeholder="e.g. Computer Science"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <Button onClick={createClass} disabled={creating || !canCreate}>
              <Plus className="h-4 w-4" />
              {creating ? "Creating..." : "Create Class"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>All Classes</CardTitle>
            <CardDescription>Search by code, title, or department.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error ? <p className="text-sm text-rose-600">{error}</p> : null}
            <Input
              placeholder="Search classes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="w-[240px]">Attendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-slate-500">
                      Loading classes...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-slate-500">
                      No classes found. Create your first class to start taking attendance.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-slate-900">{c.code}</TableCell>
                      <TableCell>{c.title}</TableCell>
                      <TableCell>{c.department}</TableCell>
                      <TableCell>
                        <div className="grid grid-cols-2 gap-2">
                          <Link to={`/attendance/manual?class=${encodeURIComponent(c.code)}`}>
                            <Button variant="outline" className="w-full">
                              <ClipboardCheck className="h-4 w-4" />
                              Manual
                            </Button>
                          </Link>
                          <Link to={`/attendance/camera?class=${encodeURIComponent(c.code)}`}>
                            <Button variant="outline" className="w-full">
                              <Camera className="h-4 w-4" />
                              Camera
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
