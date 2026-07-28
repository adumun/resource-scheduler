import { labelToMinutes } from "@/domain/time";

export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function labelToMinutesSafe(label: string, fallback: number): number {
  try {
    return labelToMinutes(label);
  } catch {
    return fallback;
  }
}

export function hhmmToMinutes(label: string): number {
  return labelToMinutesSafe(label, 0);
}
