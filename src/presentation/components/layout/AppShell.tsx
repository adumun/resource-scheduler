import { LABS_PUBLIC_DEMO, LABS_DEMO_USER_ID } from "@/application/labsMode";
import { NavLink, Outlet, useLocation, useNavigate, Link } from "react-router-dom";
import { useUiStore } from "@/presentation/store/uiStore";
import { useAuthStore } from "@/presentation/store/authStore";
import { CalendarRange, LayoutDashboard, Plus, Moon, Sun, LogOut, ChevronRight, Menu, Settings, ClipboardList, X } from "lucide-react";
import { ToastContainer } from "@/presentation/components/ui";
import { useMemo, useState } from "react";

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
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 overflow-hidden text-sm text-slate-500 dark:text-slate-400">
      {crumbs.map((c, i) => (
        <span key={c.to} className="flex min-w-0 shrink items-center gap-1">
          {i > 0 ? <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : null}
          <Link
            to={c.to}
            title={c.label}
            className={`truncate ${i === crumbs.length - 1 ? "font-medium text-slate-700 dark:text-slate-200" : "hover:text-slate-700 dark:hover:text-slate-200"}`}
            aria-current={i === crumbs.length - 1 ? "page" : undefined}
          >
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const closeMobileNav = () => setMobileNavOpen(false);
  const navigation = (
    <>
      <nav className="flex-1 space-y-1 p-2" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={closeMobileNav}
            className={({ isActive }) =>
              `flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`
            }
            title={item.label}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <NavLink
          to="/settings"
          onClick={closeMobileNav}
          className={({ isActive }) =>
            `flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`
          }
          title="Settings"
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </NavLink>
      </nav>
    </>
  );

  const accountActions = (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <button
        onClick={toggleTheme}
        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
      {session ? (
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 dark:bg-brand-900/50 dark:text-brand-200">
            {session.name.charAt(0).toUpperCase()}
          </div>
          <div className="hidden min-w-0 text-sm sm:block">
            <p className="truncate font-medium leading-tight text-slate-700 dark:text-slate-200">{session.name}</p>
            <p className="truncate text-xs leading-tight text-slate-400">{session.userId === LABS_DEMO_USER_ID ? "Sesión local sin credenciales" : session.email}</p>
          </div>
          {!LABS_PUBLIC_DEMO ? (
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 min-w-0 overflow-hidden">
      <aside
        className={`hidden shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-900 md:flex ${sidebarCollapsed ? "w-16" : "w-60"}`}
      >
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 px-4 dark:border-slate-800">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
            <CalendarRange className="h-4 w-4" />
          </div>
          {!sidebarCollapsed ? <span className="font-semibold text-slate-800 dark:text-slate-100">Scheduler</span> : null}
        </div>
        <nav className="flex-1 space-y-1 p-2" aria-label="Main navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`
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
              `flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? "bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"}`
            }
            title="Settings"
          >
            <Settings className="h-4 w-4 shrink-0" />
            {!sidebarCollapsed ? <span>Settings</span> : null}
          </NavLink>
        </nav>
        <button
          onClick={toggleSidebar}
          className="flex min-h-11 shrink-0 items-center gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-4 w-4" />
          {!sidebarCollapsed ? <span>Collapse</span> : null}
        </button>
      </aside>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            className="absolute inset-0 bg-slate-950/60"
            onClick={closeMobileNav}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(18rem,85vw)] flex-col border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900" aria-label="Mobile navigation">
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><CalendarRange className="h-4 w-4" /></div>
                <span className="font-semibold text-slate-800 dark:text-slate-100">Scheduler</span>
              </div>
              <button onClick={closeMobileNav} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navigation}
          </aside>
        </div>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="shrink-0 rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 md:hidden"
              aria-label="Open navigation"
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="shrink-0 font-semibold text-slate-800 dark:text-slate-100 md:hidden">Scheduler</span>
            <div className="hidden min-w-0 md:block"><Breadcrumbs /></div>
          </div>
          {accountActions}
        </header>
        {session?.userId === LABS_DEMO_USER_ID ? (
          <div className="flex shrink-0 flex-col gap-2 border-b border-teal-600/20 bg-teal-50 px-4 py-3 text-sm text-teal-950 dark:bg-teal-950/40 dark:text-teal-100 sm:flex-row sm:items-center sm:justify-between sm:px-5" role="status">
            <p className="min-w-0"><strong>Experimento de ADÜMÜN Labs.</strong> Los datos son locales y pueden perderse al limpiar el navegador. Usa únicamente información ficticia.</p>
            <a href="https://labs.adumun.cl/" className="shrink-0 self-start font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2 sm:self-center">Volver a Labs ↗</a>
          </div>
        ) : null}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5">
          <div className="mb-4 min-w-0 md:hidden"><Breadcrumbs /></div>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}

export { ClipboardList };
