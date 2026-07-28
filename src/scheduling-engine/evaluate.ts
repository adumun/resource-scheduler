import type { SchedulingProblem } from "@/domain/problem";
import type { Violation } from "@/domain/violation";
import type { Score } from "@/domain/score";
import type { makeScore } from "@/domain/score";
import { makeScore as makeScoreImpl } from "@/domain/score";
import type { AssignedItem } from "./penalty";
import { evaluateSoft } from "./penalty";
import { buildSoftRules } from "./penalty";
import { buildHardRules } from "./checks";
import type { TimeSlot } from "@/domain/time";
import type { ResourceId } from "@/domain/ids";

function dayKey(slot: TimeSlot): string {
  if (slot.date !== undefined) return `date:${slot.date}`;
  if (slot.dayOfWeek !== undefined) return `dow:${slot.dayOfWeek}`;
  return "any";
}

export interface EvaluationResult {
  hardViolations: Violation[];
  softViolations: Violation[];
  score: Score;
}

export function evaluate(
  problem: SchedulingProblem,
  _indexes: unknown,
  items: AssignedItem[],
): EvaluationResult {
  const hardRules = buildHardRules(problem);
  const softRules = buildSoftRules(problem);
  const hardViolations: Violation[] = [];
  let counter = 0;

  const resourceUses = new Map<ResourceId, { item: AssignedItem; slot: TimeSlot }[]>();
  const groupUses = new Map<string, { item: AssignedItem; slot: TimeSlot }[]>();
  for (const item of items) {
    for (const ar of item.placement.resources) {
      const list = resourceUses.get(ar.resourceId) ?? [];
      list.push({ item, slot: item.slot });
      resourceUses.set(ar.resourceId, list);
    }
    if (item.instance.groupId !== undefined && item.instance.groupId !== "") {
      const list = groupUses.get(item.instance.groupId) ?? [];
      list.push({ item, slot: item.slot });
      groupUses.set(item.instance.groupId, list);
    }
  }

  const checkPairs = (
    uses: { item: AssignedItem; slot: TimeSlot }[] | undefined,
    label: string,
    resourceIds: ResourceId[],
  ) => {
    if (uses === undefined) return;
    for (let i = 0; i < uses.length; i += 1) {
      for (let j = i + 1; j < uses.length; j += 1) {
        const a = uses[i]!;
        const b = uses[j]!;
        if (dayKey(a.slot) !== dayKey(b.slot)) continue;
        if (a.slot.startMinutes < b.slot.endMinutes && b.slot.startMinutes < a.slot.endMinutes) {
          hardViolations.push({
            id: `h_${counter++}`,
            kind: "hard",
            description: `${label} double-booked on ${dayKey(a.slot)} ${a.slot.startMinutes}-${a.slot.endMinutes}`,
            assignmentIds: [],
            resourceIds,
            slotIds: [a.slot.id, b.slot.id],
          });
        }
      }
    }
  };

  for (const [resourceId, uses] of resourceUses) {
    checkPairs(uses, `Resource ${resourceId}`, [resourceId]);
    const max = hardRules.maxPerDayResource.get(resourceId);
    if (max !== undefined) {
      const perDay = new Map<string, number>();
      for (const u of uses) perDay.set(dayKey(u.slot), (perDay.get(dayKey(u.slot)) ?? 0) + 1);
      for (const [dk, count] of perDay) {
        if (count > max) {
          hardViolations.push({
            id: `h_${counter++}`,
            kind: "hard",
            constraintType: "maxActivitiesPerDay",
            description: `Resource ${resourceId} has ${count} > ${max} on ${dk}`,
            assignmentIds: [],
            resourceIds: [resourceId],
            slotIds: [],
          });
        }
      }
    }
    const sep = hardRules.minSepResource.get(resourceId);
    if (sep !== undefined) {
      for (let i = 0; i < uses.length; i += 1) {
        for (let j = i + 1; j < uses.length; j += 1) {
          const a = uses[i]!;
          const b = uses[j]!;
          if (dayKey(a.slot) !== dayKey(b.slot)) continue;
          const gap = a.slot.startMinutes >= b.slot.endMinutes ? a.slot.startMinutes - b.slot.endMinutes : b.slot.startMinutes - a.slot.endMinutes;
          if (gap < sep) {
            hardViolations.push({
              id: `h_${counter++}`,
              kind: "hard",
              constraintType: "minSeparation",
              description: `Resource ${resourceId} separation ${gap} < ${sep}`,
              assignmentIds: [],
              resourceIds: [resourceId],
              slotIds: [a.slot.id, b.slot.id],
            });
          }
        }
      }
    }
  }

  for (const [groupId, uses] of groupUses) {
    checkPairs(uses, `Group ${groupId}`, []);
    const max = hardRules.maxPerDayGroup.get(groupId);
    if (max !== undefined) {
      const perDay = new Map<string, number>();
      for (const u of uses) perDay.set(dayKey(u.slot), (perDay.get(dayKey(u.slot)) ?? 0) + 1);
      for (const [dk, count] of perDay) {
        if (count > max) {
          hardViolations.push({
            id: `h_${counter++}`,
            kind: "hard",
            constraintType: "maxActivitiesPerDay",
            description: `Group ${groupId} has ${count} > ${max} on ${dk}`,
            assignmentIds: [],
            resourceIds: [],
            slotIds: [],
          });
        }
      }
    }
    const sep = hardRules.minSepGroup.get(groupId);
    if (sep !== undefined) {
      for (let i = 0; i < uses.length; i += 1) {
        for (let j = i + 1; j < uses.length; j += 1) {
          const a = uses[i]!;
          const b = uses[j]!;
          if (dayKey(a.slot) !== dayKey(b.slot)) continue;
          const gap = a.slot.startMinutes >= b.slot.endMinutes ? a.slot.startMinutes - b.slot.endMinutes : b.slot.startMinutes - a.slot.endMinutes;
          if (gap < sep) {
            hardViolations.push({
              id: `h_${counter++}`,
              kind: "hard",
              constraintType: "minSeparation",
              description: `Group ${groupId} separation ${gap} < ${sep}`,
              assignmentIds: [],
              resourceIds: [],
              slotIds: [a.slot.id, b.slot.id],
            });
          }
        }
      }
    }
  }

  const { totalPenalty, violations: softViolations } = evaluateSoft(items, softRules);
  const score = makeScoreImpl(hardViolations.length, softViolations.length, totalPenalty);
  return { hardViolations, softViolations, score };
}

export type { makeScore };
