import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/presentation/store/authStore";
import { AppShell } from "@/presentation/components/layout/AppShell";
import { AuthPage } from "@/presentation/pages/AuthPage";
import { Dashboard } from "@/presentation/pages/Dashboard";
import { ScheduleWizard } from "@/presentation/pages/ScheduleWizard";
import { ScheduleDetail } from "@/presentation/pages/ScheduleDetail";
import { SettingsPage } from "@/presentation/pages/SettingsPage";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  if (session) return <Navigate to="/schedules" replace />;
  return <>{children}</>;
}

export function App() {
  const init = useAuthStore((s) => s.init);
  useEffect(() => {
    init();
  }, [init]);
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RedirectIfAuthed><AuthPage mode="login" /></RedirectIfAuthed>} />
        <Route path="/register" element={<RedirectIfAuthed><AuthPage mode="register" /></RedirectIfAuthed>} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/schedules" element={<Dashboard />} />
          <Route path="/schedules/new" element={<ScheduleWizard />} />
          <Route path="/schedules/:id" element={<ScheduleDetail />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/schedules" replace />} />
        <Route path="*" element={<Navigate to="/schedules" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
