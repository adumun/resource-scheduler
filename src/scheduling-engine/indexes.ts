import type { SchedulingProblem } from "@/domain/problem";
import type { TimeSlot } from "@/domain/time";
import type { Resource, Activity } from "@/domain";
import type { TimeSlotId, ResourceId } from "@/domain/ids";
import type { AvailabilityInterval } from "@/domain/availability";

export interface Indexes {
  slotsById: Map<TimeSlotId, TimeSlot>;
  resourcesById: Map<ResourceId, Resource>;
  activitiesById: Map<string, Activity>;
  /** Resources that can fulfill a given role, globally. */
  resourcesByRole: Map<string, ResourceId[]>;
}

export function buildIndexes(problem: SchedulingProblem): Indexes {
  const slotsById = new Map<TimeSlotId, TimeSlot>();
  for (const slot of problem.slots) slotsById.set(slot.id, slot);

  const resourcesById = new Map<ResourceId, Resource>();
  const resourcesByRole = new Map<string, ResourceId[]>();
  for (const resource of problem.resources) {
    resourcesById.set(resource.id, resource);
    for (const role of resource.roles) {
      const list = resourcesByRole.get(role) ?? [];
      list.push(resource.id);
      resourcesByRole.set(role, list);
    }
  }

  const activitiesById = new Map<string, Activity>();
  for (const activity of problem.activities) activitiesById.set(activity.id, activity);

  return { slotsById, resourcesById, activitiesById, resourcesByRole };
}

export type { AvailabilityInterval };
