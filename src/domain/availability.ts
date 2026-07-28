import type { ResourceId } from "./ids";

/**
 * Availability interval for a resource. Day-scoped (dayOfWeek or date).
 * An empty availability list means "always available" (no restriction).
 */
export interface AvailabilityInterval {
  dayOfWeek?: number;
  date?: string;
  startMinutes: number;
  endMinutes: number;
}

export function isAvailable(
  availability: AvailabilityInterval[],
  dayOfWeek: number | undefined,
  date: string | undefined,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (availability.length === 0) return true;
  return availability.some((iv) => {
    const dayMatch =
      (iv.dayOfWeek !== undefined && iv.dayOfWeek === dayOfWeek) ||
      (iv.date !== undefined && iv.date === date);
    return dayMatch && iv.startMinutes <= startMinutes && iv.endMinutes >= endMinutes;
  });
}

export function availabilityLabel(availability: AvailabilityInterval[]): string {
  if (availability.length === 0) return "Always";
  return availability
    .map((iv) => {
      const day =
        iv.dayOfWeek !== undefined
          ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][iv.dayOfWeek]
          : iv.date ?? "";
      const s = `${Math.floor(iv.startMinutes / 60).toString().padStart(2, "0")}:${(iv.startMinutes % 60).toString().padStart(2, "0")}`;
      const e = `${Math.floor(iv.endMinutes / 60).toString().padStart(2, "0")}:${(iv.endMinutes % 60).toString().padStart(2, "0")}`;
      return `${day} ${s}-${e}`;
    })
    .join(", ");
}

export type { ResourceId };
