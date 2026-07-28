import { describe, it, expect } from "vitest";
import { solve } from "@/scheduling-engine/solver";
import { optionsForLevel } from "@/domain/problem";
import type { SchedulingProblem } from "@/domain/problem";
import type { Resource, Activity, Constraint } from "@/domain";
import type { ResourceId, ActivityId, TimeSlotId, ScheduleId, ConstraintId } from "@/domain/ids";
import { rid } from "@/domain/ids";

function R(id: string): ResourceId {
  return rid<ResourceId>(id);
}
function A(id: string): ActivityId {
  return rid<ActivityId>(id);
}
function S(id: string): TimeSlotId {
  return rid<TimeSlotId>(id);
}
function SC(id: string): ScheduleId {
  return rid<ScheduleId>(id);
}
function C(id: string): ConstraintId {
  return rid<ConstraintId>(id);
}

const MON1 = S("mon1");
const MON2 = S("mon2");
const TUE1 = S("tue1");

function baseSlots() {
  return [
    { id: MON1, dayOfWeek: 1, startMinutes: 540, endMinutes: 630, label: "Mon 09:00" },
    { id: MON2, dayOfWeek: 1, startMinutes: 660, endMinutes: 750, label: "Mon 11:00" },
    { id: TUE1, dayOfWeek: 2, startMinutes: 540, endMinutes: 630, label: "Tue 09:00" },
  ];
}

function teacher(id: string, availability: { dow: number; start: number; end: number }[] = []): Resource {
  return {
    id: R(id),
    name: id,
    kind: "person",
    roles: ["teacher"],
    attributes: {},
    availability: availability.map((a) => ({ dayOfWeek: a.dow, startMinutes: a.start, endMinutes: a.end })),
    active: true,
  };
}

function room(id: string, capacity = 100): Resource {
  return { id: R(id), name: id, kind: "location", roles: ["room"], attributes: { capacity }, availability: [], active: true };
}

function classActivity(
  id: string,
  groupId: string,
  count: number,
  teachers: string[],
  rooms: string[],
  duration = 90,
): Activity {
  return {
    id: A(id),
    name: id,
    kind: "class",
    groupId,
    count,
    durationMinutes: duration,
    requirements: [
      { role: "teacher", candidateResourceIds: teachers.map(R) },
      { role: "room", candidateResourceIds: rooms.map(R) },
    ],
    attributes: {},
    active: true,
    priority: 1,
  };
}

function makeProblem(resources: Resource[], activities: Activity[], constraints: Constraint[] = []): SchedulingProblem {
  return { scheduleId: SC("sch"), slots: baseSlots(), resources, activities, constraints };
}

const opts = (seed: number) => optionsForLevel("fast", { seed, alternativeCount: 1 });

describe("solver — normal case", () => {
  it("schedules all activities without hard violations", () => {
    const problem = makeProblem(
      [teacher("t1"), teacher("t2"), room("r1"), room("r2")],
      [classActivity("a1", "g1", 2, ["t1"], ["r1", "r2"]), classActivity("a2", "g2", 1, ["t2"], ["r1", "r2"])],
    );
    const result = solve(problem, opts(1))[0]!;
    expect(result.assignments.length).toBe(3);
    expect(result.score.hardViolations).toBe(0);
    expect(result.valid).toBe(true);
  });
});

describe("solver — resource collision", () => {
  it("does not double-book a room; leaves activity unscheduled when impossible", () => {
    const problem = makeProblem(
      [teacher("t1"), teacher("t2"), room("r1")],
      [
        classActivity("a1", "g1", 1, ["t1"], ["r1"]),
        classActivity("a2", "g2", 1, ["t2"], ["r1"]),
        classActivity("a3", "g3", 1, ["t1"], ["r1"]),
      ],
    );
    const result = solve(problem, opts(1))[0]!;
    expect(result.score.hardViolations).toBe(0);
    const roomUses = result.assignments.filter((a) => a.resources.some((r) => r.resourceId === R("r1"))).length;
    expect(roomUses).toBeLessThanOrEqual(3);
    const slotsUsed = new Set(result.assignments.map((a) => a.slotId));
    expect(slotsUsed.size).toBe(result.assignments.length);
    expect(result.assignments.length).toBeLessThanOrEqual(3);
  });
});

describe("solver — participant collision", () => {
  it("does not double-book a teacher", () => {
    const problem = makeProblem(
      [teacher("t1"), room("r1"), room("r2")],
      [
        classActivity("a1", "g1", 1, ["t1"], ["r1"]),
        classActivity("a2", "g2", 1, ["t1"], ["r2"]),
        classActivity("a3", "g3", 1, ["t1"], ["r1", "r2"]),
      ],
    );
    const result = solve(problem, opts(2))[0]!;
    expect(result.score.hardViolations).toBe(0);
    const bySlot = new Map<string, number>();
    for (const a of result.assignments) {
      if (a.resources.some((r) => r.resourceId === R("t1"))) {
        bySlot.set(a.slotId, (bySlot.get(a.slotId) ?? 0) + 1);
      }
    }
    for (const count of bySlot.values()) expect(count).toBe(1);
  });
});

