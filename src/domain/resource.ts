import type { ResourceId } from "./ids";
import type { AvailabilityInterval } from "./availability";

export type ResourceKind = "person" | "location" | "equipment" | "custom";

export interface Resource {
  id: ResourceId;
  name: string;
  kind: ResourceKind;
  /** Roles this resource can fulfill, e.g. ["teacher"], ["room"], ["surgeon","anesthesiologist"]. */
  roles: string[];
  /** Free-form attributes: capacity (rooms), skills, equipment list, etc. */
  attributes: Record<string, unknown>;
  availability: AvailabilityInterval[];
  active: boolean;
  color?: string;
}

export function resourceCapacity(resource: Resource): number | undefined {
  const value = resource.attributes["capacity"];
  return typeof value === "number" ? value : undefined;
}

export function resourceEquipment(resource: Resource): string[] {
  const value = resource.attributes["equipment"];
  return Array.isArray(value) ? (value as string[]) : [];
}
