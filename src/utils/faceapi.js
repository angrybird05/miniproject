let faceApiPromise;
let modelsPromise;

async function _getFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      const faceapi = await import("face-api.js");
      await import("@tensorflow/tfjs-backend-webgl");

      // Prefer WebGL for realtime video. Falls back automatically if unavailable.
      const tf = faceapi.tf;
      if (tf?.setBackend && tf?.ready) {
        try {
          if (tf.getBackend && tf.getBackend() !== "webgl") {
            await tf.setBackend("webgl");
          }
          await tf.ready();
        } catch {
          // ignore, keep default backend
        }
      }
      return faceapi;
    })();
  }
  return faceApiPromise;
}

export async function getFaceApi() {
  return _getFaceApi();
}

export async function loadFaceModels(baseUrl = "/models/faceapi") {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const faceapi = await _getFaceApi();
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(baseUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl),
      ]);
      return true;
    })();
  }
  return modelsPromise;
}

export async function computeDescriptorFromImageFile(file, { baseUrl = "/models/faceapi" } = {}) {
  const faceapi = await _getFaceApi();
  await loadFaceModels(baseUrl);

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const detection = await faceapi
      .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    if (!detection) throw new Error("No face detected in the image.");
    return Array.from(detection.descriptor);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function buildFaceMatcher(faceapi, roster, { threshold = 0.55 } = {}) {
  const labeled = roster.map(
    (s) =>
      new faceapi.LabeledFaceDescriptors(s.studentId, [new Float32Array(s.descriptor)]),
  );
  const matcher = new faceapi.FaceMatcher(labeled, threshold);
  const byId = new Map(roster.map((s) => [s.studentId, s]));
  return { matcher, byId, threshold };
}

export async function detectAndMatchFromVideo(videoEl, { matcher, byId, threshold }) {
  const faceapi = await _getFaceApi();

  const detections = await faceapi
    .detectAllFaces(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  const recognized = [];
  detections.forEach((det) => {
    const best = matcher.findBestMatch(det.descriptor);
    if (!best || best.label === "unknown") return;
    const student = byId.get(best.label);
    if (!student) return;
    if (best.distance > threshold) return;
    const confidence = Math.round(Math.max(0, (1 - best.distance / threshold)) * 100);
    recognized.push({
      studentId: student.studentId,
      name: student.name,
      distance: Number(best.distance.toFixed(4)),
      confidence,
    });
  });

  // Deduplicate by studentId with best (lowest distance) match.
  const merged = new Map();
  recognized.forEach((r) => {
    const existing = merged.get(r.studentId);
    if (!existing || r.distance < existing.distance) merged.set(r.studentId, r);
  });
  return Array.from(merged.values()).sort((a, b) => a.distance - b.distance);
}
