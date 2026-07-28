export type ResourceId = string & { readonly __brand: "ResourceId" };
export type ActivityId = string & { readonly __brand: "ActivityId" };
export type TimeSlotId = string & { readonly __brand: "TimeSlotId" };
export type ScheduleId = string & { readonly __brand: "ScheduleId" };
export type ConstraintId = string & { readonly __brand: "ConstraintId" };
export type AssignmentId = string & { readonly __brand: "AssignmentId" };
export type SolutionId = string & { readonly __brand: "SolutionId" };
export type UserId = string & { readonly __brand: "UserId" };

export function rid<T extends string>(value: string): T {
  return value as T;
}

let counter = 0;
export function createId(prefix: string): string {
  counter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}_${counter.toString(36)}_${random}`;
}

export const id = {
  resource: () => rid<ResourceId>(createId("res")),
  activity: () => rid<ActivityId>(createId("act")),
  slot: () => rid<TimeSlotId>(createId("slot")),
  schedule: () => rid<ScheduleId>(createId("sch")),
  constraint: () => rid<ConstraintId>(createId("cstr")),
  assignment: () => rid<AssignmentId>(createId("asg")),
  solution: () => rid<SolutionId>(createId("sol")),
  user: () => rid<UserId>(createId("usr")),
};
