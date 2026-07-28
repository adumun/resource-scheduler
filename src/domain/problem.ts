import type { Constraint } from "./constraint";
import type { Resource } from "./resource";
import type { Activity } from "./activity";
import type { TimeSlot } from "./time";
import type { ScheduleId } from "./ids";

export interface SchedulingProblem {
  scheduleId: ScheduleId;
  slots: TimeSlot[];
  resources: Resource[];
  activities: Activity[];
  constraints: Constraint[];
}

export type OptimizationLevel = "fast" | "balanced" | "best";

export interface SolverOptions {
  maxIterations: number;
  timeoutMs: number;
  seed: number;
  optimizationLevel: OptimizationLevel;
  /** How many distinct alternative solutions to generate (>=1). */
  alternativeCount: number;
}

export const DEFAULT_SOLVER_OPTIONS: SolverOptions = {
  maxIterations: 4000,
  timeoutMs: 8000,
  seed: 12345,
  optimizationLevel: "balanced",
  alternativeCount: 1,
};

export function optionsForLevel(level: OptimizationLevel, overrides: Partial<SolverOptions> = {}): SolverOptions {
  const presets: Record<OptimizationLevel, Pick<SolverOptions, "maxIterations" | "timeoutMs">> = {
    fast: { maxIterations: 800, timeoutMs: 2500 },
    balanced: { maxIterations: 4000, timeoutMs: 8000 },
    best: { maxIterations: 20000, timeoutMs: 20000 },
  };
  return { ...DEFAULT_SOLVER_OPTIONS, ...presets[level], ...overrides, optimizationLevel: level };
}
