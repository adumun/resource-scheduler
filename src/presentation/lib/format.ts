import type { ScheduleStatus, SchedulePreset } from "@/domain/schedule";

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { dateStyle: "medium" });
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

const statusLabels: Record<ScheduleStatus, string> = {
  draft: "Draft",
  ready: "Ready",
  scheduling: "Scheduling",
  scheduled: "Scheduled",
  conflict: "Conflict",
  archived: "Archived",
};

const statusTones: Record<ScheduleStatus, "neutral" | "brand" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  ready: "info",
  scheduling: "warning",
  scheduled: "success",
  conflict: "danger",
  archived: "neutral",
};

export function statusLabel(status: ScheduleStatus): string {
  return statusLabels[status];
}

export function statusTone(status: ScheduleStatus) {
  return statusTones[status];
}

const presetLabels: Record<SchedulePreset, string> = {
  academic: "Academic",
  sports: "Sports",
  surgery: "Surgery",
  custom: "Custom",
};

export function presetLabel(preset: SchedulePreset): string {
  return presetLabels[preset];
}

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function dayName(dayOfWeek?: number, date?: string): string {
  if (date !== undefined) return date;
  if (dayOfWeek === undefined) return "";
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dayOfWeek] ?? "";
}
