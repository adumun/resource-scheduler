import type { Schedule } from "@/domain/schedule";
import type { SchedulingProblem, SolverOptions } from "@/domain/problem";
import type { SchedulingResult } from "@/domain/result";
import type { Assignment } from "@/domain/assignment";
import type { Progress } from "@/scheduling-engine/types";
import type { Indexes } from "@/scheduling-engine/indexes";
import { buildIndexes } from "@/scheduling-engine/indexes";
import { evaluate } from "@/scheduling-engine/evaluate";
import { solveInWorker, type SolveHandle, type CancelledError } from "../worker/workerClient";
import { rid } from "@/domain/ids";

export class SchedulingService {
  buildProblem(schedule: Schedule): SchedulingProblem {
    return {
      scheduleId: schedule.id,
      slots: schedule.slots,
      resources: schedule.resources,
      activities: schedule.activities,
      constraints: schedule.constraints,
    };
  }

  solve(
    schedule: Schedule,
    options: SolverOptions,
    onProgress?: (progress: Progress) => void,
  ): SolveHandle {
    return solveInWorker(this.buildProblem(schedule), options, onProgress);
  }
}

export interface RecomputeResult {
  result: SchedulingResult;
  newViolations: import("@/domain/violation").Violation[];
}

/**
 * Re-evaluates a solution after a manual assignment edit (move / reassign).
 * Returns a new SchedulingResult with updated score and violations.
 */
export function recompute(
  schedule: Schedule,
  assignments: Assignment[],
  seed: number,
  solverOptions: SolverOptions,
): RecomputeResult {
  const problem: SchedulingProblem = {
    scheduleId: schedule.id,
    slots: schedule.slots,
    resources: schedule.resources,
    activities: schedule.activities,
    constraints: schedule.constraints,
  };
  const indexes: Indexes = buildIndexes(problem);
  const items = assignments
    .map((a) => {
      const slot = indexes.slotsById.get(a.slotId);
      const activity = indexes.activitiesById.get(a.activityId);
      if (slot === undefined || activity === undefined) return null;
      return {
        instance: {
          activityId: a.activityId,
          instanceIndex: a.instanceIndex,
          groupId: activity.groupId,
          priority: activity.priority,
          placements: [],
        },
        placement: { slotId: a.slotId, resources: a.resources },
        slot,
        instanceOrder: 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const { hardViolations, softViolations, score } = evaluate(problem, indexes, items);
  const valid = hardViolations.length === 0;
  const result: SchedulingResult = {
    scheduleId: rid(schedule.id),
    solutionId: rid(`manual_${Date.now()}`),
    assignments,
    unscheduled: [],
    score,
    hardViolations,
    softViolations,
    diagnostics: [],
    generatedAt: new Date().toISOString(),
    elapsedMs: 0,
    solverOptions,
    seed,
    valid,
  };
  return { result, newViolations: [...hardViolations, ...softViolations] };
}

export type { CancelledError };
