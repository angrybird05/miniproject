import { createContext, useContext, useMemo, useState } from "react";
import { api } from "@/utils/api";

const AuthContext = createContext(null);

const STORAGE_KEY = "smart-attendance-auth-v1";

function readStoredAuth() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { token: null, user: null };
    const parsed = JSON.parse(raw);
    const tokenOk = typeof parsed?.token === "string" && parsed.token.length > 20;
    const userOk = typeof parsed?.user?.role === "string" && typeof parsed?.user?.email === "string";
    if (!tokenOk || !userOk) return { token: null, user: null };
    return { token: parsed.token, user: parsed.user };
  } catch {
    return { token: null, user: null };
  }
}

function writeStoredAuth(next) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures (private mode, blocked storage, etc.)
  }
}

function clearStoredAuth() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const token = auth.token;
  const user = auth.user;

  const value = useMemo(() => {
    return {
      token,
      user,
      isAuthenticated: Boolean(token),
      async login({ email, password, role }) {
        const result = await api.login({ email, password, role });
        const next = { token: result.token, user: result.user };
        setAuth(next);
        writeStoredAuth(next);
        return result;
      },
      logout() {
        setAuth({ token: null, user: null });
        clearStoredAuth();
      },
      updateUser(nextUser) {
        const next = { ...auth, user: { ...auth.user, ...nextUser } };
        setAuth(next);
        writeStoredAuth(next);
      },
    };
  }, [auth, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider />");
  return ctx;
}
