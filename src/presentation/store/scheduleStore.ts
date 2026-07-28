import { create } from "zustand";
import { scheduleService, schedulingService } from "@/application/compositionRoot";
import type { Schedule } from "@/domain/schedule";
import type { CreateScheduleInput } from "@/application/services/ScheduleService";
import type { SolverOptions } from "@/domain/problem";
import type { SchedulingResult } from "@/domain/result";
import type { Progress } from "@/scheduling-engine/types";
import { CancelledError } from "@/application/worker/workerClient";

interface SchedulingState {
  running: boolean;
  progress: Progress | null;
  cancel: (() => void) | null;
  lastResults: SchedulingResult[] | null;
}

interface ScheduleState {
  schedules: Schedule[];
  current: Schedule | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  scheduling: SchedulingState;
  loadAll: (ownerId: string) => Promise<void>;
  loadOne: (id: string) => Promise<void>;
  create: (input: CreateScheduleInput) => Promise<Schedule | null>;
  update: (schedule: Schedule) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string, ownerId: string) => Promise<Schedule | null>;
  runScheduling: (schedule: Schedule, options: SolverOptions) => Promise<SchedulingResult[] | null>;
  cancelScheduling: () => void;
  setCurrentSolution: (scheduleId: string, solutionId: string) => Promise<void>;
  clearResults: (scheduleId: string) => Promise<void>;
  setStatus: (scheduleId: string, status: Schedule["status"]) => Promise<void>;
  replaceCurrent: (schedule: Schedule) => void;
  clearError: () => void;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  schedules: [],
  current: null,
  loading: false,
  saving: false,
  error: null,
  scheduling: { running: false, progress: null, cancel: null, lastResults: null },
  loadAll: async (ownerId) => {
    set({ loading: true, error: null });
    try {
      const schedules = await scheduleService.list(ownerId);
      set({ schedules, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },
  loadOne: async (id) => {
    set({ loading: true, error: null });
    try {
      const current = await scheduleService.get(id);
      set({ current: current ?? null, loading: false });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },
  create: async (input) => {
    set({ saving: true, error: null });
    try {
      const schedule = await scheduleService.create(input);
      set({ saving: false, schedules: [schedule, ...get().schedules] });
      return schedule;
    } catch (err) {
      set({ saving: false, error: (err as Error).message });
      return null;
    }
  },
  update: async (schedule) => {
    set({ saving: true, error: null });
    try {
      const updated = await scheduleService.update(schedule);
      set({
        saving: false,
        current: updated,
        schedules: get().schedules.map((s) => (s.id === updated.id ? updated : s)),
      });
    } catch (err) {
      set({ saving: false, error: (err as Error).message });
    }
  },
  remove: async (id) => {
    set({ saving: true, error: null });
    try {
      await scheduleService.remove(id);
      set({ saving: false, schedules: get().schedules.filter((s) => s.id !== id), current: null });
    } catch (err) {
      set({ saving: false, error: (err as Error).message });
    }
  },
  duplicate: async (id, ownerId) => {
    set({ saving: true, error: null });
    try {
      const copy = await scheduleService.duplicate(id, ownerId);
      set({ saving: false, schedules: [copy, ...get().schedules] });
      return copy;
    } catch (err) {
      set({ saving: false, error: (err as Error).message });
      return null;
    }
  },
  runScheduling: async (schedule, options) => {
    set({ scheduling: { running: true, progress: null, cancel: null, lastResults: null }, error: null });
    const handle = schedulingService.solve(schedule, options, (progress) => {
      set({ scheduling: { ...get().scheduling, progress } });
    });
    set({ scheduling: { ...get().scheduling, cancel: handle.cancel } });
    try {
      const results = await handle.promise;
      const updated = await scheduleService.saveResults(schedule.id, results);
      set({
        current: updated,
        schedules: get().schedules.map((s) => (s.id === updated.id ? updated : s)),
        scheduling: { running: false, progress: null, cancel: null, lastResults: results },
      });
      return results;
    } catch (err) {
      if (err instanceof CancelledError) {
        set({ scheduling: { running: false, progress: null, cancel: null, lastResults: null } });
        return null;
      }
      set({
        scheduling: { running: false, progress: null, cancel: null, lastResults: null },
        error: (err as Error).message,
      });
      return null;
    }
  },
  cancelScheduling: () => {
    const { cancel } = get().scheduling;
    cancel?.();
    set({ scheduling: { running: false, progress: null, cancel: null, lastResults: null } });
  },
  setCurrentSolution: async (scheduleId, solutionId) => {
    try {
      const updated = await scheduleService.setCurrentSolution(scheduleId, solutionId);
      set({
        current: updated,
        schedules: get().schedules.map((s) => (s.id === updated.id ? updated : s)),
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
  clearResults: async (scheduleId) => {
    try {
      const updated = await scheduleService.clearResults(scheduleId);
      set({
        current: updated,
        schedules: get().schedules.map((s) => (s.id === updated.id ? updated : s)),
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
  setStatus: async (scheduleId, status) => {
    try {
      const updated = await scheduleService.setStatus(scheduleId, status);
      set({
        current: updated,
        schedules: get().schedules.map((s) => (s.id === updated.id ? updated : s)),
      });
    } catch (err) {
      set({ error: (err as Error).message });
    }
  },
  replaceCurrent: (schedule) => {
    set({
      current: schedule,
      schedules: get().schedules.map((s) => (s.id === schedule.id ? schedule : s)),
    });
  },
  clearError: () => set({ error: null }),
}));
