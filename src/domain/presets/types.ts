import type { SchedulePreset } from "@/domain/schedule";
import type { TimeRange, TimeSlot } from "@/domain/time";
import type { Resource } from "@/domain/resource";
import type { Activity } from "@/domain/activity";
import type { Constraint } from "@/domain/constraint";

export interface PresetData {
  name: string;
  description: string;
  preset: SchedulePreset;
  timeRange: TimeRange;
  slots: TimeSlot[];
  resources: Resource[];
  activities: Activity[];
  constraints: Constraint[];
}
