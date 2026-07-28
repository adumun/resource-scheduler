import type { TimeSlotId } from "./ids";

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const WEEKDAYS = [1, 2, 3, 4, 5] as const;

export interface TimeSlot {
  id: TimeSlotId;
  /** 0=Sunday .. 6=Saturday. Undefined when slot is tied to a specific date. */
  dayOfWeek?: number;
  /** ISO date "YYYY-MM-DD". Undefined when slot is recurring weekly. */
  date?: string;
  startMinutes: number;
  endMinutes: number;
  label?: string;
}

export interface TimeRange {
  startDate: string;
  endDate: string;
}

export function slotDurationMinutes(slot: TimeSlot): number {
  return slot.endMinutes - slot.startMinutes;
}

export function dayKey(slot: TimeSlot): string {
  if (slot.date !== undefined) return `date:${slot.date}`;
  if (slot.dayOfWeek !== undefined) return `dow:${slot.dayOfWeek}`;
  return "any";
}

export function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (dayKey(a) !== dayKey(b)) return false;
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function labelToMinutes(label: string): number {
  const [h, m] = label.split(":").map((n) => Number.parseInt(n, 10));
  if (h === undefined || m === undefined || Number.isNaN(h) || Number.isNaN(m)) {
    throw new Error(`Invalid time label: ${label}`);
  }
  return h * 60 + m;
}

export function slotLabel(slot: TimeSlot): string {
  const day =
    slot.dayOfWeek !== undefined
      ? DAY_NAMES[slot.dayOfWeek]
      : slot.date !== undefined
        ? slot.date
        : "";
  return `${day} ${minutesToLabel(slot.startMinutes)}-${minutesToLabel(slot.endMinutes)}`.trim();
}

export function timeRangeLabel(range: TimeRange): string {
  return `${range.startDate} → ${range.endDate}`;
}

export function isWithinRange(date: string, range: TimeRange): boolean {
  return date >= range.startDate && date <= range.endDate;
}
