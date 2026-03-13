import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import DashboardLayout from "@/layout/DashboardLayout";
import LoginPage from "@/pages/Login";
import DashboardPage from "@/pages/Dashboard";
import StudentDashboardPage from "@/pages/StudentDashboard";
import RegisterStudentPage from "@/pages/RegisterStudent";
import AttendanceCameraPage from "@/pages/AttendanceCamera";
import AttendanceManualPage from "@/pages/AttendanceManual";
import RecordsPage from "@/pages/Records";
import PerformancePage from "@/pages/Performance";
import AnalyticsPage from "@/pages/Analytics";
import ClassesPage from "@/pages/Classes";
import StudentsPage from "@/pages/Students";
import ProfilePage from "@/pages/Profile";
import NotFoundPage from "@/pages/NotFound";
import { useAuth } from "@/utils/auth";
import RequireRole from "@/components/RequireRole";

function ProtectedLayout() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search || ""}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return <DashboardLayout />;
}

export default function App() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />
      <Route
        element={<ProtectedLayout />}
      >
        <Route path="/" element={user?.role === "Admin" ? <DashboardPage /> : <StudentDashboardPage />} />

        <Route element={<RequireRole roles={["Admin"]} />}>
          <Route path="/classes" element={<ClassesPage />} />
          <Route path="/students" element={<StudentsPage />} />
          <Route path="/register-student" element={<RegisterStudentPage />} />
          <Route path="/attendance" element={<Navigate to="/attendance/camera" replace />} />
          <Route path="/attendance/camera" element={<AttendanceCameraPage />} />
          <Route path="/attendance/manual" element={<AttendanceManualPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
        </Route>

        <Route path="/records" element={<RecordsPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
