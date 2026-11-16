import { useState } from "react";
import type { Constraint, ConstraintType } from "@/domain/constraint";
import type { Resource } from "@/domain/resource";
import type { Activity } from "@/domain/activity";
import type { TimeSlot } from "@/domain/time";
import { id, rid } from "@/domain/ids";
import type { ConstraintId, ResourceId, ActivityId } from "@/domain/ids";
import { Button, Input, Select, Modal, Field, Checkbox, Table, Badge } from "@/presentation/components/ui";
import type { Column } from "@/presentation/components/ui";
import { constraintTypeLabel } from "@/domain/constraint";
import { Plus, Trash2, Pencil } from "lucide-react";
import { minutesToHHMM, labelToMinutesSafe } from "./timeUtils";

const TYPES: ConstraintType[] = [
  "blockedSlot",
  "maxActivitiesPerDay",
  "minSeparation",
  "preferredTime",
  "preferredResource",
  "uniformDistribution",
  "noGroupOverlap",
  "resourceCapacity",
  "equipmentCompatibility",
];

interface Draft {
  id?: string;
  type: ConstraintType;
  hard: boolean;
  weight: number;
  name: string;
  resourceId: string;
  activityId: string;
  role: string;
  scope: "resource" | "group" | "activity";
  refId: string;
  max: number;
  minutes: number;
  fromMinutes: number;
  toMinutes: number;
  groupId: string;
  slotIds: string[];
}

function toDraft(c: Constraint): Draft {
  const base: Draft = {
    id: c.id,
    type: c.type,
    hard: c.hard,
    weight: c.weight,
    name: c.name ?? "",
    resourceId: "",
    activityId: "",
    role: "",
    scope: "resource",
    refId: "",
    max: 2,
    minutes: 60,
    fromMinutes: 510,
    toMinutes: 810,
    groupId: "",
    slotIds: [],
  };
  switch (c.type) {
    case "blockedSlot":
      base.resourceId = c.resourceId ?? "";
      base.slotIds = c.slotIds;
      break;
    case "maxActivitiesPerDay":
      base.scope = c.scope;
      base.refId = c.refId;
      base.max = c.max;
      break;
    case "minSeparation":
      base.scope = c.scope;
      base.refId = c.refId;
      base.minutes = c.minutes;
      break;
    case "preferredTime":
      base.scope = c.scope;
      base.refId = c.refId;
      base.fromMinutes = c.fromMinutes;
      base.toMinutes = c.toMinutes;
      break;
    case "preferredResource":
      base.activityId = c.activityId;
      base.role = c.role;
      base.resourceId = c.resourceId;
      break;
    case "uniformDistribution":
      base.groupId = c.groupId;
      break;
    case "noGroupOverlap":
      base.groupId = c.groupId;
      break;
    default:
      break;
  }
  return base;
}

function fromDraft(d: Draft): Constraint {
  const cid = d.id ? rid<ConstraintId>(d.id) : id.constraint();
  const common = { id: cid, hard: d.hard, weight: d.weight, name: d.name || undefined };
  switch (d.type) {
    case "blockedSlot":
      return { ...common, type: "blockedSlot", resourceId: d.resourceId ? rid<ResourceId>(d.resourceId) : undefined, slotIds: d.slotIds };
    case "maxActivitiesPerDay":
      return { ...common, type: "maxActivitiesPerDay", scope: d.scope === "activity" ? "resource" : d.scope, refId: d.refId, max: d.max };
    case "minSeparation":
      return { ...common, type: "minSeparation", scope: d.scope === "activity" ? "resource" : d.scope, refId: d.refId, minutes: d.minutes };
    case "preferredTime":
      return { ...common, type: "preferredTime", scope: d.scope === "group" ? "resource" : d.scope, refId: d.refId, fromMinutes: d.fromMinutes, toMinutes: d.toMinutes };
    case "preferredResource":
      return { ...common, type: "preferredResource", activityId: rid<ActivityId>(d.activityId), role: d.role, resourceId: rid<ResourceId>(d.resourceId) };
    case "uniformDistribution":
      return { ...common, type: "uniformDistribution", groupId: d.groupId };
    case "noGroupOverlap":
      return { ...common, type: "noGroupOverlap", groupId: d.groupId };
    case "resourceCapacity":
      return { ...common, type: "resourceCapacity" };
    case "equipmentCompatibility":
      return { ...common, type: "equipmentCompatibility" };
  }
}

