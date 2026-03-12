import { KeyRound, Plus, RefreshCcw, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";

export default function StudentsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [resettingId, setResettingId] = useState(null);
  const [createdLogin, setCreatedLogin] = useState(null); // { name, email, tempPassword }

  const fetchStudents = () => {
    if (!token) return;
    setLoading(true);
    setError("");
    api
      .students(token, { q: query || undefined })
      .then((data) => {
        setStudents(Array.isArray(data) ? data : []);
      })
      .catch((e) => {
        setError(e?.message || "Failed to load students");
        setStudents([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  useEffect(() => {
    const delay = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(delay);
  }, [token, query]);

  const resetPassword = (studentId, name) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to reset the login password for ${name}?`)) return;
    
    setResettingId(studentId);
    setCreatedLogin(null);
    
    api.resetStudentPassword(token, studentId)
      .then((result) => {
        const user = result?.studentUser;
        if (user && user.tempPassword) {
          setCreatedLogin({
            name,
            email: user.email,
            tempPassword: user.tempPassword,
          });
          toast({
            title: "Password Reset Successful",
            description: `Generated new temporary password for ${name}.`,
          });
        } else {
          toast({
            title: "Password Reset Failed",
            description: "No temporary password was returned from the server.",
          });
        }
      })
      .catch((e) => {
        toast({ title: "Reset failed", description: e?.message || "Failed to reset password" });
      })
      .finally(() => {
        setResettingId(null);
      });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Directory & Logins"
        description="Manage students, view their details, and reset their login passwords."
        action={
          <Link to="/register-student">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Register New Student
            </Button>
          </Link>
        }
      />

      {createdLogin ? (
        <Card className="border-0 bg-sky-50/50">
          <CardHeader>
            <CardTitle className="text-sky-900">New Login Details for {createdLogin.name}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-sky-800">
              Share these new login credentials with the student. They should log in and change their password.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-sky-100">
                <p className="text-xs font-medium text-slate-500">Email</p>
                <p className="mt-1 font-mono text-sm text-slate-900">{createdLogin.email}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm border border-sky-100">
                <p className="text-xs font-medium text-slate-500">Temporary Password</p>
                <p className="mt-1 font-mono text-sm text-slate-900">{createdLogin.tempPassword}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                onClick={async () => {
                  const text = `Student Login for ${createdLogin.name}\nEmail: ${createdLogin.email}\nTemp Password: ${createdLogin.tempPassword}`;
                  try {
                    await navigator.clipboard.writeText(text);
                    toast({ title: "Copied", description: "Login details copied to clipboard." });
                  } catch {
                    toast({ title: "Copy failed", description: "Clipboard permission denied. Copy manually." });
                  }
                }}
              >
                Copy Login Details
              </Button>
              <Button variant="outline" onClick={() => setCreatedLogin(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-0">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>All Students</CardTitle>
              <CardDescription>Search by name, ID, or email.</CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={fetchStudents}
              disabled={loading}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Input
            placeholder="Search students..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) {
                setSearchParams({ q: e.target.value });
              } else {
                setSearchParams({});
              }
            }}
            className="max-w-md"
          />

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Logins</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-6">
                    Loading students...
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-500 py-6">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                    <TableCell>{s.studentId}</TableCell>
                    <TableCell>{s.department}</TableCell>
                    <TableCell className="text-slate-600">{s.email}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        disabled={resettingId === s.studentId}
                        onClick={() => resetPassword(s.studentId, s.name)}
                      >
                        <KeyRound className="mr-2 h-3 w-3" />
                        {resettingId === s.studentId ? "Resetting..." : "Reset Password"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
