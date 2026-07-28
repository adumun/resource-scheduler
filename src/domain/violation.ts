import type { ConstraintType } from "./constraint";
import type { AssignmentId, ResourceId, TimeSlotId } from "./ids";

export interface Violation {
  id: string;
  kind: "hard" | "soft";
  constraintId?: string;
  constraintType?: ConstraintType;
  description: string;
  assignmentIds: AssignmentId[];
  resourceIds: ResourceId[];
  slotIds: TimeSlotId[];
  /** Soft penalty points (0..100 scale contribution). */
  penalty?: number;
}

export interface Conflict {
  id: string;
  description: string;
  assignmentIds: AssignmentId[];
  resourceIds: ResourceId[];
  slotIds: TimeSlotId[];
  constraintType?: ConstraintType;
  severity: "hard" | "soft";
  alternatives?: string[];
}