function emptyDraft(): Draft {
  return { type: "blockedSlot", hard: true, weight: 10, name: "", resourceId: "", activityId: "", role: "", scope: "resource", refId: "", max: 2, minutes: 60, fromMinutes: 510, toMinutes: 810, groupId: "", slotIds: [] };
}

export function ConstraintEditor({
  constraints,
  resources,
  activities,
  slots,
  onChange,
}: {
  constraints: Constraint[];
  resources: Resource[];
  activities: Activity[];
  slots: TimeSlot[];
  onChange: (c: Constraint[]) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const groupIds = [...new Set(activities.map((a) => a.groupId).filter((g): g is string => g !== undefined))];

  const save = (d: Draft) => {
    const c = fromDraft(d);
    if (d.id !== undefined) onChange(constraints.map((x) => (x.id === d.id ? c : x)));
    else onChange([...constraints, c]);
    setDraft(null);
  };

  const columns: Column<Constraint>[] = [
    { key: "type", header: "Type", render: (c) => <Badge tone="brand">{constraintTypeLabel(c.type)}</Badge> },
    { key: "hard", header: "Severity", render: (c) => <Badge tone={c.hard ? "danger" : "warning"}>{c.hard ? "hard" : "soft"}</Badge> },
    { key: "weight", header: "Weight", render: (c) => (c.hard ? "—" : c.weight) },
    { key: "name", header: "Name", render: (c) => <span className="text-xs">{c.name ?? "—"}</span> },
    {
      key: "actions",
      header: "",
      width: "80px",
      render: (c) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDraft(toDraft(c))} />
          <Button size="sm" variant="ghost" className="text-red-500" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(constraints.filter((x) => x.id !== c.id))} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{constraints.length} constraint(s)</p>
        <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDraft(emptyDraft())}>Add constraint</Button>
      </div>
      <div className="space-y-2 md:hidden">
        {constraints.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No constraints defined yet.</p> : null}
        {constraints.map((constraint) => (
          <article key={constraint.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="break-words font-semibold text-slate-800 dark:text-slate-100">{constraint.name || constraintTypeLabel(constraint.type)}</p>
                <p className="mt-1 text-xs text-slate-500">{constraintTypeLabel(constraint.type)}</p>
              </div>
              <Badge tone={constraint.hard ? "danger" : "warning"}>{constraint.hard ? "Hard" : "Soft"}</Badge>
            </div>
            {!constraint.hard ? <p className="mt-2 text-xs text-slate-500">Weight: {constraint.weight}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button size="sm" variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDraft(toDraft(constraint))}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-red-500" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(constraints.filter((item) => item.id !== constraint.id))}>Delete</Button>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden md:block">
        <Table columns={columns} rows={constraints} rowKey={(c) => c.id} emptyMessage="No constraints defined." />
      </div>
      {draft ? <ConstraintForm draft={draft} resources={resources} activities={activities} slots={slots} groupIds={groupIds} onSave={save} onClose={() => setDraft(null)} /> : null}
    </div>
  );
}

function ConstraintForm({
  draft,
  resources,
  activities,
  slots,
  groupIds,
  onSave,
  onClose,
}: {
  draft: Draft;
  resources: Resource[];
  activities: Activity[];
  slots: TimeSlot[];
  groupIds: string[];
  onSave: (d: Draft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState<Draft>(draft);
  const set = (patch: Partial<Draft>) => setD({ ...d, ...patch });

  return (
    <Modal
      open
      onClose={onClose}
      title={d.id ? "Edit constraint" : "Add constraint"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(d)}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type">
            <Select value={d.type} onChange={(e) => set({ type: e.target.value as ConstraintType })}>
              {TYPES.map((t) => (<option key={t} value={t}>{constraintTypeLabel(t)}</option>))}
            </Select>
          </Field>
          <Field label="Name (optional)"><Input value={d.name} onChange={(e) => set({ name: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Checkbox label="Hard constraint" checked={d.hard} onChange={(checked) => set({ hard: checked })} />
          {!d.hard ? <Field label="Weight (1-100)"><Input type="number" min={1} max={100} value={d.weight} onChange={(e) => set({ weight: Number(e.target.value) })} /></Field> : <span />}
        </div>

        {d.type === "blockedSlot" ? (
          <>
            <Field label="Resource (optional, blank = global)">
              <Select value={d.resourceId} onChange={(e) => set({ resourceId: e.target.value })}>
                <option value="">— global —</option>
                {resources.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
              </Select>
            </Field>
            <Field label="Blocked slots">
              <div className="max-h-40 space-y-1 overflow-y-auto">
                {slots.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={d.slotIds.includes(s.id)} onChange={() => set({ slotIds: d.slotIds.includes(s.id) ? d.slotIds.filter((x) => x !== s.id) : [...d.slotIds, s.id] })} className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                    <span>{s.label ?? s.id}</span>
                  </label>
                ))}
              </div>
            </Field>
          </>
        ) : null}

        {d.type === "maxActivitiesPerDay" || d.type === "minSeparation" ? (
          <>
            <Field label="Scope">
              <Select value={d.scope} onChange={(e) => set({ scope: e.target.value as Draft["scope"] })}>
                <option value="resource">resource</option>
                <option value="group">group</option>
              </Select>
            </Field>
            <Field label={d.scope === "resource" ? "Resource" : "Group id"}>
              {d.scope === "resource" ? (
                <Select value={d.refId} onChange={(e) => set({ refId: e.target.value })}>
                  <option value="">— select —</option>
                  {resources.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
                </Select>
              ) : (
                <Select value={d.refId} onChange={(e) => set({ refId: e.target.value })}>
                  <option value="">— select —</option>
                  {groupIds.map((g) => (<option key={g} value={g}>{g}</option>))}
                </Select>
              )}
            </Field>
            {d.type === "maxActivitiesPerDay" ? <Field label="Max per day"><Input type="number" min={1} value={d.max} onChange={(e) => set({ max: Number(e.target.value) })} /></Field> : <Field label="Min separation (min)"><Input type="number" min={0} value={d.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })} /></Field>}
          </>
        ) : null}

        {d.type === "preferredTime" ? (
          <>
            <Field label="Scope">
              <Select value={d.scope} onChange={(e) => set({ scope: e.target.value as Draft["scope"] })}>
                <option value="resource">resource</option>
                <option value="activity">activity</option>
              </Select>
            </Field>
            <Field label={d.scope === "resource" ? "Resource" : "Activity"}>
              {d.scope === "resource" ? (
                <Select value={d.refId} onChange={(e) => set({ refId: e.target.value })}><option value="">— select —</option>{resources.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</Select>
              ) : (
                <Select value={d.refId} onChange={(e) => set({ refId: e.target.value })}><option value="">— select —</option>{activities.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}</Select>
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From (HH:MM)"><Input value={minutesToHHMM(d.fromMinutes)} onChange={(e) => set({ fromMinutes: labelToMinutesSafe(e.target.value, d.fromMinutes) })} /></Field>
              <Field label="To (HH:MM)"><Input value={minutesToHHMM(d.toMinutes)} onChange={(e) => set({ toMinutes: labelToMinutesSafe(e.target.value, d.toMinutes) })} /></Field>
            </div>
          </>
        ) : null}

        {d.type === "preferredResource" ? (
          <>
            <Field label="Activity"><Select value={d.activityId} onChange={(e) => set({ activityId: e.target.value })}><option value="">— select —</option>{activities.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}</Select></Field>
            <Field label="Role"><Input value={d.role} onChange={(e) => set({ role: e.target.value })} /></Field>
            <Field label="Preferred resource"><Select value={d.resourceId} onChange={(e) => set({ resourceId: e.target.value })}><option value="">— select —</option>{resources.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</Select></Field>
          </>
        ) : null}

        {d.type === "uniformDistribution" || d.type === "noGroupOverlap" ? (
          <Field label="Group id"><Select value={d.groupId} onChange={(e) => set({ groupId: e.target.value })}><option value="">— select —</option>{groupIds.map((g) => (<option key={g} value={g}>{g}</option>))}</Select></Field>
        ) : null}

        {d.type === "resourceCapacity" || d.type === "equipmentCompatibility" ? (
          <p className="text-sm text-slate-500">This constraint applies automatically to all resources/activities. No additional parameters.</p>
        ) : null}
      </div>
    </Modal>
  );
}
