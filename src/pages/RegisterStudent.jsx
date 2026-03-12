import { useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";
import { computeDescriptorFromImageFile } from "@/utils/faceapi";

export default function RegisterStudentPage() {
  const { toast } = useToast();
  const { token } = useAuth();
  const latestFileRef = useRef(null);
  const [createdLogin, setCreatedLogin] = useState(null); // { email, tempPassword, emailSent, emailError }
  const [values, setValues] = useState({
    name: "",
    studentId: "",
    department: "",
    email: "",
    faceImageFile: null,
  });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [faceDescriptor, setFaceDescriptor] = useState(null);
  const [faceStatus, setFaceStatus] = useState("idle"); // idle | computing | ready | error
  const [faceError, setFaceError] = useState("");

  const errors = useMemo(() => {
    const next = {};
    if (!values.name.trim()) next.name = "Student name is required.";
    if (!values.studentId.trim()) next.studentId = "Student ID is required.";
    if (!values.department.trim()) next.department = "Department is required.";
    if (!values.email.includes("@")) next.email = "Valid email is required.";
    if (!values.faceImageFile) next.faceImage = "Face image upload is required.";
    if (!faceDescriptor) next.faceDescriptor = "Face embedding is required (a clear single-face image).";
    return next;
  }, [values, faceDescriptor]);

  const onSubmit = (event) => {
    event.preventDefault();
    setSubmitted(true);
    setServerError("");
    setCreatedLogin(null);
    if (Object.keys(errors).length > 0) return;
    if (!token) {
      setServerError("Missing auth token. Please login again.");
      return;
    }

    const formData = new FormData();
    formData.append("name", values.name);
    formData.append("studentId", values.studentId);
    formData.append("department", values.department);
    formData.append("email", values.email);
    formData.append("faceImage", values.faceImageFile);
    formData.append("faceDescriptor", JSON.stringify(faceDescriptor));

    setSubmitting(true);
    api
      .createStudent(token, formData)
      .then((result) => {
        toast({
          title: "Student registered",
          description: `${values.name} has been added to the facial recognition database.`,
        });
        if (result?.studentUser?.created) {
          if (result.studentUser.tempPassword) {
            setCreatedLogin({
              email: result.studentUser.email,
              tempPassword: result.studentUser.tempPassword,
              emailSent: Boolean(result.studentUser.emailSent),
              emailError: result.studentUser.emailError || "",
            });
          }
          if (result.studentUser.emailSent) {
            toast({
              title: "Student login created",
              description: `Login details sent to ${result.studentUser.email}`,
            });
          } else if (result.studentUser.tempPassword) {
            toast({
              title: "Student login created (email not sent)",
              description: `${result.studentUser.email} - ${result.studentUser.emailError ? `Email error: ${result.studentUser.emailError} - ` : ""}temp password: ${result.studentUser.tempPassword}`,
            });
          } else {
            toast({
              title: "Student login created",
              description: `Student user created for ${result.studentUser.email}`,
            });
          }
        }
        setValues({ name: "", studentId: "", department: "", email: "", faceImageFile: null });
        setFaceDescriptor(null);
        setFaceStatus("idle");
        setFaceError("");
        setSubmitted(false);
      })
      .catch((e) => {
        const message = e?.message || "Failed to register student";
        setServerError(message);
        toast({ title: "Registration failed", description: message });
      })
      .finally(() => setSubmitting(false));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Register Student"
        description="Enroll a student profile and upload the face image used by the recognition model."
      />

      {createdLogin ? (
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Student Login Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Share this temporary password with the student. They should change it after first login.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Email</p>
                <p className="mt-1 font-mono text-sm text-slate-900">{createdLogin.email}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Temporary Password</p>
                <p className="mt-1 font-mono text-sm text-slate-900">{createdLogin.tempPassword}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const text = `Student Login\nEmail: ${createdLogin.email}\nTemp Password: ${createdLogin.tempPassword}`;
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
              {createdLogin.emailSent ? (
                <p className="self-center text-sm text-emerald-700">Email sent successfully.</p>
              ) : createdLogin.emailError ? (
                <p className="self-center text-sm text-rose-600">{createdLogin.emailError}</p>
              ) : (
                <p className="self-center text-sm text-amber-700">Email was not sent.</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="mx-auto max-w-4xl border-0">
        <CardHeader>
          <CardTitle>Student Registration Form</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6 md:grid-cols-2" onSubmit={onSubmit}>
            {serverError ? <p className="md:col-span-2 text-sm text-rose-600">{serverError}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="name">Student Name</Label>
              <Input
                id="name"
                value={values.name}
                onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
              />
              {submitted && errors.name ? <p className="text-sm text-rose-500">{errors.name}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                value={values.studentId}
                onChange={(event) => setValues((current) => ({ ...current, studentId: event.target.value }))}
              />
              {submitted && errors.studentId ? <p className="text-sm text-rose-500">{errors.studentId}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Select
                id="department"
                value={values.department}
                onChange={(event) => setValues((current) => ({ ...current, department: event.target.value }))}
              >
                <option value="">Select department</option>
                <option>Computer Science</option>
                <option>Electronics</option>
                <option>Mechanical</option>
                <option>Business Administration</option>
              </Select>
              {submitted && errors.department ? <p className="text-sm text-rose-500">{errors.department}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={values.email}
                onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
              />
              {submitted && errors.email ? <p className="text-sm text-rose-500">{errors.email}</p> : null}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="faceImage">Upload Face Image</Label>
              <Input
                id="faceImage"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setValues((current) => ({ ...current, faceImageFile: file }));
                  latestFileRef.current = file;
                  setFaceDescriptor(null);
                  setFaceError("");
                  if (!file) {
                    setFaceStatus("idle");
                    return;
                  }

                  setFaceStatus("computing");
                  computeDescriptorFromImageFile(file)
                    .then((descriptor) => {
                      if (latestFileRef.current !== file) return;
                      setFaceDescriptor(descriptor);
                      setFaceStatus("ready");
                    })
                    .catch((e) => {
                      if (latestFileRef.current !== file) return;
                      setFaceDescriptor(null);
                      setFaceStatus("error");
                      setFaceError(
                        e?.message ||
                          "Failed to compute face embedding. Ensure models exist and the image contains one clear face.",
                      );
                    });
                }}
              />
              {submitted && errors.faceImage ? <p className="text-sm text-rose-500">{errors.faceImage}</p> : null}
              {faceStatus === "computing" ? (
                <p className="text-sm text-slate-500">Analyzing face image...</p>
              ) : null}
              {faceStatus === "ready" ? (
                <p className="text-sm text-emerald-600">Face embedding captured.</p>
              ) : null}
              {faceStatus === "error" ? <p className="text-sm text-rose-500">{faceError}</p> : null}
              {submitted && errors.faceDescriptor ? (
                <p className="text-sm text-rose-500">{errors.faceDescriptor}</p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting || faceStatus === "computing"}>
                {submitting ? "Submitting..." : "Submit Student Record"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
