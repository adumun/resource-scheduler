import type { ScheduleId } from "./ids";
import type { TimeRange, TimeSlot } from "./time";
import type { Resource } from "./resource";
import type { Activity } from "./activity";
import type { Constraint } from "./constraint";
import type { SchedulingResult, SolutionSummary } from "./result";

export type ScheduleStatus =
  | "draft"
  | "ready"
  | "scheduling"
  | "scheduled"
  | "conflict"
  | "archived";

export type SchedulePreset = "academic" | "sports" | "surgery" | "custom";

export interface Schedule {
  id: ScheduleId;
  ownerId: string;
  name: string;
  description: string;
  preset: SchedulePreset;
  status: ScheduleStatus;
  createdAt: string;
  updatedAt: string;
  timeRange: TimeRange;
  slots: TimeSlot[];
  resources: Resource[];
  activities: Activity[];
  constraints: Constraint[];
  /** Full solution history, most recent first (capped). */
  results: SchedulingResult[];
  currentSolutionId?: string;
  schemaVersion: number;
}

export const SCHEDULE_SCHEMA_VERSION = 1;
export const MAX_SOLUTION_HISTORY = 20;

export function scheduleStats(schedule: Schedule) {
  const activeResources = schedule.resources.filter((r) => r.active).length;
  const activeActivities = schedule.activities.filter((a) => a.active).length;
  const totalInstances = schedule.activities
    .filter((a) => a.active)
    .reduce((sum, a) => sum + a.count, 0);
  return {
    activeResources,
    activeActivities,
    totalInstances,
    slots: schedule.slots.length,
    constraints: schedule.constraints.length,
  };
}

export function solutionSummaries(schedule: Schedule): SolutionSummary[] {
  return schedule.results.map((r) => ({
    id: r.solutionId,
    score: r.score.value,
    hardViolations: r.score.hardViolations,
    softViolations: r.score.softViolations,
    scheduledCount: r.assignments.length,
    unscheduledCount: r.unscheduled.length,
    generatedAt: r.generatedAt,
    seed: r.seed,
    valid: r.valid,
  }));
}

export function currentResult(schedule: Schedule): SchedulingResult | undefined {
  if (schedule.currentSolutionId === undefined) return schedule.results[0];
  return schedule.results.find((r) => r.solutionId === schedule.currentSolutionId);
}
