import { useState } from "react";
import type { Resource } from "@/domain/resource";
import type { AvailabilityInterval } from "@/domain/availability";
import { id, rid } from "@/domain/ids";
import type { ResourceId } from "@/domain/ids";
import { Button, Input, Select, Modal, Field, Checkbox, Table, Badge } from "@/presentation/components/ui";
import type { Column } from "@/presentation/components/ui";
import { Plus, Trash2, Pencil, Copy } from "lucide-react";
import { minutesToHHMM, labelToMinutesSafe } from "./timeUtils";

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

interface Draft extends Omit<Resource, "id" | "attributes" | "availability"> {
  id?: string;
  capacity: string;
  equipment: string;
  availability: AvailabilityInterval[];
}

function toDraft(r: Resource): Draft {
  const cap = r.attributes["capacity"];
  const eq = r.attributes["equipment"];
  return {
    id: r.id,
    name: r.name,
    kind: r.kind,
    roles: r.roles,
    active: r.active,
    color: r.color,
    capacity: typeof cap === "number" ? String(cap) : "",
    equipment: Array.isArray(eq) ? (eq as string[]).join(", ") : "",
    availability: r.availability,
  };
}

function fromDraft(d: Draft): Resource {
  const attributes: Record<string, unknown> = {};
  if (d.capacity.trim() !== "") attributes["capacity"] = Number(d.capacity);
  if (d.equipment.trim() !== "") attributes["equipment"] = d.equipment.split(",").map((s) => s.trim()).filter(Boolean);
  return {
    id: d.id ? rid<ResourceId>(d.id) : id.resource(),
    name: d.name,
    kind: d.kind,
    roles: d.roles,
    attributes,
    availability: d.availability,
    active: d.active,
    color: d.color,
  };
}

function emptyDraft(): Draft {
  return { name: "", kind: "person", roles: ["teacher"], active: true, capacity: "", equipment: "", availability: [] };
}

export function ResourceEditor({ resources, onChange }: { resources: Resource[]; onChange: (r: Resource[]) => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);

  const save = (d: Draft) => {
    const resource = fromDraft(d);
    if (d.id !== undefined) {
      onChange(resources.map((r) => (r.id === d.id ? resource : r)));
    } else {
      onChange([...resources, resource]);
    }
    setDraft(null);
  };

  const columns: Column<Resource>[] = [
    { key: "name", header: "Name", render: (r) => <span className="font-medium">{r.name}</span> },
    { key: "kind", header: "Kind", render: (r) => <Badge tone="neutral">{r.kind}</Badge> },
    { key: "roles", header: "Roles", render: (r) => <span className="text-xs">{r.roles.join(", ")}</span> },
    {
      key: "cap",
      header: "Capacity",
      render: (r) => (typeof r.attributes["capacity"] === "number" ? String(r.attributes["capacity"]) : "—"),
    },
    { key: "active", header: "Active", render: (r) => <Badge tone={r.active ? "success" : "neutral"}>{r.active ? "yes" : "no"}</Badge> },
    {
      key: "actions",
      header: "",
      width: "90px",
      render: (r) => (
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => setDraft(toDraft(r))} />
          <Button size="sm" variant="ghost" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => onChange([...resources, { ...r, id: id.resource(), name: `${r.name} (copy)` }])} />
          <Button size="sm" variant="ghost" className="text-red-500" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(resources.filter((x) => x.id !== r.id))} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{resources.length} resource(s)</p>
        <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setDraft(emptyDraft())}>Add resource</Button>
      </div>
      <Table columns={columns} rows={resources} rowKey={(r) => r.id} emptyMessage="No resources defined." />
      {draft ? <ResourceForm draft={draft} onSave={save} onClose={() => setDraft(null)} /> : null}
    </div>
  );
}

function ResourceForm({ draft, onSave, onClose }: { draft: Draft; onSave: (d: Draft) => void; onClose: () => void }) {
  const [d, setD] = useState<Draft>(draft);
  const setAvail = (i: number, patch: Partial<AvailabilityInterval>) =>
    setD({ ...d, availability: d.availability.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) });

  return (
    <Modal
      open
      onClose={onClose}
      title={d.id ? "Edit resource" : "Add resource"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ ...d, roles: d.roles.filter(Boolean) })} disabled={d.name.trim() === ""}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Name" required>
          <Input value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Kind">
            <Select value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as Resource["kind"] })}>
              <option value="person">person</option>
              <option value="location">location</option>
              <option value="equipment">equipment</option>
              <option value="custom">custom</option>
            </Select>
          </Field>
          <Field label="Roles (comma separated)">
            <Input value={d.roles.join(", ")} onChange={(e) => setD({ ...d, roles: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity (optional)">
            <Input type="number" value={d.capacity} onChange={(e) => setD({ ...d, capacity: e.target.value })} />
          </Field>
          <Field label="Equipment (comma separated, optional)">
            <Input value={d.equipment} onChange={(e) => setD({ ...d, equipment: e.target.value })} />
          </Field>
        </div>
        <Checkbox label="Active" checked={d.active} onChange={(checked) => setD({ ...d, active: checked })} />
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Availability</p>
            <Button size="sm" variant="ghost" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setD({ ...d, availability: [...d.availability, { dayOfWeek: 1, startMinutes: 510, endMinutes: 1065 }] })}>Add interval</Button>
          </div>
          <p className="mb-2 text-xs text-slate-400">Empty availability means always available.</p>
          <div className="space-y-2">
            {d.availability.map((a, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select value={String(a.dayOfWeek ?? "")} onChange={(e) => setAvail(i, { dayOfWeek: e.target.value === "" ? undefined : Number(e.target.value) })}>
                  {DAYS.map((day) => (<option key={day.value} value={day.value}>{day.label}</option>))}
                </Select>
                <Input className="w-24" value={minutesToHHMM(a.startMinutes)} onChange={(e) => setAvail(i, { startMinutes: labelToMinutesSafe(e.target.value, a.startMinutes) })} />
                <span className="text-slate-400">–</span>
                <Input className="w-24" value={minutesToHHMM(a.endMinutes)} onChange={(e) => setAvail(i, { endMinutes: labelToMinutesSafe(e.target.value, a.endMinutes) })} />
                <Button size="sm" variant="ghost" className="text-red-500" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setD({ ...d, availability: d.availability.filter((_, idx) => idx !== i) })} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