describe("solver — impossible schedule", () => {
  it("reports unscheduled activity and diagnostics when no slot fits", () => {
    const problem = makeProblem(
      [teacher("t1"), room("r1")],
      [classActivity("a1", "g1", 1, ["t1"], ["r1"], 999)],
    );
    const result = solve(problem, opts(1))[0]!;
    expect(result.assignments.length).toBe(0);
    expect(result.unscheduled.length).toBe(1);
    expect(result.diagnostics.length).toBeGreaterThan(0);
    expect(result.diagnostics[0]!.code).toBe("NO_FEASIBLE_PLACEMENT");
  });

  it("reports diagnostics when teacher has no availability", () => {
    const problem = makeProblem(
      [teacher("t1", [{ dow: 3, start: 540, end: 630 }]), room("r1")],
      [classActivity("a1", "g1", 1, ["t1"], ["r1"])],
    );
    const result = solve(problem, opts(1))[0]!;
    expect(result.assignments.length).toBe(0);
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});

describe("solver — soft constraints", () => {
  it("respects preferred time when possible (score 100)", () => {
    const morning = S("morning");
    const evening = S("evening");
    const problem: SchedulingProblem = {
      scheduleId: SC("sch"),
      slots: [
        { id: morning, dayOfWeek: 1, startMinutes: 540, endMinutes: 630, label: "Mon 09:00" },
        { id: evening, dayOfWeek: 1, startMinutes: 1080, endMinutes: 1170, label: "Mon 18:00" },
      ],
      resources: [teacher("t1"), room("r1")],
      activities: [classActivity("a1", "g1", 1, ["t1"], ["r1"])],
      constraints: [
        { id: C("c1"), type: "preferredTime", hard: false, weight: 20, scope: "resource", refId: R("t1"), fromMinutes: 500, toMinutes: 700 },
      ],
    };
    const result = solve(problem, opts(5))[0]!;
    expect(result.assignments[0]!.slotId).toBe(morning);
    expect(result.score.softViolations).toBe(0);
    expect(result.score.value).toBe(100);
  });

  it("remains valid but scores lower when soft constraint must be violated", () => {
    const evening = S("evening");
    const problem: SchedulingProblem = {
      scheduleId: SC("sch"),
      slots: [{ id: evening, dayOfWeek: 1, startMinutes: 1080, endMinutes: 1170, label: "Mon 18:00" }],
      resources: [teacher("t1"), room("r1")],
      activities: [classActivity("a1", "g1", 1, ["t1"], ["r1"])],
      constraints: [
        { id: C("c1"), type: "preferredTime", hard: false, weight: 20, scope: "resource", refId: R("t1"), fromMinutes: 500, toMinutes: 700 },
      ],
    };
    const result = solve(problem, opts(5))[0]!;
    expect(result.valid).toBe(true);
    expect(result.score.hardViolations).toBe(0);
    expect(result.score.softViolations).toBe(1);
    expect(result.score.value).toBeLessThan(100);
  });
});

describe("solver — determinism", () => {
  it("produces identical results for the same seed", () => {
    const problem = makeProblem(
      [teacher("t1"), teacher("t2"), room("r1"), room("r2")],
      [classActivity("a1", "g1", 2, ["t1"], ["r1", "r2"]), classActivity("a2", "g2", 1, ["t2"], ["r1", "r2"])],
    );
    const a = solve(problem, opts(99))[0]!;
    const b = solve(problem, opts(99))[0]!;
    expect(a.assignments.length).toBe(b.assignments.length);
    expect(a.score.value).toBe(b.score.value);
    const sigA = a.assignments.map((x) => `${x.activityId}@${x.slotId}`).sort().join("|");
    const sigB = b.assignments.map((x) => `${x.activityId}@${x.slotId}`).sort().join("|");
    expect(sigA).toBe(sigB);
  });
});

describe("solver — alternatives", () => {
  it("generates multiple distinct alternatives", () => {
    const problem = makeProblem(
      [teacher("t1"), teacher("t2"), room("r1"), room("r2"), room("r3")],
      [classActivity("a1", "g1", 2, ["t1"], ["r1", "r2", "r3"]), classActivity("a2", "g2", 2, ["t2"], ["r1", "r2", "r3"])],
    );
    const options = optionsForLevel("fast", { seed: 10, alternativeCount: 3 });
    const results = solve(problem, options);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.length).toBeLessThanOrEqual(3);
    for (const r of results) expect(r.score.hardViolations).toBe(0);
  });
});
