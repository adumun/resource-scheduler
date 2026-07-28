import type { Assignment } from "./assignment";
import type { Violation } from "./violation";
import type { Score } from "./score";
import type { SolverOptions } from "./problem";
import type { ActivityId, ScheduleId, SolutionId } from "./ids";

export interface UnscheduledActivity {
  activityId: ActivityId;
  instanceIndex: number;
  reason: string;
}

export interface Diagnostic {
  code: string;
  message: string;
  details: string[];
  activityIds: ActivityId[];
  resourceIds: string[];
}

export interface SchedulingResult {
  scheduleId: ScheduleId;
  solutionId: SolutionId;
  assignments: Assignment[];
  unscheduled: UnscheduledActivity[];
  score: Score;
  hardViolations: Violation[];
  softViolations: Violation[];
  diagnostics: Diagnostic[];
  generatedAt: string;
  elapsedMs: number;
  solverOptions: SolverOptions;
  seed: number;
  valid: boolean;
}

export interface SolutionSummary {
  id: SolutionId;
  score: number;
  hardViolations: number;
  softViolations: number;
  scheduledCount: number;
  unscheduledCount: number;
  generatedAt: string;
  seed: number;
  valid: boolean;
}

export function summarizeResult(result: SchedulingResult): SolutionSummary {
  return {
    id: result.solutionId,
    score: result.score.value,
    hardViolations: result.score.hardViolations,
    softViolations: result.score.softViolations,
    scheduledCount: result.assignments.length,
    unscheduledCount: result.unscheduled.length,
    generatedAt: result.generatedAt,
    seed: result.seed,
    valid: result.valid,
  };
}
