import type { Schedule } from "@/domain/schedule";
import {
  SCHEDULE_SCHEMA_VERSION,
  MAX_SOLUTION_HISTORY,
} from "@/domain/schedule";
import type { SchedulePreset, ScheduleStatus } from "@/domain/schedule";
import type { TimeRange, TimeSlot } from "@/domain/time";
import type { Resource } from "@/domain/resource";
import type { Activity } from "@/domain/activity";
import type { Constraint } from "@/domain/constraint";
import type { SchedulingResult } from "@/domain/result";
import type { ScheduleRepository } from "@/infrastructure/repositories/types";
import { id, rid } from "@/domain/ids";

export interface CreateScheduleInput {
  ownerId: string;
  name: string;
  description: string;
  preset: SchedulePreset;
  timeRange: TimeRange;
  slots: TimeSlot[];
  resources: Resource[];
  activities: Activity[];
  constraints: Constraint[];
}

export function createSchedule(input: CreateScheduleInput): Schedule {
  const now = new Date().toISOString();
  return {
    id: id.schedule(),
    ownerId: input.ownerId,
    name: input.name,
    description: input.description,
    preset: input.preset,
    status: "draft",
    createdAt: now,
    updatedAt: now,
    timeRange: input.timeRange,
    slots: input.slots,
    resources: input.resources,
    activities: input.activities,
    constraints: input.constraints,
    results: [],
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
  };
}

function deriveStatus(schedule: Schedule, results: SchedulingResult[]): ScheduleStatus {
  if (results.length === 0) {
    return schedule.activities.some((a) => a.active) && schedule.slots.length > 0 ? "ready" : "draft";
  }
  const current = results[0]!;
  if (!current.valid) return "conflict";
  return "scheduled";
}

export class ScheduleService {
  constructor(private readonly repo: ScheduleRepository) {}

  async list(ownerId: string): Promise<Schedule[]> {
    return this.repo.list(ownerId);
  }

  async get(id: string): Promise<Schedule | undefined> {
    return this.repo.get(id);
  }

  async create(input: CreateScheduleInput): Promise<Schedule> {
    const schedule = createSchedule(input);
    schedule.status = deriveStatus(schedule, schedule.results);
    await this.repo.save(schedule);
    return schedule;
  }

  async update(schedule: Schedule): Promise<Schedule> {
    const updated: Schedule = { ...schedule, updatedAt: new Date().toISOString() };
    updated.status = schedule.status === "archived" ? "archived" : deriveStatus(updated, updated.results);
    await this.repo.save(updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.repo.remove(id);
  }

  async duplicate(scheduleId: string, ownerId: string): Promise<Schedule> {
    const original = await this.repo.get(scheduleId);
    if (original === undefined) throw new Error("Schedule not found.");
    const now = new Date().toISOString();
    const copy: Schedule = {
      ...original,
      id: id.schedule(),
      ownerId,
      name: `${original.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      results: [],
      currentSolutionId: undefined,
      status: "draft",
    };
    await this.repo.save(copy);
    return copy;
  }

  async saveResults(scheduleId: string, results: SchedulingResult[]): Promise<Schedule> {
    const schedule = await this.repo.get(scheduleId);
    if (schedule === undefined) throw new Error("Schedule not found.");
    const merged = [...results, ...schedule.results].slice(0, MAX_SOLUTION_HISTORY);
    const best = merged[0];
    const updated: Schedule = {
      ...schedule,
      results: merged,
      currentSolutionId: best?.solutionId,
      updatedAt: new Date().toISOString(),
    };
    updated.status = deriveStatus(updated, merged);
    await this.repo.save(updated);
    return updated;
  }

  async setCurrentSolution(scheduleId: string, solutionId: string): Promise<Schedule> {
    const schedule = await this.repo.get(scheduleId);
    if (schedule === undefined) throw new Error("Schedule not found.");
    const updated: Schedule = {
      ...schedule,
      currentSolutionId: solutionId,
      updatedAt: new Date().toISOString(),
    };
    await this.repo.save(updated);
    return updated;
  }

  async clearResults(scheduleId: string): Promise<Schedule> {
    const schedule = await this.repo.get(scheduleId);
    if (schedule === undefined) throw new Error("Schedule not found.");
    const updated: Schedule = {
      ...schedule,
      results: [],
      currentSolutionId: undefined,
      updatedAt: new Date().toISOString(),
      status: "ready",
    };
    await this.repo.save(updated);
    return updated;
  }

  async setStatus(scheduleId: string, status: ScheduleStatus): Promise<Schedule> {
    const schedule = await this.repo.get(scheduleId);
    if (schedule === undefined) throw new Error("Schedule not found.");
    const updated: Schedule = { ...schedule, status, updatedAt: new Date().toISOString() };
    await this.repo.save(updated);
    return updated;
  }
}

export function emptySchedule(ownerId: string, preset: SchedulePreset): Schedule {
  return createSchedule({
    ownerId,
    name: "Untitled schedule",
    description: "",
    preset,
    timeRange: { startDate: "2026-01-01", endDate: "2026-12-31" },
    slots: [],
    resources: [],
    activities: [],
    constraints: [],
  });
}

export const _rid = rid;
