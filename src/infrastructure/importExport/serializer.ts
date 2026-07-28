import type { Schedule } from "@/domain/schedule";
import { SCHEDULE_SCHEMA_VERSION } from "@/domain/schedule";
import type { Resource } from "@/domain/resource";
import type { Activity } from "@/domain/activity";
import type { Constraint } from "@/domain/constraint";
import type { TimeSlot } from "@/domain/time";

export interface ScheduleExportEnvelope {
  schemaVersion: number;
  exportedAt: string;
  schedule: Schedule;
}

export interface ImportResult {
  ok: boolean;
  schedule?: Schedule;
  errors: string[];
}

export function exportSchedule(schedule: Schedule): string {
  const envelope: ScheduleExportEnvelope = {
    schemaVersion: SCHEDULE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    schedule,
  };
  return JSON.stringify(envelope, null, 2);
}

export function importSchedule(json: string): ImportResult {
  const errors: string[] = [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, errors: ["File is not valid JSON."] };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, errors: ["Root must be an object."] };
  }
  const envelope = parsed as Record<string, unknown>;

  if (typeof envelope["schemaVersion"] !== "number") {
    errors.push("Missing or invalid 'schemaVersion'.");
  } else if (envelope["schemaVersion"] !== SCHEDULE_SCHEMA_VERSION) {
    errors.push(
      `Unsupported schema version ${envelope["schemaVersion"]} (expected ${SCHEDULE_SCHEMA_VERSION}).`,
    );
  }

  if (typeof envelope["schedule"] !== "object" || envelope["schedule"] === null) {
    errors.push("Missing 'schedule' object.");
    return { ok: false, errors };
  }

  const schedule = envelope["schedule"] as Record<string, unknown>;
  validateSchedule(schedule, errors);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, schedule: schedule as unknown as Schedule, errors: [] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSchedule(s: Record<string, unknown>, errors: string[]): void {
  const stringFields = ["id", "name", "description", "ownerId", "preset", "status", "createdAt", "updatedAt"];
  for (const field of stringFields) {
    if (typeof s[field] !== "string") errors.push(`Schedule field '${field}' must be a string.`);
  }
  if (!isObject(s["timeRange"])) {
    errors.push("Schedule 'timeRange' must be an object.");
  } else {
    if (typeof s["timeRange"]!["startDate"] !== "string") errors.push("timeRange.startDate must be a string.");
    if (typeof s["timeRange"]!["endDate"] !== "string") errors.push("timeRange.endDate must be a string.");
  }
  if (!Array.isArray(s["slots"])) errors.push("Schedule 'slots' must be an array.");
  else (s["slots"] as unknown[]).forEach((slot, i) => validateSlot(slot, `slots[${i}]`, errors));

  const resourceIds = new Set<string>();
  if (!Array.isArray(s["resources"])) errors.push("Schedule 'resources' must be an array.");
  else
    (s["resources"] as unknown[]).forEach((r, i) => {
      validateResource(r, `resources[${i}]`, errors);
      if (isObject(r) && typeof r["id"] === "string") resourceIds.add(r["id"] as string);
    });

  const activityIds = new Set<string>();
  if (!Array.isArray(s["activities"])) errors.push("Schedule 'activities' must be an array.");
  else
    (s["activities"] as unknown[]).forEach((a, i) => {
      validateActivity(a, `activities[${i}]`, errors, resourceIds);
      if (isObject(a) && typeof a["id"] === "string") activityIds.add(a["id"] as string);
    });

  if (!Array.isArray(s["constraints"])) errors.push("Schedule 'constraints' must be an array.");
  else
    (s["constraints"] as unknown[]).forEach((c, i) =>
      validateConstraint(c, `constraints[${i}]`, errors, resourceIds, activityIds),
    );

  if (s["solutions"] !== undefined && !Array.isArray(s["solutions"]))
    errors.push("Schedule 'solutions' must be an array if present.");
}

