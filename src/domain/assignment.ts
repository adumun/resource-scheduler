import type { ActivityId, AssignmentId, ResourceId, TimeSlotId } from "./ids";

export interface AssignmentResource {
  role: string;
  resourceId: ResourceId;
}

export interface Assignment {
  id: AssignmentId;
  activityId: ActivityId;
  instanceIndex: number;
  slotId: TimeSlotId;
  resources: AssignmentResource[];
}

export function assignedResourceIds(assignment: Assignment): ResourceId[] {
  return assignment.resources.map((r) => r.resourceId);
}

export function assignedByRole(assignment: Assignment, role: string): ResourceId | undefined {
  return assignment.resources.find((r) => r.role === role)?.resourceId;
}
