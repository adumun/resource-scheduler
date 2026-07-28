import type { SchedulingProblem } from "@/domain/problem";
import type { Constraint } from "@/domain/constraint";
import type { ConstraintId, ResourceId, ActivityId, TimeSlotId } from "@/domain/ids";
import type { TimeSlot } from "@/domain/time";
import type { Placement, Instance } from "./types";
import type { Violation } from "@/domain/violation";

const PENALTY_UNIT = 0.1;

interface PreferredTimeRule {
  fromMinutes: number;
  toMinutes: number;
  weight: number;
  constraintId: ConstraintId;
}
interface PreferredResourceRule {
  role: string;
  resourceId: ResourceId;
  weight: number;
  constraintId: ConstraintId;
}
interface CountRule {
  max: number;
  weight: number;
  constraintId: ConstraintId;
}
interface SepRule {
  minutes: number;
  weight: number;
  constraintId: ConstraintId;
}
interface GroupRule {
  weight: number;
  constraintId: ConstraintId;
}

export interface SoftRules {
  preferredTimeResource: Map<ResourceId, PreferredTimeRule[]>;
  preferredTimeActivity: Map<ActivityId, PreferredTimeRule[]>;
  preferredResource: Map<ActivityId, PreferredResourceRule[]>;
  uniformDistribution: Map<string, GroupRule>;
  maxPerDayResource: Map<ResourceId, CountRule[]>;
  maxPerDayGroup: Map<string, CountRule[]>;
  minSepResource: Map<ResourceId, SepRule[]>;
  minSepGroup: Map<string, SepRule[]>;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

export function buildSoftRules(problem: SchedulingProblem): SoftRules {
  const rules: SoftRules = {
    preferredTimeResource: new Map(),
    preferredTimeActivity: new Map(),
    preferredResource: new Map(),
    uniformDistribution: new Map(),
    maxPerDayResource: new Map(),
    maxPerDayGroup: new Map(),
    minSepResource: new Map(),
    minSepGroup: new Map(),
  };
  for (const c of problem.constraints) {
    if (c.hard) continue;
    switch (c.type) {
      case "preferredTime":
        if (c.scope === "resource") {
          push(rules.preferredTimeResource, c.refId as ResourceId, {
            fromMinutes: c.fromMinutes,
            toMinutes: c.toMinutes,
            weight: c.weight,
            constraintId: c.id,
          });
        } else {
          push(rules.preferredTimeActivity, c.refId as ActivityId, {
            fromMinutes: c.fromMinutes,
            toMinutes: c.toMinutes,
            weight: c.weight,
            constraintId: c.id,
          });
        }
        break;
      case "preferredResource":
        push(rules.preferredResource, c.activityId, {
          role: c.role,
          resourceId: c.resourceId,
          weight: c.weight,
          constraintId: c.id,
        });
        break;
      case "uniformDistribution":
        rules.uniformDistribution.set(c.groupId, { weight: c.weight, constraintId: c.id });
        break;
      case "maxActivitiesPerDay":
        if (c.scope === "resource") {
          push(rules.maxPerDayResource, c.refId as ResourceId, { max: c.max, weight: c.weight, constraintId: c.id });
        } else {
          push(rules.maxPerDayGroup, c.refId, { max: c.max, weight: c.weight, constraintId: c.id });
        }
        break;
      case "minSeparation":
        if (c.scope === "resource") {
          push(rules.minSepResource, c.refId as ResourceId, { minutes: c.minutes, weight: c.weight, constraintId: c.id });
        } else {
          push(rules.minSepGroup, c.refId, { minutes: c.minutes, weight: c.weight, constraintId: c.id });
        }
        break;
      default:
        break;
    }
  }
  return rules;
}

export interface AssignedItem {
  instance: Instance;
  placement: Placement;
  slot: TimeSlot;
  instanceOrder: number;
}

function dayKey(slot: TimeSlot): string {
  if (slot.date !== undefined) return `date:${slot.date}`;
  if (slot.dayOfWeek !== undefined) return `dow:${slot.dayOfWeek}`;
  return "any";
}

export interface PenaltyResult {
  totalPenalty: number;
  violations: Violation[];
}

export function evaluateSoft(items: AssignedItem[], rules: SoftRules): PenaltyResult {
  let totalPenalty = 0;
  const violations: Violation[] = [];

  const resourceDayCount = new Map<string, number>();
  const groupDayCount = new Map<string, number>();
  const resourceUses = new Map<ResourceId, { dayKey: string; start: number; end: number; item: AssignedItem }[]>();
  const groupUses = new Map<string, { dayKey: string; start: number; end: number; item: AssignedItem }[]>();

  for (const item of items) {
    const { placement, slot, instance } = item;
    const dk = dayKey(slot);
    for (const ar of placement.resources) {
      const key = `${ar.resourceId}|${dk}`;
      resourceDayCount.set(key, (resourceDayCount.get(key) ?? 0) + 1);
      const list = resourceUses.get(ar.resourceId) ?? [];
      list.push({ dayKey: dk, start: slot.startMinutes, end: slot.endMinutes, item });
      resourceUses.set(ar.resourceId, list);
    }
    if (instance.groupId !== undefined && instance.groupId !== "") {
      const key = `${instance.groupId}|${dk}`;
      groupDayCount.set(key, (groupDayCount.get(key) ?? 0) + 1);
      const list = groupUses.get(instance.groupId) ?? [];
      list.push({ dayKey: dk, start: slot.startMinutes, end: slot.endMinutes, item });
      groupUses.set(instance.groupId, list);
    }
  }

  let violationCounter = 0;
  const addViolation = (v: Omit<Violation, "id" | "kind"> & { penalty: number }) => {
    totalPenalty += v.penalty;
    violations.push({ ...v, id: `v_${violationCounter++}`, kind: "soft" });
  };

  for (const item of items) {
    const { placement, slot, instance } = item;
    const activityId = instance.activityId as ActivityId;

    const activityRules = rules.preferredTimeActivity.get(activityId);
    if (activityRules !== undefined) {
      for (const r of activityRules) {
        if (slot.startMinutes < r.fromMinutes || slot.startMinutes >= r.toMinutes) {
          addViolation({
            constraintId: r.constraintId,
            constraintType: "preferredTime",
            description: `Activity ${activityId} outside preferred time ${r.fromMinutes}-${r.toMinutes}`,
            assignmentIds: [],
            resourceIds: [],
            slotIds: [slot.id],
            penalty: r.weight * PENALTY_UNIT,
          });
        }
      }
    }

    for (const ar of placement.resources) {
      const resRules = rules.preferredTimeResource.get(ar.resourceId);
      if (resRules !== undefined) {
        for (const r of resRules) {
          if (slot.startMinutes < r.fromMinutes || slot.startMinutes >= r.toMinutes) {
            addViolation({
              constraintId: r.constraintId,
              constraintType: "preferredTime",
              description: `Resource ${ar.resourceId} outside preferred time`,
              assignmentIds: [],
              resourceIds: [ar.resourceId],
              slotIds: [slot.id],
              penalty: r.weight * PENALTY_UNIT,
            });
          }
        }
      }
    }

    const prefRes = rules.preferredResource.get(activityId);
    if (prefRes !== undefined) {
      for (const r of prefRes) {
        const assigned = placement.resources.find((x) => x.role === r.role)?.resourceId;
        if (assigned !== r.resourceId) {
          addViolation({
            constraintId: r.constraintId,
            constraintType: "preferredResource",
            description: `Activity ${activityId} did not get preferred ${r.role} ${r.resourceId}`,
            assignmentIds: [],
            resourceIds: [r.resourceId],
            slotIds: [],
            penalty: r.weight * PENALTY_UNIT,
          });
        }
      }
    }
  }

  for (const [resourceId, rulesList] of rules.maxPerDayResource) {
    for (const r of rulesList) {
      for (const [key, count] of resourceDayCount) {
        if (!key.startsWith(`${resourceId}|`)) continue;
        if (count > r.max) {
          addViolation({
            constraintId: r.constraintId,
            constraintType: "maxActivitiesPerDay",
            description: `Resource ${resourceId} has ${count} > ${r.max} on a day`,
            assignmentIds: [],
            resourceIds: [resourceId],
            slotIds: [],
            penalty: r.weight * PENALTY_UNIT * (count - r.max),
          });
        }
      }
    }
  }
  for (const [groupId, rulesList] of rules.maxPerDayGroup) {
    for (const r of rulesList) {
      for (const [key, count] of groupDayCount) {
        if (!key.startsWith(`${groupId}|`)) continue;
        if (count > r.max) {
          addViolation({
            constraintId: r.constraintId,
            constraintType: "maxActivitiesPerDay",
            description: `Group ${groupId} has ${count} > ${r.max} on a day`,
            assignmentIds: [],
            resourceIds: [],
            slotIds: [],
            penalty: r.weight * PENALTY_UNIT * (count - r.max),
          });
        }
      }
    }
  }

  const computeSeparations = (
    uses: { dayKey: string; start: number; end: number; item: AssignedItem }[] | undefined,
    minutes: number,
  ): { a: AssignedItem; b: AssignedItem; gap: number }[] => {
    if (uses === undefined) return [];
    const result: { a: AssignedItem; b: AssignedItem; gap: number }[] = [];
    for (let i = 0; i < uses.length; i += 1) {
      for (let j = i + 1; j < uses.length; j += 1) {
        const x = uses[i]!;
        const y = uses[j]!;
        if (x.dayKey !== y.dayKey) continue;
        const gap = x.start >= y.end ? x.start - y.end : y.start - x.end;
        if (gap < minutes) result.push({ a: x.item, b: y.item, gap });
      }
    }
    return result;
  };

  for (const [resourceId, rulesList] of rules.minSepResource) {
    for (const r of rulesList) {
      const pairs = computeSeparations(resourceUses.get(resourceId), r.minutes);
      for (const p of pairs) {
        addViolation({
          constraintId: r.constraintId,
          constraintType: "minSeparation",
          description: `Resource ${resourceId} separation ${p.gap} < ${r.minutes}`,
          assignmentIds: [],
          resourceIds: [resourceId],
          slotIds: [],
          penalty: r.weight * PENALTY_UNIT,
        });
      }
    }
  }
  for (const [groupId, rulesList] of rules.minSepGroup) {
    for (const r of rulesList) {
      const pairs = computeSeparations(groupUses.get(groupId), r.minutes);
      for (const p of pairs) {
        addViolation({
          constraintId: r.constraintId,
          constraintType: "minSeparation",
          description: `Group ${groupId} separation ${p.gap} < ${r.minutes}`,
          assignmentIds: [],
          resourceIds: [],
          slotIds: [],
          penalty: r.weight * PENALTY_UNIT,
        });
      }
    }
  }

  for (const [groupId, rule] of rules.uniformDistribution) {
    const uses = groupUses.get(groupId);
    if (uses === undefined || uses.length === 0) continue;
    const byDay = new Map<string, number>();
    for (const u of uses) byDay.set(u.dayKey, (byDay.get(u.dayKey) ?? 0) + 1);
    const counts = [...byDay.values()];
    const maxC = Math.max(...counts);
    const minC = Math.min(...counts);
    if (maxC - minC > 0) {
      addViolation({
        constraintId: rule.constraintId,
        constraintType: "uniformDistribution",
        description: `Group ${groupId} unevenly distributed (max ${maxC}, min ${minC})`,
        assignmentIds: [],
        resourceIds: [],
        slotIds: [],
        penalty: rule.weight * 0.05 * (maxC - minC),
      });
    }
  }

  return { totalPenalty, violations };
}

export function softPenaltyOnly(items: AssignedItem[], rules: SoftRules): number {
  return evaluateSoft(items, rules).totalPenalty;
}

export type { Constraint, TimeSlotId };
