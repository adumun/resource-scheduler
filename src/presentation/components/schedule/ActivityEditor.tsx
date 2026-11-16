import { useState } from "react";
import type { Activity, ActivityRequirement } from "@/domain/activity";
import type { Resource } from "@/domain/resource";
import { id, rid } from "@/domain/ids";
import type { ActivityId } from "@/domain/ids";
import { Button, Input, Modal, Field, Checkbox, Table, Badge } from "@/presentation/components/ui";
import type { Column } from "@/presentation/components/ui";
import { Plus, Trash2, Pencil } from "lucide-react";

interface Draft {
  id?: string;
  name: string;
  kind: string;
  groupId: string;
  count: number;
  durationMinutes: number;
  priority: number;
  size: string;
  requiredEquipment: string;
  requirements: ActivityRequirement[];
  active: boolean;
}

function toDraft(a: Activity): Draft {
  const size = a.attributes["size"];
  const eq = a.attributes["requiredEquipment"];
  return {
    id: a.id,
    name: a.name,
    kind: a.kind,
    groupId: a.groupId ?? "",
    count: a.count,
    durationMinutes: a.durationMinutes,
    priority: a.priority,
    size: typeof size === "number" ? String(size) : "",
    requiredEquipment: Array.isArray(eq) ? (eq as string[]).join(", ") : "",
    requirements: a.requirements,
    active: a.active,
  };
}

function fromDraft(d: Draft): Activity {
  const attributes: Record<string, unknown> = {};
  if (d.size.trim() !== "") attributes["size"] = Number(d.size);
  if (d.requiredEquipment.trim() !== "") attributes["requiredEquipment"] = d.requiredEquipment.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    id: d.id ? rid<ActivityId>(d.id) : id.activity(),
    name: d.name,
    kind: d.kind,
    groupId: d.groupId.trim() || undefined,
    count: Math.max(1, d.count),
    durationMinutes: Math.max(1, d.durationMinutes),
    requirements: d.requirements,
    attributes,
    active: d.active,
    priority: d.priority,
  };
}

function emptyDraft(): Draft {
  return { name: "", kind: "class", groupId: "", count: 1, durationMinutes: 90, priority: 1, size: "", requiredEquipment: "", requirements: [], active: true };
}

