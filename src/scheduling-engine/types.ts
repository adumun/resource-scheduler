import type { SchedulingProblem, SolverOptions } from "@/domain/problem";
import type { SchedulingResult } from "@/domain/result";
import type { Assignment } from "@/domain/assignment";
import type { ResourceId, TimeSlotId } from "@/domain/ids";
import type { TimeSlot } from "@/domain/time";

export interface Progress {
  phase: "candidates" | "searching" | "improving" | "finalizing";
  assigned: number;
  total: number;
  bestScore: number;
  elapsedMs: number;
  message?: string;
}

export interface SchedulingEngine {
  solve(
    problem: SchedulingProblem,
    options: SolverOptions,
    onProgress?: (progress: Progress) => void,
    shouldCancel?: () => boolean,
  ): SchedulingResult[];
}

export interface Placement {
  slotId: TimeSlotId;
  resources: { role: string; resourceId: ResourceId }[];
}

export interface Instance {
  activityId: string;
  instanceIndex: number;
  groupId?: string;
  priority: number;
  placements: Placement[];
}

export interface ProblemIndexes {
  slotsById: Map<TimeSlotId, TimeSlot>;
  resourcesById: Map<ResourceId, { roles: string[]; availability: import("@/domain/availability").AvailabilityInterval[]; active: boolean; attributes: Record<string, unknown> }>;
  activitiesById: Map<string, import("@/domain/activity").Activity>;
}

export type { SchedulingProblem, SolverOptions, SchedulingResult, Assignment };
