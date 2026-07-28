import type { SchedulingProblem } from "@/domain/problem";
import type { TimeSlot } from "@/domain/time";
import type { TimeSlotId, ResourceId } from "@/domain/ids";
import type { Placement, Instance } from "./types";

export interface HardRules {
  maxPerDayResource: Map<ResourceId, number>;
  maxPerDayGroup: Map<string, number>;
  minSepResource: Map<ResourceId, number>;
  minSepGroup: Map<string, number>;
  noOverlapGroups: Set<string>;
}

export function buildHardRules(problem: SchedulingProblem): HardRules {
  const maxPerDayResource = new Map<ResourceId, number>();
  const maxPerDayGroup = new Map<string, number>();
  const minSepResource = new Map<ResourceId, number>();
  const minSepGroup = new Map<string, number>();
  const noOverlapGroups = new Set<string>();
  for (const c of problem.constraints) {
    if (c.hard) {
      if (c.type === "maxActivitiesPerDay") {
        if (c.scope === "resource") maxPerDayResource.set(c.refId as ResourceId, c.max);
        else maxPerDayGroup.set(c.refId, c.max);
      } else if (c.type === "minSeparation") {
        if (c.scope === "resource") minSepResource.set(c.refId as ResourceId, c.minutes);
        else minSepGroup.set(c.refId, c.minutes);
      } else if (c.type === "noGroupOverlap") {
        noOverlapGroups.add(c.groupId);
      }
    }
  }
  return { maxPerDayResource, maxPerDayGroup, minSepResource, minSepGroup, noOverlapGroups };
}

export interface UsageEntry {
  instanceOrder: number;
  slotId: TimeSlotId;
  dayKey: string;
  start: number;
  end: number;
  resourceIds: ResourceId[];
  groupId?: string;
}

export class UsageIndex {
  byResource = new Map<ResourceId, UsageEntry[]>();
  byGroup = new Map<string, UsageEntry[]>();

  add(entry: UsageEntry): void {
    for (const rid of entry.resourceIds) {
      const list = this.byResource.get(rid) ?? [];
      list.push(entry);
      this.byResource.set(rid, list);
    }
    if (entry.groupId !== undefined && entry.groupId !== "") {
      const list = this.byGroup.get(entry.groupId) ?? [];
      list.push(entry);
      this.byGroup.set(entry.groupId, list);
    }
  }

  remove(instanceOrder: number): void {
    for (const [rid, list] of this.byResource) {
      const filtered = list.filter((e) => e.instanceOrder !== instanceOrder);
      if (filtered.length === 0) this.byResource.delete(rid);
      else this.byResource.set(rid, filtered);
    }
    for (const [gid, list] of this.byGroup) {
      const filtered = list.filter((e) => e.instanceOrder !== instanceOrder);
      if (filtered.length === 0) this.byGroup.delete(gid);
      else this.byGroup.set(gid, filtered);
    }
  }
}

function dayKeyOf(slot: TimeSlot): string {
  if (slot.date !== undefined) return `date:${slot.date}`;
  if (slot.dayOfWeek !== undefined) return `dow:${slot.dayOfWeek}`;
  return "any";
}

export interface PlacementCheck {
  ok: boolean;
  reason?: string;
}

export function checkPlacement(
  index: UsageIndex,
  rules: HardRules,
  slot: TimeSlot,
  placement: Placement,
  instance: Instance,
  _instanceOrder: number,
): PlacementCheck {
  const dayKey = dayKeyOf(slot);
  const resourceIds = placement.resources.map((r) => r.resourceId);

  for (const resourceId of resourceIds) {
    const entries = index.byResource.get(resourceId);
    if (entries !== undefined) {
      let perDay = 0;
      for (const e of entries) {
        if (e.dayKey === dayKey) {
          perDay += 1;
          if (e.start < slot.endMinutes && slot.startMinutes < e.end) {
            return { ok: false, reason: `Resource ${resourceId} double-booked at ${dayKey}` };
          }
        }
      }
      const max = rules.maxPerDayResource.get(resourceId);
      if (max !== undefined && perDay >= max) {
        return { ok: false, reason: `Resource ${resourceId} exceeds max ${max} per day` };
      }
      const sep = rules.minSepResource.get(resourceId);
      if (sep !== undefined) {
        for (const e of entries) {
          if (e.dayKey === dayKey) {
            const gap = e.start >= slot.endMinutes ? e.start - slot.endMinutes : slot.startMinutes - e.end;
            if (gap < sep) {
              return { ok: false, reason: `Resource ${resourceId} min separation ${sep} violated` };
            }
          }
        }
      }
    }
  }

  if (instance.groupId !== undefined && instance.groupId !== "") {
    const entries = index.byGroup.get(instance.groupId);
    if (entries !== undefined) {
      let perDay = 0;
      for (const e of entries) {
        if (e.dayKey === dayKey) {
          perDay += 1;
          if (e.start < slot.endMinutes && slot.startMinutes < e.end) {
            return { ok: false, reason: `Group ${instance.groupId} overlap at ${dayKey}` };
          }
        }
      }
      const max = rules.maxPerDayGroup.get(instance.groupId);
      if (max !== undefined && perDay >= max) {
        return { ok: false, reason: `Group ${instance.groupId} exceeds max ${max} per day` };
      }
      const sep = rules.minSepGroup.get(instance.groupId);
      if (sep !== undefined) {
        for (const e of entries) {
          if (e.dayKey === dayKey) {
            const gap = e.start >= slot.endMinutes ? e.start - slot.endMinutes : slot.startMinutes - e.end;
            if (gap < sep) {
              return { ok: false, reason: `Group ${instance.groupId} min separation ${sep} violated` };
            }
          }
        }
      }
    }
  }

  return { ok: true };
}

export function entryFor(
  instance: Instance,
  instanceOrder: number,
  slot: TimeSlot,
  placement: Placement,
): UsageEntry {
  return {
    instanceOrder,
    slotId: slot.id,
    dayKey: dayKeyOf(slot),
    start: slot.startMinutes,
    end: slot.endMinutes,
    resourceIds: placement.resources.map((r) => r.resourceId),
    groupId: instance.groupId,
  };
}
