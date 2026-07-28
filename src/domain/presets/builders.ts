import type { TimeSlot } from "@/domain/time";
import type { AvailabilityInterval } from "@/domain/availability";
import type { Resource } from "@/domain/resource";
import type { Activity, ActivityRequirement } from "@/domain/activity";
import type { Constraint } from "@/domain/constraint";
import type { ResourceId, TimeSlotId, ActivityId, ConstraintId } from "@/domain/ids";
import { rid } from "@/domain/ids";

export function slot(dayOfWeek: number, start: number, end: number, label: string, idx: number): TimeSlot {
  return {
    id: rid<TimeSlotId>(`slot-${dayOfWeek}-${idx}`),
    dayOfWeek,
    startMinutes: start,
    endMinutes: end,
    label,
  };
}

export function availability(dayOfWeek: number, start: number, end: number): AvailabilityInterval {
  return { dayOfWeek, startMinutes: start, endMinutes: end };
}

export function person(
  idStr: string,
  name: string,
  roles: string[],
  availabilityList: AvailabilityInterval[],
  attributes: Record<string, unknown> = {},
): Resource {
  return {
    id: rid<ResourceId>(idStr),
    name,
    kind: "person",
    roles,
    attributes,
    availability: availabilityList,
    active: true,
  };
}

export function location(
  idStr: string,
  name: string,
  roles: string[],
  capacity: number,
  equipment: string[] = [],
  availabilityList: AvailabilityInterval[] = [],
): Resource {
  return {
    id: rid<ResourceId>(idStr),
    name,
    kind: "location",
    roles,
    attributes: { capacity, equipment },
    availability: availabilityList,
    active: true,
  };
}

export function activity(
  idStr: string,
  name: string,
  kind: string,
  groupId: string,
  count: number,
  durationMinutes: number,
  requirements: ActivityRequirement[],
  attributes: Record<string, unknown> = {},
  priority = 1,
): Activity {
  return {
    id: rid<ActivityId>(idStr),
    name,
    kind,
    groupId,
    count,
    durationMinutes,
    requirements,
    attributes,
    active: true,
    priority,
  };
}

export function requirement(role: string, candidateResourceIds: ResourceId[]): ActivityRequirement {
  return { role, candidateResourceIds };
}

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type ConstraintInput = DistributiveOmit<Constraint, "id">;

export function constraint(input: ConstraintInput): Constraint {
  return {
    ...input,
    id: rid<ConstraintId>(`cstr-${Math.random().toString(36).slice(2, 10)}`),
  } as Constraint;
}

export function res(idStr: string): ResourceId {
  return rid<ResourceId>(idStr);
}
