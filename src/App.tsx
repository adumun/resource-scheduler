import { useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LABS_PUBLIC_DEMO, LABS_DEMO_USER_ID } from "@/application/labsMode";
import { useAuthStore } from "@/presentation/store/authStore";
import { AppShell } from "@/presentation/components/layout/AppShell";
import { AuthPage } from "@/presentation/pages/AuthPage";
import { Dashboard } from "@/presentation/pages/Dashboard";
import { ScheduleWizard } from "@/presentation/pages/ScheduleWizard";
import { ScheduleDetail } from "@/presentation/pages/ScheduleDetail";
import { SettingsPage } from "@/presentation/pages/SettingsPage";

function DemoEntry() {
  const enterDemo = useAuthStore((s) => s.enterDemo);
  const navigate = useNavigate();
  useEffect(() => {
    enterDemo();
    navigate("/schedules", { replace: true });
  }, [enterDemo, navigate]);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-center text-white" aria-live="polite">
      <p>Preparando Resource Scheduler en modo experimental…</p>
    </main>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  if (!session || (LABS_PUBLIC_DEMO && session.userId !== LABS_DEMO_USER_ID)) {
    return <Navigate to={LABS_PUBLIC_DEMO ? "/demo" : "/login"} state={{ from: location }} replace />;
  }
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
        <Route path="/demo" element={<DemoEntry />} />
        <Route path="/login" element={LABS_PUBLIC_DEMO ? <Navigate to="/demo" replace /> : <RedirectIfAuthed><AuthPage mode="login" /></RedirectIfAuthed>} />
        <Route path="/register" element={LABS_PUBLIC_DEMO ? <Navigate to="/demo" replace /> : <RedirectIfAuthed><AuthPage mode="register" /></RedirectIfAuthed>} />
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/schedules" element={<Dashboard />} />
          <Route path="/schedules/new" element={<ScheduleWizard />} />
          <Route path="/schedules/:id" element={<ScheduleDetail />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="/" element={<Navigate to={LABS_PUBLIC_DEMO ? "/demo" : "/schedules"} replace />} />
        <Route path="*" element={<Navigate to={LABS_PUBLIC_DEMO ? "/demo" : "/schedules"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
