import { describe, it, expect } from "vitest";
import { solve } from "@/scheduling-engine/solver";
import { optionsForLevel } from "@/domain/problem";
import type { SchedulingProblem } from "@/domain/problem";
import type { ResourceId, ScheduleId } from "@/domain/ids";
import { rid } from "@/domain/ids";

function miniProblem(): SchedulingProblem {
  const slotId = (s: string) => rid(s);
  const slots = [
    { id: slotId("s1"), dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 10 * 60 + 30, label: "Mon 9:00" },
    { id: slotId("s2"), dayOfWeek: 1, startMinutes: 11 * 60, endMinutes: 12 * 60 + 30, label: "Mon 11:00" },
    { id: slotId("s3"), dayOfWeek: 2, startMinutes: 9 * 60, endMinutes: 10 * 60 + 30, label: "Tue 9:00" },
  ];
  const teacher1 = rid<ResourceId>("t1");
  const teacher2 = rid<ResourceId>("t2");
  const room1 = rid<ResourceId>("r1");
  const room2 = rid<ResourceId>("r2");
  return {
    scheduleId: rid<ScheduleId>("sch1"),
    slots: slots as SchedulingProblem["slots"],
    resources: [
      { id: teacher1, name: "T1", kind: "person", roles: ["teacher"], attributes: {}, availability: [], active: true },
      { id: teacher2, name: "T2", kind: "person", roles: ["teacher"], attributes: {}, availability: [], active: true },
      { id: room1, name: "R1", kind: "location", roles: ["room"], attributes: { capacity: 30 }, availability: [], active: true },
      { id: room2, name: "R2", kind: "location", roles: ["room"], attributes: { capacity: 50 }, availability: [], active: true },
    ],
    activities: [
      {
        id: rid("a1"),
        name: "Math",
        kind: "class",
        groupId: "course-A",
        count: 2,
        durationMinutes: 90,
        priority: 1,
        requirements: [
          { role: "teacher", candidateResourceIds: [teacher1] },
          { role: "room", candidateResourceIds: [room1, room2] },
        ],
        attributes: { size: 25 },
        active: true,
      },
      {
        id: rid("a2"),
        name: "Physics",
        kind: "class",
        groupId: "course-B",
        count: 1,
        durationMinutes: 90,
        priority: 1,
        requirements: [
          { role: "teacher", candidateResourceIds: [teacher2] },
          { role: "room", candidateResourceIds: [room1, room2] },
        ],
        attributes: { size: 25 },
        active: true,
      },
    ],
    constraints: [{ id: rid("c1"), type: "resourceCapacity", hard: true, weight: 0 }],
  };
}

describe("solver smoke", () => {
  it("schedules a small problem without hard violations", () => {
    const problem = miniProblem();
    const options = optionsForLevel("fast", { seed: 42, alternativeCount: 1 });
    const result = solve(problem, options)[0]!;
    expect(result).toBeDefined();
    expect(result.assignments.length).toBe(3);
    expect(result.score.hardViolations).toBe(0);
    expect(result.valid).toBe(true);
  });

  it("is deterministic for the same seed", () => {
    const problem = miniProblem();
    const options = optionsForLevel("fast", { seed: 7, alternativeCount: 1 });
    const a = solve(problem, options)[0]!;
    const b = solve(problem, options)[0]!;
    expect(a.assignments.length).toBe(b.assignments.length);
    expect(a.score.value).toBe(b.score.value);
  });
});
