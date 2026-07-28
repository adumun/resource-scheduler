import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function Card({ children, className = "", padded = true }: { children: ReactNode; className?: string; padded?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  brand: "bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-200",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  danger: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  info: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
};

export function Badge({ children, tone = "neutral", className = "" }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badgeTones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 px-6 py-12 text-center dark:border-slate-700">
      {icon ? <div className="mb-3 text-slate-400">{icon}</div> : null}
      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      {label ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{label}</p> : null}
    </div>
  );
}

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover/tt:opacity-100 dark:bg-slate-700">
        {label}
      </span>
    </span>
  );
}

export function StatTile({ label, value, hint, tone = "neutral" }: { label: string; value: ReactNode; hint?: string; tone?: BadgeTone }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
      {hint ? <Badge tone={tone} className="mt-2">{hint}</Badge> : null}
    </div>
  );
}
