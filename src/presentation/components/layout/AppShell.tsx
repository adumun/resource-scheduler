import { LABS_PUBLIC_DEMO, LABS_DEMO_USER_ID } from "@/application/labsMode";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useUiStore } from "@/presentation/store/uiStore";
import { useAuthStore } from "@/presentation/store/authStore";
import { CalendarRange, LayoutDashboard, Plus, Moon, Sun, LogOut, ChevronRight, Menu, Settings, ClipboardList } from "lucide-react";
import { ToastContainer } from "@/presentation/components/ui";
import { useMemo } from "react";

const navItems = [
  { to: "/schedules", label: "Schedules", icon: LayoutDashboard },
  { to: "/schedules/new", label: "New schedule", icon: Plus },
];

function Breadcrumbs() {
  const location = useLocation();
  const crumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);
    const list: { label: string; to: string }[] = [{ label: "Home", to: "/" }];
    let acc = "";
    for (const part of parts) {
      acc += `/${part}`;
      const label = part.length > 24 ? `${part.slice(0, 6)}…${part.slice(-4)}` : part;
      list.push({ label: decodeURIComponent(label), to: acc });
    }
    return list;
  }, [location.pathname]);
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex items-center gap-1">
          {i > 0 ? <ChevronRight className="h-3.5 w-3.5" /> : null}
          <Link to={c.to} className={i === crumbs.length - 1 ? "font-medium text-slate-700 dark:text-slate-200" : "hover:text-slate-700 dark:hover:text-slate-200"}>
            {c.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}

export function AppShell() {
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const session = useAuthStore((s) => s.session);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <div className="flex h-full">
      <aside
        className={`flex flex-col border-r border-slate-200 bg-white transition-all dark:border-slate-800 dark:bg-slate-900 ${sidebarCollapsed ? "w-16" : "w-60"}`}
      >
        <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <CalendarRange className="h-4 w-4" />
          </div>
          {!sidebarCollapsed ? <span className="font-semibold text-slate-800 dark:text-slate-100">Scheduler</span> : null}
        </div>
        <nav className="flex-1 space-y-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`
              }
              title={item.label}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!sidebarCollapsed ? <span>{item.label}</span> : null}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`
            }
            title="Settings"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed ? <span>Settings</span> : null}
          </NavLink>
        </nav>
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
        >
          <Menu className="h-4 w-4" />
          {!sidebarCollapsed ? <span>Collapse</span> : null}
        </button>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
          <Breadcrumbs />
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            {session ? (
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
                  {session.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden text-sm sm:block">
                  <p className="font-medium leading-tight text-slate-700 dark:text-slate-200">{session.name}</p>
                  <p className="leading-tight text-xs text-slate-400">{session.userId === LABS_DEMO_USER_ID ? "Sesión local sin credenciales" : session.email}</p>
                </div>
                {!LABS_PUBLIC_DEMO ? <button
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  aria-label="Log out"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                </button> : null}
              </div>
            ) : null}
          </div>
        </header>
        {session?.userId === LABS_DEMO_USER_ID ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-600/20 bg-teal-50 px-5 py-3 text-sm text-teal-950 dark:bg-teal-950/40 dark:text-teal-100" role="status">
            <p><strong>Experimento de ADÜMÜN Labs.</strong> Los datos son locales y pueden perderse al limpiar el navegador. Usa únicamente información ficticia.</p>
            <a href="https://labs.adumun.cl/" className="shrink-0 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2">Volver a Labs ↗</a>
          </div>
        ) : null}
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

export { ClipboardList };
