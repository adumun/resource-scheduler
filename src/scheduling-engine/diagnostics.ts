import type { SchedulingProblem } from "@/domain/problem";
import type { Diagnostic } from "@/domain/result";
import type { Resource } from "@/domain";
import type { ActivityId } from "@/domain/ids";
import type { Instance } from "./types";
import type { Indexes } from "./indexes";
import { buildCandidateConfig } from "./candidates";
import { isAvailable } from "@/domain/availability";
import { activitySize, activityRequiredEquipment } from "@/domain/activity";
import { resourceCapacity, resourceEquipment } from "@/domain/resource";

export function diagnose(
  problem: SchedulingProblem,
  indexes: Indexes,
  instances: Instance[],
  unscheduledOrders: Set<number>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const config = buildCandidateConfig(problem);

  const unscheduledInstances = instances.filter((_, i) => unscheduledOrders.has(i));
  const zeroPlacement = unscheduledInstances.filter((i) => i.placements.length === 0);

  const byActivity = new Map<string, Instance[]>();
  for (const inst of zeroPlacement) {
    const list = byActivity.get(inst.activityId) ?? [];
    list.push(inst);
    byActivity.set(inst.activityId, list);
  }

  for (const [activityId, insts] of byActivity) {
    const activity = indexes.activitiesById.get(activityId);
    if (activity === undefined) continue;
    const details: string[] = [];
    const resourceIds: string[] = [];

    const fittingSlots = problem.slots.filter((s) => {
      if (s.endMinutes - s.startMinutes < activity.durationMinutes) return false;
      if (activity.allowedSlotIds !== undefined && !activity.allowedSlotIds.includes(s.id)) return false;
      return true;
    });
    if (fittingSlots.length === 0) {
      details.push(`Requires ${activity.durationMinutes} min but no slot is long enough or allowed.`);
    }

    for (const req of activity.requirements) {
      const activeCandidates = req.candidateResourceIds
        .map((rid) => indexes.resourcesById.get(rid))
        .filter((r): r is Resource => r !== undefined && r.active);
      if (activeCandidates.length === 0) {
        details.push(`No active resource for role "${req.role}".`);
        continue;
      }
      const availableInSomeSlot = activeCandidates.some((r) =>
        fittingSlots.some((s) =>
          isAvailable(r.availability, s.dayOfWeek, s.date, s.startMinutes, s.endMinutes),
        ),
      );
      if (!availableInSomeSlot && fittingSlots.length > 0) {
        details.push(`Role "${req.role}": no candidate available in any fitting slot.`);
        resourceIds.push(...activeCandidates.map((r) => r.id));
      }
      if (config.useCapacity) {
        const size = activitySize(activity);
        if (size !== undefined) {
          const bigEnough = activeCandidates.filter((r) => {
            const cap = resourceCapacity(r);
            return cap === undefined || cap >= size;
          });
          if (bigEnough.length === 0) {
            details.push(`Role "${req.role}": all candidates too small (need capacity ${size}).`);
          }
        }
      }
      if (config.useEquipment) {
        const required = activityRequiredEquipment(activity);
        if (required.length > 0) {
          const equipped = activeCandidates.filter((r) => {
            const eq = resourceEquipment(r);
            return required.every((e) => eq.includes(e));
          });
          if (equipped.length === 0) {
            details.push(`Role "${req.role}": no candidate has required equipment [${required.join(", ")}].`);
          }
        }
      }
    }

    diagnostics.push({
      code: "NO_FEASIBLE_PLACEMENT",
      message: `Activity "${activity.name}" (${insts.length} instance(s)) has no feasible placement.`,
      details: details.length > 0 ? details : ["All candidate placements were eliminated by constraints."],
      activityIds: [activity.id],
      resourceIds,
    });
  }

  const conflictBlocked = unscheduledInstances.filter((i) => i.placements.length > 0);
  if (conflictBlocked.length > 0) {
    const activityIds = [...new Set(conflictBlocked.map((i) => i.activityId))] as ActivityId[];
    diagnostics.push({
      code: "GLOBAL_CONFLICT",
      message: `${conflictBlocked.length} instance(s) could not be placed without hard conflicts.`,
      details: [
        "Available placements existed but every option conflicted with already-assigned resources or groups.",
        "Consider adding more slots, resources, or relaxing max-per-day / min-separation constraints.",
      ],
      activityIds,
      resourceIds: [],
    });
  }

  return diagnostics;
}