function validateSlot(slot: unknown, path: string, errors: string[]): void {
  if (!isObject(slot)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  if (typeof slot["id"] !== "string") errors.push(`${path}.id must be a string.`);
  if (typeof slot["startMinutes"] !== "number") errors.push(`${path}.startMinutes must be a number.`);
  if (typeof slot["endMinutes"] !== "number") errors.push(`${path}.endMinutes must be a number.`);
  if (typeof slot["startMinutes"] === "number" && typeof slot["endMinutes"] === "number") {
    if ((slot["startMinutes"] as number) >= (slot["endMinutes"] as number))
      errors.push(`${path} has startMinutes >= endMinutes.`);
  }
}

function validateResource(r: unknown, path: string, errors: string[]): void {
  if (!isObject(r)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  if (typeof r["id"] !== "string") errors.push(`${path}.id must be a string.`);
  if (typeof r["name"] !== "string") errors.push(`${path}.name must be a string.`);
  if (typeof r["kind"] !== "string") errors.push(`${path}.kind must be a string.`);
  if (!Array.isArray(r["roles"])) errors.push(`${path}.roles must be an array.`);
  if (!Array.isArray(r["availability"])) errors.push(`${path}.availability must be an array.`);
  if (typeof r["active"] !== "boolean") errors.push(`${path}.active must be a boolean.`);
  if (!isObject(r["attributes"])) errors.push(`${path}.attributes must be an object.`);
}

function validateActivity(
  a: unknown,
  path: string,
  errors: string[],
  resourceIds: Set<string>,
): void {
  if (!isObject(a)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  if (typeof a["id"] !== "string") errors.push(`${path}.id must be a string.`);
  if (typeof a["name"] !== "string") errors.push(`${path}.name must be a string.`);
  if (typeof a["count"] !== "number" || (a["count"] as number) < 1)
    errors.push(`${path}.count must be a positive number.`);
  if (typeof a["durationMinutes"] !== "number" || (a["durationMinutes"] as number) <= 0)
    errors.push(`${path}.durationMinutes must be a positive number.`);
  if (typeof a["active"] !== "boolean") errors.push(`${path}.active must be a boolean.`);
  if (!Array.isArray(a["requirements"])) errors.push(`${path}.requirements must be an array.`);
  else
    (a["requirements"] as unknown[]).forEach((req, i) => {
      if (!isObject(req)) {
        errors.push(`${path}.requirements[${i}] must be an object.`);
        return;
      }
      if (typeof req!["role"] !== "string") errors.push(`${path}.requirements[${i}].role must be a string.`);
      if (!Array.isArray(req!["candidateResourceIds"]))
        errors.push(`${path}.requirements[${i}].candidateResourceIds must be an array.`);
      else
        (req!["candidateResourceIds"] as unknown[]).forEach((rid, j) => {
          if (typeof rid !== "string") {
            errors.push(`${path}.requirements[${i}].candidateResourceIds[${j}] must be a string.`);
          } else if (!resourceIds.has(rid as string)) {
            errors.push(`${path}.requirements[${i}].candidateResourceIds[${j}] references unknown resource.`);
          }
        });
    });
  if (!isObject(a["attributes"])) errors.push(`${path}.attributes must be an object.`);
}

function validateConstraint(
  c: unknown,
  path: string,
  errors: string[],
  resourceIds: Set<string>,
  activityIds: Set<string>,
): void {
  if (!isObject(c)) {
    errors.push(`${path} must be an object.`);
    return;
  }
  if (typeof c["id"] !== "string") errors.push(`${path}.id must be a string.`);
  if (typeof c["type"] !== "string") errors.push(`${path}.type must be a string.`);
  if (typeof c["hard"] !== "boolean") errors.push(`${path}.hard must be a boolean.`);
  if (typeof c["weight"] !== "number") errors.push(`${path}.weight must be a number.`);
  if (typeof c["resourceId"] === "string" && !resourceIds.has(c["resourceId"] as string))
    errors.push(`${path}.resourceId references unknown resource.`);
  if (typeof c["activityId"] === "string" && !activityIds.has(c["activityId"] as string))
    errors.push(`${path}.activityId references unknown activity.`);
  if (typeof c["refId"] === "string") {
    const scope = c["scope"];
    if (scope === "resource" && !resourceIds.has(c["refId"] as string))
      errors.push(`${path}.refId references unknown resource.`);
    if (scope === "activity" && !activityIds.has(c["refId"] as string))
      errors.push(`${path}.refId references unknown activity.`);
  }
}

export type { Resource, Activity, Constraint, TimeSlot };
