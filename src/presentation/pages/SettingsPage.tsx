import { useAuthStore } from "@/presentation/store/authStore";
import { useUiStore } from "@/presentation/store/uiStore";
import { Card, CardHeader, Badge, Button, Select } from "@/presentation/components/ui";
import { formatDate } from "@/presentation/lib/format";
import { Moon, Sun, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SettingsPage() {
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Settings</h1>
      <Card>
        <CardHeader title="Account" subtitle="Local account stored in your browser." />
        {session ? (
          <div className="space-y-2 text-sm">
            <Row label="Name" value={session.name} />
            <Row label="Email" value={session.email} />
            <Row label="User id" value={<span className="font-mono text-xs">{session.userId}</span>} />
            <div className="pt-2">
              <Button variant="danger" icon={<LogOut className="h-4 w-4" />} onClick={() => { logout(); navigate("/login"); }}>Log out</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-slate-500"><User className="h-4 w-4" /> Not signed in.</div>
        )}
      </Card>
      <Card>
        <CardHeader title="Appearance" subtitle="Choose a theme preference." />
        <div className="flex items-center gap-3">
          <Badge tone="neutral">{theme === "dark" ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}{theme}</Badge>
          <Select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")} className="max-w-[160px]">
            <option value="light">light</option>
            <option value="dark">dark</option>
          </Select>
        </div>
      </Card>
      <Card>
        <CardHeader title="About" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Resource Scheduler runs fully offline. All data is stored locally in IndexedDB. Authentication is simulated and not suitable for production.</p>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-slate-100 py-1.5 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

export { formatDate };
