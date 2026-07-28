import type { ActivityId, ConstraintId, ResourceId } from "./ids";

export type ConstraintType =
  | "blockedSlot"
  | "maxActivitiesPerDay"
  | "minSeparation"
  | "preferredTime"
  | "preferredResource"
  | "uniformDistribution"
  | "noGroupOverlap"
  | "resourceCapacity"
  | "equipmentCompatibility";

interface ConstraintBase {
  id: ConstraintId;
  hard: boolean;
  /** Soft weight 1..100. Ignored when hard. */
  weight: number;
  name?: string;
}

export type Constraint =
  | (ConstraintBase & {
      type: "blockedSlot";
      resourceId?: ResourceId;
      slotIds: string[];
    })
  | (ConstraintBase & {
      type: "maxActivitiesPerDay";
      scope: "resource" | "group";
      refId: string;
      max: number;
    })
  | (ConstraintBase & {
      type: "minSeparation";
      scope: "resource" | "group";
      refId: string;
      minutes: number;
    })
  | (ConstraintBase & {
      type: "preferredTime";
      scope: "resource" | "activity";
      refId: string;
      fromMinutes: number;
      toMinutes: number;
    })
  | (ConstraintBase & {
      type: "preferredResource";
      activityId: ActivityId;
      role: string;
      resourceId: ResourceId;
    })
  | (ConstraintBase & {
      type: "uniformDistribution";
      groupId: string;
    })
  | (ConstraintBase & {
      type: "noGroupOverlap";
      groupId: string;
    })
  | (ConstraintBase & {
      type: "resourceCapacity";
    })
  | (ConstraintBase & {
      type: "equipmentCompatibility";
    });

export function constraintTypeLabel(type: ConstraintType): string {
  const labels: Record<ConstraintType, string> = {
    blockedSlot: "Blocked slot",
    maxActivitiesPerDay: "Max activities per day",
    minSeparation: "Minimum separation",
    preferredTime: "Preferred time",
    preferredResource: "Preferred resource",
    uniformDistribution: "Uniform distribution",
    noGroupOverlap: "No group overlap",
    resourceCapacity: "Resource capacity",
    equipmentCompatibility: "Equipment compatibility",
  };
  return labels[type];
}
