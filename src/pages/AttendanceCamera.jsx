import { Camera, CheckCircle2, PlayCircle, RefreshCcw, StopCircle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { api } from "@/utils/api";
import { useAuth } from "@/utils/auth";
import { buildFaceMatcher, detectAndMatchFromVideo, getFaceApi, loadFaceModels } from "@/utils/faceapi";

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
  const m = String(timeValue || "").trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!m) return String(timeValue || "");
  const h = Number(m[1]);
  const minutes = m[2];
  if (!Number.isFinite(h)) return String(timeValue || "");
  const period = h >= 12 ? "PM" : "AM";
  const hh = String(((h + 11) % 12) + 1).padStart(2, "0");
  return `${hh}:${minutes} ${period}`;
}

export default function AttendanceCameraPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const scanRunningRef = useRef(false);
  const matcherRef = useRef(null);

  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [classCode, setClassCode] = useState("");
  const [scope, setScope] = useState("dept"); // dept | all

  const [date, setDate] = useState(defaultDateValue);
  const [time, setTime] = useState(defaultTimeValue);
  const [status, setStatus] = useState("Present"); // Present | Late

  const [roster, setRoster] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState("");

  const [modelsStatus, setModelsStatus] = useState("idle"); // idle | loading | ready | error
  const [modelsError, setModelsError] = useState("");

  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const [recognized, setRecognized] = useState([]);
  const [matcherReady, setMatcherReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedClass = useMemo(() => classes.find((c) => c.code === classCode) || null, [classes, classCode]);

  const eligibleRoster = useMemo(() => {
    if (scope === "all") return roster;
    if (!selectedClass?.department) return roster;
    const dept = String(selectedClass.department || "").trim().toLowerCase();
    return roster.filter((s) => String(s.department || "").trim().toLowerCase() === dept);
  }, [roster, selectedClass, scope]);

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

  const fetchRoster = () => {
    if (!token) return;
    setRosterLoading(true);
    setRosterError("");
    api
      .faceRoster(token)
      .then((data) => setRoster(Array.isArray(data) ? data : []))
      .catch((e) => {
        setRosterError(e?.message || "Failed to load face roster");
        setRoster([]);
      })
      .finally(() => setRosterLoading(false));
  };

  useEffect(() => {
    if (!token) return;
    fetchClasses();
    fetchRoster();
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

  const ensureModels = async () => {
    if (modelsStatus === "ready") return true;
    setModelsStatus("loading");
    setModelsError("");
    try {
      await loadFaceModels();
      setModelsStatus("ready");
      return true;
    } catch (e) {
      const message = e?.message || "Failed to load face models. Ensure weights exist in public/models/faceapi.";
      setModelsStatus("error");
      setModelsError(message);
      toast({ title: "Model load failed", description: message });
      return false;
    }
  };

  useEffect(() => {
    if (modelsStatus !== "ready") return;
    if (!eligibleRoster.length) {
      matcherRef.current = null;
      setMatcherReady(false);
      return;
    }

    let mounted = true;
    setMatcherReady(false);
    (async () => {
      try {
        const faceapi = await getFaceApi();
        const matcher = buildFaceMatcher(faceapi, eligibleRoster, { threshold: 0.55 });
        if (!mounted) return;
        matcherRef.current = matcher;
        setMatcherReady(true);
      } catch (e) {
        if (!mounted) return;
        matcherRef.current = null;
        setMatcherReady(false);
        toast({ title: "Matcher error", description: e?.message || "Failed to prepare face matcher" });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [modelsStatus, eligibleRoster, toast]);

  useEffect(() => {
    if (!cameraStarted) return;
    if (!matcherReady) return;
    if (!videoRef.current) return;

    let cancelled = false;
    const interval = window.setInterval(() => {
      if (scanRunningRef.current) return;
      if (!matcherRef.current) return;
      if (!videoRef.current) return;
      scanRunningRef.current = true;
      detectAndMatchFromVideo(videoRef.current, matcherRef.current)
        .then((list) => {
          if (cancelled) return;
          setRecognized(list);
        })
        .catch(() => {})
        .finally(() => {
          scanRunningRef.current = false;
        });
    }, 900);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [cameraStarted, matcherReady]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.onloadedmetadata = null;
      videoRef.current.srcObject = null;
    }
    setCameraStarted(false);
    setRecognized([]);
  };

  useEffect(() => {
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    const ok = await ensureModels();
    if (!ok) return;

    if (streamRef.current) {
      if (videoRef.current && videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
      }
      setCameraStarted(true);
      return;
    }

    try {
      setCameraError("");
      const hasUserMedia = !!navigator.mediaDevices?.getUserMedia;
      if (!hasUserMedia) {
        const message = "Camera API is unavailable. Use a modern browser and open via localhost/127.0.0.1.";
        setCameraError(message);
        toast({ title: "Camera unavailable", description: message });
        return;
      }

      if (!window.isSecureContext) {
        const message = "Camera requires a secure context. Use http://localhost:5173 or enable HTTPS.";
        setCameraError(message);
        toast({ title: "Insecure context", description: message });
        return;
      }

      if (navigator.permissions?.query) {
        try {
          // @ts-ignore
          const perm = await navigator.permissions.query({ name: "camera" });
          if (perm?.state === "denied") {
            const message = "Camera permission is blocked. Enable it in your browser site settings, then retry.";
            setCameraError(message);
            toast({ title: "Permission blocked", description: message });
            return;
          }
        } catch {
          // ignore
        }
      }

      const candidates = [
        {
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        { video: true, audio: false },
      ];

      let stream = null;
      let lastErr = null;
      for (const c of candidates) {
        try {
          // eslint-disable-next-line no-await-in-loop
          stream = await navigator.mediaDevices.getUserMedia(c);
          break;
        } catch (e) {
          lastErr = e;
        }
      }
      if (!stream) throw lastErr || new Error("Unable to access camera.");

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraStarted(true);
    } catch (e) {
      const message =
        e?.name === "NotAllowedError"
          ? "Camera access denied. Please allow camera permission and retry."
          : e?.message || "Failed to start camera.";
      setCameraError(message);
      toast({ title: "Camera error", description: message });
    }
  };

  const captureAttendance = () => {
    if (!token) {
      toast({ title: "Not logged in", description: "Please login again to capture attendance." });
      return;
    }
    if (!classCode) {
      toast({ title: "Select a class", description: "Please choose a class before capturing attendance." });
      return;
    }
    if (recognized.length === 0) {
      toast({ title: "No matches", description: "No recognized students to capture." });
      return;
    }

    setSubmitting(true);
    const nameById = new Map(recognized.map((s) => [s.studentId, s.name]));
    const studentIds = recognized.map((s) => s.studentId).filter(Boolean);

    api
      .captureAttendance(token, {
        studentIds,
        status,
        classCode,
        date: date || undefined,
        time: time ? toAmPm(time) : undefined,
      })
      .then((result) => {
        const insertedCount = result?.recognizedCount ?? 0;
        const skippedCount = result?.skippedCount ?? 0;
        const cooldownHours = result?.cooldownHours ?? 4;

        if (insertedCount > 0 && skippedCount === 0) {
          toast({ title: "Attendance captured", description: `${insertedCount} students were marked successfully.` });
        } else if (insertedCount > 0 && skippedCount > 0) {
          toast({
            title: "Attendance captured",
            description: `Marked ${insertedCount}. Skipped ${skippedCount} already marked in the last ${cooldownHours} hours.`,
          });
        } else if (insertedCount === 0 && skippedCount > 0) {
          const first = result?.skipped?.[0]?.studentId;
          const name = first ? nameById.get(first) : null;
          toast({
            title: "Already marked",
            description: name
              ? `${name}'s attendance is already marked in the last ${cooldownHours} hours.`
              : `Attendance is already marked in the last ${cooldownHours} hours.`,
          });
        } else {
          toast({ title: "No students marked", description: "No recognized students were eligible to be marked." });
        }
        setRecognized([]);
      })
      .catch((e) => toast({ title: "Capture failed", description: e?.message || "Failed to capture attendance" }))
      .finally(() => setSubmitting(false));
  };

  const statusTone = status === "Present" ? "emerald" : "amber";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Camera Attendance"
        description="Use face recognition to capture attendance for a selected class."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone}>Status: {status}</Badge>
            <Badge tone="slate">Roster: {eligibleRoster.length}</Badge>
          </div>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="border-0">
          <CardHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Camera Preview</CardTitle>
                <CardDescription>Start camera, then capture recognized students.</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  fetchClasses();
                  fetchRoster();
                }}
                disabled={classesLoading || rosterLoading}
              >
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {classesError ? <p className="text-sm text-rose-600">{classesError}</p> : null}
            {rosterError ? <p className="text-sm text-rose-600">{rosterError}</p> : null}

            <div className="grid gap-4 md:grid-cols-2">
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
                      {c.code} - {c.title}
                    </option>
                  ))}
                </Select>
                {!classesLoading && classes.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    Create a class first in{" "}
                    <Link className="font-medium text-slate-900 underline" to="/classes">
                      Classes
                    </Link>
                    .
                  </p>
                ) : selectedClass ? (
                  <p className="text-xs text-slate-500">Department: {selectedClass.department}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance-scope">Scope</Label>
                <Select id="attendance-scope" value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="dept">Class department only</option>
                  <option value="all">All students</option>
                </Select>
                <p className="text-xs text-slate-500">Filters the face roster used for matching.</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="session-date">Date</Label>
                <Input id="session-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-time">Time</Label>
                <Input id="session-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                <p className="text-xs text-slate-500">Saved as {toAmPm(time) || "auto"}.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="session-status">Mark As</Label>
                <Select id="session-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="Present">Present</option>
                  <option value="Late">Late</option>
                </Select>
              </div>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />
              {!cameraStarted ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-white">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                      <Camera className="h-10 w-10" />
                    </div>
                    <p className="text-lg font-medium">Camera preview will appear here</p>
                    <p className="mt-2 text-sm text-slate-300">Start the camera to begin recognition.</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={startCamera} disabled={modelsStatus === "loading" || classes.length === 0}>
                <PlayCircle className="h-4 w-4" />
                {modelsStatus === "loading" ? "Loading models..." : cameraStarted ? "Camera On" : "Start Camera"}
              </Button>
              <Button variant="outline" onClick={stopCamera} disabled={!cameraStarted || submitting}>
                <StopCircle className="h-4 w-4" />
                Stop Camera
              </Button>
              <Button
                variant="secondary"
                onClick={captureAttendance}
                disabled={submitting || !cameraStarted || recognized.length === 0 || !matcherReady || classes.length === 0}
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? "Capturing..." : "Capture Attendance"}
              </Button>
            </div>

            {modelsStatus === "error" ? <p className="text-sm text-rose-500">{modelsError}</p> : null}
            {cameraError ? <p className="text-sm text-rose-500">{cameraError}</p> : null}
            {!rosterLoading && roster.length === 0 ? (
              <p className="text-sm text-slate-500">
                No face embeddings registered yet. Register students with a clear face image first.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>Recognized Students</CardTitle>
            <CardDescription>Students identified during the current scan session.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!cameraStarted ? (
              <p className="text-sm text-slate-500">Start the camera to begin recognition.</p>
            ) : roster.length === 0 ? (
              <p className="text-sm text-slate-500">No face roster available yet.</p>
            ) : modelsStatus !== "ready" ? (
              <p className="text-sm text-slate-500">Waiting for face models...</p>
            ) : !matcherReady ? (
              <p className="text-sm text-slate-500">Preparing matcher...</p>
            ) : recognized.length === 0 ? (
              <p className="text-sm text-slate-500">Scanning... No matches yet.</p>
            ) : (
              recognized.map((student) => (
                <div key={student.studentId} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                  <div>
                    <p className="font-medium text-slate-900">{student.name}</p>
                    <p className="text-sm text-slate-500">
                      {student.studentId} | Distance {student.distance}
                    </p>
                  </div>
                  <Badge tone="emerald">{student.confidence}%</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