export function ActivityEditor({ activities, resources, onChange }: { activities: Activity[]; resources: Resource[]; onChange: (a: Activity[]) => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = (d: Draft) => {
    const activity = fromDraft(d);
    if (d.id !== undefined) onChange(activities.map((a) => (a.id === d.id ? activity : a)));
    else onChange([...activities, activity]);
    setDraft(null);
  };

  const columns: Column<Activity>[] = [
    { key: "name", header: "Activity", render: (a) => <span className="font-medium">{a.name}</span> },
    { key: "count", header: "Count", render: (a) => a.count },
    { key: "dur", header: "Min", render: (a) => a.durationMinutes },
    { key: "group", header: "Group", render: (a) => <span className="text-xs">{a.groupId ?? "—"}</span> },
    { key: "reqs", header: "Requirements", render: (a) => <span className="text-xs">{a.requirements.map((r) => r.role).join(", ") || "—"}</span> },
    { key: "active", header: "Active", render: (a) => <Badge tone={a.active ? "success" : "neutral"}>{a.active ? "yes" : "no"}</Badge> },
    {
      key: "actions",
      header: "",
      width: "80px",
      render: (a) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDraft(toDraft(a))} />
          <Button size="sm" variant="ghost" className="text-red-500" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(activities.filter((x) => x.id !== a.id))} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{activities.length} activit(y/ies), {activities.reduce((s, a) => s + a.count, 0)} instances</p>
        <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDraft(emptyDraft())}>Add activity</Button>
      </div>
      <div className="space-y-2 md:hidden">
        {activities.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No activities defined yet.</p> : null}
        {activities.map((activity) => (
          <article key={activity.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="break-words font-semibold text-slate-800 dark:text-slate-100">{activity.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">{activity.kind}{activity.groupId ? ` · ${activity.groupId}` : ""}</p>
              </div>
              <Badge tone={activity.active ? "success" : "neutral"}>{activity.active ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><p className="text-xs text-slate-500">Instances</p><p className="font-semibold">{activity.count}</p></div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><p className="text-xs text-slate-500">Duration</p><p className="font-semibold">{activity.durationMinutes} min</p></div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800"><p className="text-xs text-slate-500">Priority</p><p className="font-semibold">{activity.priority}</p></div>
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Requirements: {activity.requirements.map((requirement) => requirement.role).join(", ") || "None"}</p>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button size="sm" variant="secondary" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDraft(toDraft(activity))}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-red-500" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(activities.filter((item) => item.id !== activity.id))}>Delete</Button>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden md:block">
        <Table columns={columns} rows={activities} rowKey={(a) => a.id} emptyMessage="No activities defined." />
      </div>
      {draft ? <ActivityForm draft={draft} resources={resources} onSave={save} onClose={() => setDraft(null)} /> : null}
    </div>
  );
}

function ActivityForm({ draft, resources, onSave, onClose }: { draft: Draft; resources: Resource[]; onSave: (d: Draft) => void; onClose: () => void }) {
  const [d, setD] = useState<Draft>(draft);

  const addRequirement = () => setD({ ...d, requirements: [...d.requirements, { role: "", candidateResourceIds: [] }] });
  const updateReq = (i: number, patch: Partial<ActivityRequirement>) =>
    setD({ ...d, requirements: d.requirements.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
  const toggleCandidate = (i: number, resourceId: string) =>
    setD({
      ...d,
      requirements: d.requirements.map((r, idx) => {
        if (idx !== i) return r;
        const has = r.candidateResourceIds.includes(resourceId as never);
        return { ...r, candidateResourceIds: has ? r.candidateResourceIds.filter((x) => x !== resourceId) : [...r.candidateResourceIds, resourceId as never] };
      }),
    });

  return (
    <Modal
      open
      onClose={onClose}
      title={d.id ? "Edit activity" : "Add activity"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave(d)} disabled={d.name.trim() === ""}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Kind"><Input value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value })} /></Field>
          <Field label="Group id"><Input value={d.groupId} onChange={(e) => setD({ ...d, groupId: e.target.value })} /></Field>
          <Field label="Priority"><Input type="number" value={d.priority} onChange={(e) => setD({ ...d, priority: Number(e.target.value) })} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Count (instances)"><Input type="number" min={1} value={d.count} onChange={(e) => setD({ ...d, count: Number(e.target.value) })} /></Field>
          <Field label="Duration (min)"><Input type="number" min={1} value={d.durationMinutes} onChange={(e) => setD({ ...d, durationMinutes: Number(e.target.value) })} /></Field>
          <Field label="Size (optional)"><Input type="number" value={d.size} onChange={(e) => setD({ ...d, size: e.target.value })} /></Field>
        </div>
        <Field label="Required equipment (comma separated, optional)">
          <Input value={d.requiredEquipment} onChange={(e) => setD({ ...d, requiredEquipment: e.target.value })} />
        </Field>
        <Checkbox label="Active" checked={d.active} onChange={(checked) => setD({ ...d, active: checked })} />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Requirements</p>
            <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={addRequirement}>Add requirement</Button>
          </div>
          <div className="space-y-3">
            {d.requirements.map((req, i) => (
              <div key={i} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Input className="min-w-0 flex-1" placeholder="role (e.g. teacher)" value={req.role} onChange={(e) => updateReq(i, { role: e.target.value })} />
                  <Button size="sm" variant="ghost" className="ml-auto text-red-500" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setD({ ...d, requirements: d.requirements.filter((_, idx) => idx !== i) })} />
                </div>
                <p className="mb-1 mt-2 text-xs text-slate-400">Candidate resources{req.role ? ` with role "${req.role}"` : ""}:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {resources.filter((r) => req.role === "" || r.roles.includes(req.role)).map((r) => (
                    <label key={r.id} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={req.candidateResourceIds.includes(r.id as never)} onChange={() => toggleCandidate(i, r.id)} className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600" />
                      <span>{r.name}</span>
                      <span className="text-xs text-slate-400">({r.kind})</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export type { Resource };
