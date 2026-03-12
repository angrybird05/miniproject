// Use relative path in production so it targets the same domain serving the site (Render/Heroku/etc)
// Fallback to localhost during local Vite dev server
const RAW_API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:8080" : "");

function normalizeBaseUrl(value) {
  if (!value) return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

const API_URL = normalizeBaseUrl(RAW_API_URL);

function makeUrl(path) {
  if (!path.startsWith("/")) throw new Error(`API path must start with "/": ${path}`);
  return `${API_URL}${path}`;
}

async function readJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function apiRequest(path, { method = "GET", token, body, headers } = {}) {
  const mergedHeaders = new Headers(headers || {});
  if (token) mergedHeaders.set("Authorization", `Bearer ${token}`);

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isFormData && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(makeUrl(path), {
    method,
    headers: mergedHeaders,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  const json = await readJsonSafe(response);
  if (!response.ok || json?.ok === false) {
    const message = json?.error?.message || response.statusText || "Request failed";
    const error = new Error(message);
    error.status = response.status;
    error.details = json?.error?.details;
    throw error;
  }
  return json?.data;
}

export const api = {
  login: ({ email, password, role }) => apiRequest("/api/auth/login", { method: "POST", body: { email, password, role } }),
  statsSummary: (token) => apiRequest("/api/stats/summary", { token }),
  meSummary: (token) => apiRequest("/api/me/summary", { token }),
  classes: (token, { q } = {}) => apiRequest(`/api/classes${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token }),
  createClass: (token, payload) => apiRequest("/api/classes", { method: "POST", token, body: payload }),
  students: (token, { q } = {}) => apiRequest(`/api/students${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token }),
  createStudent: (token, formData) => apiRequest("/api/students", { method: "POST", token, body: formData }),
  resetStudentPassword: (token, studentId) =>
    apiRequest(`/api/students/${encodeURIComponent(studentId)}/reset-password`, { method: "POST", token }),
  faceRoster: (token) => apiRequest("/api/face/roster", { token }),
  attendanceRecords: (token, { q, date, page, pageSize }) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (date) params.set("date", date);
    if (page) params.set("page", String(page));
    if (pageSize) params.set("pageSize", String(pageSize));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return apiRequest(`/api/attendance/records${suffix}`, { token });
  },
  captureAttendance: (token, payload) => apiRequest("/api/attendance/capture", { method: "POST", token, body: payload }),
  markAttendance: (token, payload) => apiRequest("/api/attendance/mark", { method: "POST", token, body: payload }),
  performance: (token) => apiRequest("/api/performance", { token }),
  analytics: (token) => apiRequest("/api/analytics", { token }),
};
