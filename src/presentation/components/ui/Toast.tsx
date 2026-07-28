import { useUiStore } from "@/presentation/store/uiStore";
import { CheckCircle2, AlertCircle, Info, XCircle, X } from "lucide-react";

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const tones = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200",
  error: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200",
  warning: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-900/30 dark:text-sky-200",
};

export function ToastContainer() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      {toasts.map((t) => {
        const Icon = icons[t.type];
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg animate-slide-in-right ${tones[t.type]}`}
            role="status"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
