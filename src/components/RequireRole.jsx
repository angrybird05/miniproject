import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/utils/auth";

export default function RequireRole({ roles, redirectTo = "/" }) {
  const { user } = useAuth();
  const allowed = roles?.includes(user?.role);
  return allowed ? <Outlet /> : <Navigate to={redirectTo} replace />;
}

