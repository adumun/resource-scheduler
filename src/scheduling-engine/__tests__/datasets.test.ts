import { describe, it, expect } from "vitest";
import { solve } from "@/scheduling-engine/solver";
import { optionsForLevel } from "@/domain/problem";
import { buildAcademicDataset, buildSportsDataset, buildSurgeryDataset } from "@/domain/presets";
import type { SchedulingProblem } from "@/domain/problem";
import type { ScheduleId } from "@/domain/ids";
import { rid } from "@/domain/ids";

function toProblem(data: ReturnType<typeof buildAcademicDataset>): SchedulingProblem {
  return {
    scheduleId: rid<ScheduleId>("sch"),
    slots: data.slots,
    resources: data.resources,
    activities: data.activities,
    constraints: data.constraints,
  };
}

describe("datasets solve", () => {
  it("academic dataset schedules most activities with no hard violations", () => {
    const data = buildAcademicDataset();
    const totalInstances = data.activities.reduce((s, a) => s + a.count, 0);
    const result = solve(toProblem(data), optionsForLevel("balanced", { seed: 1, alternativeCount: 1 }))[0]!;
    expect(result.score.hardViolations).toBe(0);
    expect(result.assignments.length).toBeGreaterThan(totalInstances * 0.8);
    expect(result.valid).toBe(true);
  });

  it("sports dataset schedules matches with no hard violations", () => {
    const data = buildSportsDataset();
    const result = solve(toProblem(data), optionsForLevel("balanced", { seed: 2, alternativeCount: 1 }))[0]!;
    expect(result.score.hardViolations).toBe(0);
    expect(result.assignments.length).toBeGreaterThan(10);
  });

  it("surgery dataset schedules procedures with no hard violations", () => {
    const data = buildSurgeryDataset();
    const result = solve(toProblem(data), optionsForLevel("balanced", { seed: 3, alternativeCount: 1 }))[0]!;
    expect(result.score.hardViolations).toBe(0);
    expect(result.assignments.length).toBeGreaterThan(8);
  });
});
