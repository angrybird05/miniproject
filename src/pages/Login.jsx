import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/utils/auth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [values, setValues] = useState({ email: "", password: "", role: "Admin" });
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const errors = useMemo(() => {
    const next = {};
    if (!values.email.includes("@")) next.email = "Enter a valid email address.";
    if (values.password.length < 6) next.password = "Password must be at least 6 characters.";
    return next;
  }, [values]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setTouched(true);
    setServerError("");
    if (Object.keys(errors).length !== 0) return;
    setSubmitting(true);
    login(values)
      .then(() => {
        const from = location.state?.from;
        navigate(typeof from === "string" && from.startsWith("/") ? from : "/", { replace: true });
      })
      .catch((e) => {
        const message = e?.message || "Login failed";
        setServerError(message);
        toast({ title: "Login failed", description: message });
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.35),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.25),_transparent_25%)]" />
      <div className="grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="relative hidden text-white lg:block">
          <div className="max-w-xl space-y-6">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              Secure campus intelligence dashboard
            </div>
            <h1 className="text-5xl font-semibold leading-tight">
              Smart attendance with face recognition and performance analytics.
            </h1>
            <p className="text-lg text-slate-300">
              Monitor student presence, uncover academic trends, and act on insights from a single modern control center.
            </p>
          </div>
        </div>

        <Card className="relative border border-white/10 bg-white/95">
          <CardHeader className="space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-400 text-white shadow-lg">
              <GraduationCap className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Sign in to access the Smart Attendance and Performance system.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  placeholder="admin@campus.edu"
                  value={values.email}
                  onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                />
                {touched && errors.email ? <p className="text-sm text-rose-500">{errors.email}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={values.password}
                  onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
                />
                {touched && errors.password ? <p className="text-sm text-rose-500">{errors.password}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  id="role"
                  value={values.role}
                  onChange={(event) => setValues((current) => ({ ...current, role: event.target.value }))}
                >
                  <option>Admin</option>
                  <option>Student</option>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {submitting ? "Signing in..." : "Login"}
              </Button>
              {serverError ? <p className="text-sm text-rose-500">{serverError}</p> : null}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
