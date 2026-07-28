import type { ActivityId, ResourceId, TimeSlotId } from "./ids";

export interface ActivityRequirement {
  /** Role name, e.g. "teacher", "room", "referee", "surgeon". */
  role: string;
  /** Resources that can fulfill this role for this activity. */
  candidateResourceIds: ResourceId[];
  /** When false, the same resource may be reused across instances of the activity. */
  uniquePerInstance?: boolean;
}

export interface Activity {
  id: ActivityId;
  name: string;
  kind: string;
  /** Group id used for "no overlap within group" rules (e.g. a course id). */
  groupId?: string;
  /** Number of instances to schedule (e.g. weekly classes). */
  count: number;
  durationMinutes: number;
  requirements: ActivityRequirement[];
  /** If set, only these slots are eligible for this activity. */
  allowedSlotIds?: TimeSlotId[];
  attributes: Record<string, unknown>;
  active: boolean;
  priority: number;
}

export function activitySize(activity: Activity): number | undefined {
  const value = activity.attributes["size"];
  return typeof value === "number" ? value : undefined;
}

export function activityRequiredEquipment(activity: Activity): string[] {
  const value = activity.attributes["requiredEquipment"];
  return Array.isArray(value) ? (value as string[]) : [];
}

export type { ActivityId, ResourceId };
