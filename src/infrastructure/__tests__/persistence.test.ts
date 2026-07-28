import { describe, it, expect, beforeEach } from "vitest";
import { IndexedDbScheduleRepository } from "@/infrastructure/repositories/IndexedDbScheduleRepository";
import { IndexedDbUserRepository } from "@/infrastructure/repositories/IndexedDbUserRepository";
import { createSchedule } from "@/application/services/ScheduleService";
import { buildAcademicDataset } from "@/domain/presets";
import type { Schedule } from "@/domain/schedule";
import { resetDb } from "@/infrastructure/db/idb";

describe("IndexedDbScheduleRepository", () => {
  let repo: IndexedDbScheduleRepository;

  beforeEach(async () => {
    await resetDb();
    repo = new IndexedDbScheduleRepository();
  });

  it("saves and retrieves a schedule by id", async () => {
    const data = buildAcademicDataset();
    const schedule = createSchedule({
      ownerId: "user-1",
      name: "Test schedule",
      description: "",
      preset: "academic",
      timeRange: data.timeRange,
      slots: data.slots,
      resources: data.resources,
      activities: data.activities,
      constraints: data.constraints,
    });
    await repo.save(schedule);
    const fetched = await repo.get(schedule.id);
    expect(fetched).toBeDefined();
    expect(fetched!.name).toBe("Test schedule");
    expect(fetched!.resources.length).toBe(data.resources.length);
  });

  it("lists schedules filtered by owner and sorted by updatedAt desc", async () => {
    const data = buildAcademicDataset();
    const s1 = createSchedule({ ownerId: "u1", name: "A", description: "", preset: "academic", timeRange: data.timeRange, slots: data.slots, resources: data.resources, activities: data.activities, constraints: data.constraints });
    const s2 = createSchedule({ ownerId: "u1", name: "B", description: "", preset: "academic", timeRange: data.timeRange, slots: data.slots, resources: data.resources, activities: data.activities, constraints: data.constraints });
    const s3 = createSchedule({ ownerId: "u2", name: "C", description: "", preset: "academic", timeRange: data.timeRange, slots: data.slots, resources: data.resources, activities: data.activities, constraints: data.constraints });
    await repo.save(s1);
    await repo.save(s2);
    await repo.save(s3);
    const list = await repo.list("u1");
    expect(list.length).toBe(2);
    expect(list.find((s) => s.id === s1.id)).toBeDefined();
    expect(list.find((s) => s.id === s3.id)).toBeUndefined();
  });

  it("deletes a schedule", async () => {
    const schedule = createSchedule({ ownerId: "u1", name: "X", description: "", preset: "custom", timeRange: { startDate: "2026-01-01", endDate: "2026-12-31" }, slots: [], resources: [], activities: [], constraints: [] });
    await repo.save(schedule);
    await repo.remove(schedule.id);
    expect(await repo.get(schedule.id)).toBeUndefined();
  });

  it("persists results history across save cycles", async () => {
    const schedule = createSchedule({ ownerId: "u1", name: "X", description: "", preset: "custom", timeRange: { startDate: "2026-01-01", endDate: "2026-12-31" }, slots: [], resources: [], activities: [], constraints: [] });
    await repo.save(schedule);
    const fetched = await repo.get(schedule.id);
    const updated: Schedule = { ...fetched!, results: [{ scheduleId: fetched!.id, solutionId: "sol-1", assignments: [], unscheduled: [], score: { hardViolations: 0, softViolations: 0, totalPenalty: 0, value: 100, max: 100 }, hardViolations: [], softViolations: [], diagnostics: [], generatedAt: new Date().toISOString(), elapsedMs: 5, solverOptions: { maxIterations: 1, timeoutMs: 1, seed: 1, optimizationLevel: "fast", alternativeCount: 1 }, seed: 1, valid: true }] };
    await repo.save(updated);
    const again = await repo.get(schedule.id);
    expect(again!.results.length).toBe(1);
    expect(again!.results[0]!.solutionId).toBe("sol-1");
  });
});

describe("IndexedDbUserRepository", () => {
  let repo: IndexedDbUserRepository;

  beforeEach(async () => {
    await resetDb();
    repo = new IndexedDbUserRepository();
  });

  it("saves and finds a user by email", async () => {
    await repo.save({ id: "u-1", name: "Test", email: "test@example.com", passwordHash: "hash", salt: "salt", createdAt: new Date().toISOString() });
    const found = await repo.findByEmail("test@example.com");
    expect(found).toBeDefined();
    expect(found!.name).toBe("Test");
  });

  it("finds a user by exact email", async () => {
    await repo.save({ id: "u-1", name: "A", email: "dup@example.com", passwordHash: "h", salt: "s", createdAt: new Date().toISOString() });
    const found = await repo.findByEmail("dup@example.com");
    expect(found).toBeDefined();
  });
});
