import { describe, it, expect } from "vitest";
import { exportSchedule, importSchedule } from "@/infrastructure/importExport/serializer";
import { createSchedule } from "@/application/services/ScheduleService";
import { buildAcademicDataset } from "@/domain/presets";
import { SCHEDULE_SCHEMA_VERSION } from "@/domain/schedule";
import type { Schedule } from "@/domain/schedule";

function sampleSchedule(): Schedule {
  const data = buildAcademicDataset();
  return createSchedule({
    ownerId: "u1",
    name: "Sample",
    description: "desc",
    preset: "academic",
    timeRange: data.timeRange,
    slots: data.slots,
    resources: data.resources,
    activities: data.activities,
    constraints: data.constraints,
  });
}

describe("import/export", () => {
  it("round-trips a valid schedule", () => {
    const schedule = sampleSchedule();
    const json = exportSchedule(schedule);
    const result = importSchedule(json);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.schedule!.name).toBe("Sample");
    expect(result.schedule!.resources.length).toBe(schedule.resources.length);
  });

  it("rejects invalid JSON", () => {
    const result = importSchedule("{not json");
    expect(result.ok).toBe(false);
    expect(result.errors[0]).toMatch(/not valid JSON/);
  });

  it("rejects unsupported schema version", () => {
    const schedule = sampleSchedule();
    const json = JSON.stringify({ schemaVersion: 999, exportedAt: "x", schedule });
    const result = importSchedule(json);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("Unsupported schema version"))).toBe(true);
  });

  it("rejects missing required fields", () => {
    const result = importSchedule(JSON.stringify({ schemaVersion: SCHEDULE_SCHEMA_VERSION, schedule: { id: "x" } }));
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects dangling resource references in requirements", () => {
    const schedule = sampleSchedule();
    const broken = {
      ...schedule,
      activities: schedule.activities.map((a, i) =>
        i === 0 ? { ...a, requirements: a.requirements.map((r) => ({ ...r, candidateResourceIds: ["nope"] })) } : a,
      ),
    };
    const json = JSON.stringify({ schemaVersion: SCHEDULE_SCHEMA_VERSION, exportedAt: "x", schedule: broken });
    const result = importSchedule(json);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("unknown resource"))).toBe(true);
  });

  it("rejects non-object root", () => {
    const result = importSchedule(JSON.stringify([1, 2, 3]));
    expect(result.ok).toBe(false);
  });
});
