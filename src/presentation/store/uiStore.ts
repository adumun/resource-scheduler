import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";
export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

type Theme = "light" | "dark";

interface UiState {
  theme: Theme;
  sidebarCollapsed: boolean;
  toasts: Toast[];
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleSidebar: () => void;
  toast: (message: string, type?: ToastType) => void;
  dismissToast: (id: string) => void;
}

const THEME_KEY = "rs.theme";

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export const useUiStore = create<UiState>((set, get) => ({
  theme: "light",
  sidebarCollapsed: false,
  toasts: [],
  toggleTheme: () => {
    const next: Theme = get().theme === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(THEME_KEY, next);
    set({ theme: next });
  },
  setTheme: (t) => {
    applyTheme(t);
    localStorage.setItem(THEME_KEY, t);
    set({ theme: t });
  },
  toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
  toast: (message, type = "info") => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set({ toasts: [...get().toasts, { id, message, type }] });
    setTimeout(() => get().dismissToast(id), 4000);
  },
  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export function initTheme(): void {
  const theme = loadTheme();
  applyTheme(theme);
  useUiStore.setState({ theme });
}
