import type { SchedulingProblem } from "@/domain/problem";
import type { Activity, Resource } from "@/domain";
import type { TimeSlot } from "@/domain/time";
import type { TimeSlotId, ResourceId } from "@/domain/ids";
import type { Placement, Instance } from "./types";
import type { Indexes } from "./indexes";
import { isAvailable } from "@/domain/availability";
import { activitySize, activityRequiredEquipment } from "@/domain/activity";
import { resourceCapacity, resourceEquipment } from "@/domain/resource";
import { Rng } from "./rng";

const MAX_PLACEMENTS_PER_INSTANCE = 240;

export interface CandidateConfig {
  blockedByResource: Map<ResourceId, Set<TimeSlotId>>;
  blockedGlobal: Set<TimeSlotId>;
  useCapacity: boolean;
  useEquipment: boolean;
}

export function buildCandidateConfig(problem: SchedulingProblem): CandidateConfig {
  const blockedByResource = new Map<ResourceId, Set<TimeSlotId>>();
  const blockedGlobal = new Set<TimeSlotId>();
  let useCapacity = false;
  let useEquipment = false;
  for (const c of problem.constraints) {
    if (c.type === "blockedSlot") {
      if (c.resourceId !== undefined) {
        const set = blockedByResource.get(c.resourceId) ?? new Set<TimeSlotId>();
        for (const s of c.slotIds) set.add(s as TimeSlotId);
        blockedByResource.set(c.resourceId, set);
      } else {
        for (const s of c.slotIds) blockedGlobal.add(s as TimeSlotId);
      }
    } else if (c.type === "resourceCapacity") {
      useCapacity = true;
    } else if (c.type === "equipmentCompatibility") {
      useEquipment = true;
    }
  }
  return { blockedByResource, blockedGlobal, useCapacity, useEquipment };
}

function slotFitsActivity(slot: TimeSlot, activity: Activity): boolean {
  if (slot.endMinutes - slot.startMinutes < activity.durationMinutes) return false;
  if (activity.allowedSlotIds !== undefined && !activity.allowedSlotIds.includes(slot.id)) return false;
  return true;
}

function feasibleResourcesForRequirement(
  requirement: Activity["requirements"][number],
  slot: TimeSlot,
  activity: Activity,
  indexes: Indexes,
  config: CandidateConfig,
): ResourceId[] {
  const result: ResourceId[] = [];
  const size = activitySize(activity);
  const requiredEquipment = config.useEquipment ? activityRequiredEquipment(activity) : [];
  for (const candidateId of requirement.candidateResourceIds) {
    const resource = indexes.resourcesById.get(candidateId);
    if (resource === undefined || !resource.active) continue;
    if (!isAvailable(resource.availability, slot.dayOfWeek, slot.date, slot.startMinutes, slot.endMinutes)) {
      continue;
    }
    if (config.blockedGlobal.has(slot.id)) continue;
    const blocked = config.blockedByResource.get(resource.id);
    if (blocked !== undefined && blocked.has(slot.id)) continue;
    if (config.useCapacity && size !== undefined) {
      const capacity = resourceCapacity(resource);
      if (capacity !== undefined && capacity < size) continue;
    }
    if (config.useEquipment && requiredEquipment.length > 0 && (resource.kind === "location" || resource.kind === "equipment")) {
      const equipment = resourceEquipment(resource);
      if (!requiredEquipment.every((e) => equipment.includes(e))) continue;
    }
    result.push(resource.id);
  }
  return result;
}

function cartesianProductCapped(
  perRequirement: ResourceId[][],
  roleNames: string[],
  rng: Rng,
  cap: number,
): { role: string; resourceId: ResourceId }[][] {
  const roles = roleNames;
  let total = 1;
  for (const list of perRequirement) total *= Math.max(list.length, 0);
  if (total === 0) return [];

  const build = (idx: number, current: { role: string; resourceId: ResourceId }[]): { role: string; resourceId: ResourceId }[][] => {
    if (idx === perRequirement.length) return [current];
    const out: { role: string; resourceId: ResourceId }[][] = [];
    for (const resourceId of perRequirement[idx]!) {
      out.push(...build(idx + 1, [...current, { role: roles[idx]!, resourceId }]));
      if (out.length >= cap) break;
    }
    return out;
  };

  if (total <= cap) {
    return build(0, []);
  }
  // Sample by shuffling each requirement list and building until cap.
  const shuffled = perRequirement.map((list) => rng.shuffle(list.slice()));
  const out: { role: string; resourceId: ResourceId }[][] = [];
  const sampleOne = (idx: number, current: { role: string; resourceId: ResourceId }[]): boolean => {
    if (idx === shuffled.length) {
      out.push(current);
      return out.length >= cap;
    }
    for (const resourceId of shuffled[idx]!) {
      if (sampleOne(idx + 1, [...current, { role: roles[idx]!, resourceId }])) return true;
    }
    return false;
  };
  sampleOne(0, []);
  return out;
}

export function generatePlacements(
  activity: Activity,
  indexes: Indexes,
  config: CandidateConfig,
  rng: Rng,
): Placement[] {
  const placements: Placement[] = [];
  for (const slot of indexes.slotsById.values()) {
    if (!slotFitsActivity(slot, activity)) continue;
    const perRequirement = activity.requirements.map(
      (req) => feasibleResourcesForRequirement(req, slot, activity, indexes, config),
    );
    if (perRequirement.some((list) => list.length === 0)) continue;
    const roleNames = activity.requirements.map((r) => r.role);
    const combos = cartesianProductCapped(perRequirement, roleNames, rng, MAX_PLACEMENTS_PER_INSTANCE - placements.length);
    for (const resources of combos) {
      placements.push({ slotId: slot.id, resources });
      if (placements.length >= MAX_PLACEMENTS_PER_INSTANCE) break;
    }
    if (placements.length >= MAX_PLACEMENTS_PER_INSTANCE) break;
  }
  return placements;
}

export function buildInstances(
  problem: SchedulingProblem,
  indexes: Indexes,
  config: CandidateConfig,
  rng: Rng,
): Instance[] {
  const instances: Instance[] = [];
  for (const activity of problem.activities) {
    if (!activity.active) continue;
    const placements = generatePlacements(activity, indexes, config, rng);
    for (let i = 0; i < activity.count; i += 1) {
      instances.push({
        activityId: activity.id,
        instanceIndex: i,
        groupId: activity.groupId,
        priority: activity.priority,
        placements,
      });
    }
  }
  return instances;
}

export function orderInstances(instances: Instance[], rng: Rng): Instance[] {
  const sorted = instances.slice().sort((a, b) => {
    if (a.placements.length !== b.placements.length) return a.placements.length - b.placements.length;
    return b.priority - a.priority;
  });
  // Light randomization among equally-constrained instances for diversity.
  return rng.shuffle(sorted);
}

export type { Resource };
