import { useMemo, useState } from "react";
import type { Schedule } from "@/domain/schedule";
import type { SchedulingResult } from "@/domain/result";
import type { Assignment } from "@/domain/assignment";
import type { Resource, Activity, TimeSlot } from "@/domain";
import type { ResourceId, TimeSlotId } from "@/domain/ids";
import { Card, CardHeader, Badge, EmptyState, Table, StatTile, ProgressBar, Button, Select, Input } from "@/presentation/components/ui";
import type { Column } from "@/presentation/components/ui";
import { minutesToHHMM, dayName, formatDateTime, formatDuration } from "@/presentation/lib/format";
import { Calendar, Clock, List, BarChart3, AlertTriangle, History, LayoutGrid } from "lucide-react";

export interface Lookups {
  resourcesById: Map<ResourceId, Resource>;
  activitiesById: Map<string, Activity>;
  slotsById: Map<TimeSlotId, TimeSlot>;
}

export function buildLookups(schedule: Schedule): Lookups {
  const resourcesById = new Map<ResourceId, Resource>();
  for (const r of schedule.resources) resourcesById.set(r.id, r);
  const activitiesById = new Map<string, Activity>();
  for (const a of schedule.activities) activitiesById.set(a.id, a);
  const slotsById = new Map<TimeSlotId, TimeSlot>();
  for (const s of schedule.slots) slotsById.set(s.id, s);
  return { resourcesById, activitiesById, slotsById };
}

function slotDayKey(slot: TimeSlot): string {
  return slot.date ?? dayName(slot.dayOfWeek);
}

function resourceName(lookups: Lookups, id: ResourceId): string {
  return lookups.resourcesById.get(id)?.name ?? id;
}

function activityName(lookups: Lookups, id: string): string {
  return lookups.activitiesById.get(id)?.name ?? id;
}

export function OverviewTab({ schedule, result }: { schedule: Schedule; result: SchedulingResult | undefined }) {
  const totalInstances = schedule.activities.filter((a) => a.active).reduce((s, a) => s + a.count, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Score" value={result ? result.score.value : "—"} hint={result ? (result.valid ? "valid" : "invalid") : undefined} tone={result?.valid ? "success" : "danger"} />
        <StatTile label="Scheduled" value={result ? `${result.assignments.length}/${totalInstances}` : "—"} />
        <StatTile label="Hard violations" value={result ? result.score.hardViolations : "—"} tone={result && result.score.hardViolations === 0 ? "success" : "danger"} />
        <StatTile label="Soft violations" value={result ? result.score.softViolations : "—"} tone="warning" />
      </div>
      {result && result.unscheduled.length > 0 ? (
        <Card>
          <CardHeader title={`Unscheduled activities (${result.unscheduled.length})`} subtitle="Could not be placed without hard conflicts." />
          <div className="space-y-1 text-sm">
            {result.unscheduled.map((u, i) => (
              <div key={i} className="flex justify-between rounded bg-red-50 px-3 py-1.5 dark:bg-red-900/20">
                <span className="font-medium text-red-700 dark:text-red-300">{activityName(buildLookups(schedule), u.activityId)} #{u.instanceIndex + 1}</span>
                <span className="text-xs text-red-500">{u.reason}</span>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {result && result.diagnostics.length > 0 ? (
        <Card>
          <CardHeader title="Diagnostics" subtitle="Why some activities could not be scheduled." />
          <div className="space-y-3">
            {result.diagnostics.map((d, i) => (
              <div key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-900/20">
                <p className="font-medium text-amber-800 dark:text-amber-200">{d.message}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-700 dark:text-amber-300">
                  {d.details.map((det, j) => (<li key={j}>{det}</li>))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
      {result ? (
        <Card>
          <CardHeader title="Solution meta" />
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <Meta label="Generated" value={formatDateTime(result.generatedAt)} />
            <Meta label="Elapsed" value={formatDuration(result.elapsedMs)} />
            <Meta label="Seed" value={result.seed} />
            <Meta label="Level" value={result.solverOptions.optimizationLevel} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="font-medium text-slate-700 dark:text-slate-200">{value}</p>
    </div>
  );
}

export function CalendarView({ schedule, result, onMove }: { schedule: Schedule; result: SchedulingResult | undefined; onMove?: (a: Assignment) => void }) {
  const lookups = useMemo(() => buildLookups(schedule), [schedule]);
  if (!result || result.assignments.length === 0) return <EmptyState icon={<Calendar className="h-10 w-10" />} title="No assignments" description="Run scheduling to see the calendar." />;
  const dayKeys = [...new Set(schedule.slots.map(slotDayKey))].sort();
  const times = [...new Set(schedule.slots.map((s) => s.startMinutes))].sort((a, b) => a - b);
  const byCell = new Map<string, Assignment[]>();
  for (const a of result.assignments) {
    const slot = lookups.slotsById.get(a.slotId);
    if (!slot) continue;
    const key = `${slotDayKey(slot)}|${slot.startMinutes}`;
    const list = byCell.get(key) ?? [];
    list.push(a);
    byCell.set(key, list);
  }
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="grid" style={{ gridTemplateColumns: `80px repeat(${dayKeys.length}, minmax(0, 1fr))` }}>
          <div className="border-b border-r border-slate-200 p-2 text-xs font-medium text-slate-400 dark:border-slate-800">Time</div>
          {dayKeys.map((d) => (<div key={d} className="border-b border-r border-slate-200 p-2 text-center text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">{d}</div>))}
          {times.map((t) => (
            <div key={t} className="contents">
              <div className="border-r border-slate-200 p-2 text-xs text-slate-400 dark:border-slate-800">{minutesToHHMM(t)}</div>
              {dayKeys.map((d) => {
                const cell = byCell.get(`${d}|${t}`) ?? [];
                return (
                  <div key={`${d}|${t}`} className="min-h-[60px] border-r border-b border-slate-200 p-1 dark:border-slate-800">
                    {cell.map((a) => (
                      <button key={a.id} onClick={() => onMove?.(a)} className={`mb-1 block w-full rounded px-1.5 py-1 text-left text-xs ${onMove ? "hover:ring-2 hover:ring-brand-400" : ""} bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200`}>
                        <p className="font-medium leading-tight">{activityName(lookups, a.activityId)}</p>
                        <p className="leading-tight opacity-70">{a.resources.map((r) => resourceName(lookups, r.resourceId)).join(", ")}</p>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TimelineView({ schedule, result }: { schedule: Schedule; result: SchedulingResult | undefined }) {
  const lookups = useMemo(() => buildLookups(schedule), [schedule]);
  if (!result || result.assignments.length === 0) return <EmptyState icon={<Clock className="h-10 w-10" />} title="No assignments" />;
  const grouped = new Map<string, Assignment[]>();
  for (const a of result.assignments) {
    const slot = lookups.slotsById.get(a.slotId);
    if (!slot) continue;
    const key = slotDayKey(slot);
    const list = grouped.get(key) ?? [];
    list.push(a);
    grouped.set(key, list);
  }
  const days = [...grouped.keys()].sort();
  return (
    <div className="space-y-4">
      {days.map((d) => (
        <Card key={d}>
          <CardHeader title={d} subtitle={`${grouped.get(d)!.length} assignment(s)`} />
          <div className="space-y-1.5">
            {grouped.get(d)!.sort((a, b) => (lookups.slotsById.get(a.slotId)?.startMinutes ?? 0) - (lookups.slotsById.get(b.slotId)?.startMinutes ?? 0)).map((a) => {
              const slot = lookups.slotsById.get(a.slotId)!;
              return (
                <div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                  <Badge tone="neutral">{minutesToHHMM(slot.startMinutes)}-{minutesToHHMM(slot.endMinutes)}</Badge>
                  <span className="font-medium text-slate-800 dark:text-slate-200">{activityName(lookups, a.activityId)}</span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">{a.resources.map((r) => `${r.role}: ${resourceName(lookups, r.resourceId)}`).join(" · ")}</span>
                </div>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}

export function ResourceView({ schedule, result }: { schedule: Schedule; result: SchedulingResult | undefined }) {
  const lookups = useMemo(() => buildLookups(schedule), [schedule]);
  const [selected, setSelected] = useState<string>(schedule.resources[0]?.id ?? "");
  const assignments = result?.assignments.filter((a) => a.resources.some((r) => r.resourceId === selected)) ?? [];
  const resource = schedule.resources.find((r) => r.id === selected);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-slate-500">Resource:</span>
        <Select value={selected} onChange={(e) => setSelected(e.target.value)} className="max-w-xs">
          {schedule.resources.map((r) => (<option key={r.id} value={r.id}>{r.name} ({r.kind})</option>))}
        </Select>
        {resource ? <Badge tone="neutral">{resource.roles.join(", ")}</Badge> : null}
      </div>
      {assignments.length === 0 ? <EmptyState icon={<LayoutGrid className="h-10 w-10" />} title="No assignments" description="This resource has no scheduled activities." /> : (
        <Table
          columns={[
            { key: "day", header: "Day", render: (a) => slotDayKey(lookups.slotsById.get(a.slotId)!) },
            { key: "time", header: "Time", render: (a) => { const s = lookups.slotsById.get(a.slotId)!; return `${minutesToHHMM(s.startMinutes)}-${minutesToHHMM(s.endMinutes)}`; } },
            { key: "activity", header: "Activity", render: (a) => activityName(lookups, a.activityId) },
            { key: "role", header: "Role", render: (a) => a.resources.find((r) => r.resourceId === selected)?.role ?? "—" },
          ]}
          rows={assignments}
          rowKey={(a) => a.id}
        />
      )}
    </div>
  );
}

export function TableView({ schedule, result }: { schedule: Schedule; result: SchedulingResult | undefined }) {
  const lookups = useMemo(() => buildLookups(schedule), [schedule]);
  const [q, setQ] = useState("");
  if (!result) return <EmptyState icon={<List className="h-10 w-10" />} title="No data" />;
  const rows = result.assignments.filter((a) => {
    if (q.trim() === "") return true;
    const name = activityName(lookups, a.activityId).toLowerCase();
    return name.includes(q.toLowerCase()) || a.resources.some((r) => resourceName(lookups, r.resourceId).toLowerCase().includes(q.toLowerCase()));
  });
  const columns: Column<Assignment>[] = [
    { key: "activity", header: "Activity", render: (a) => <span className="font-medium">{activityName(lookups, a.activityId)}</span> },
    { key: "inst", header: "#", render: (a) => a.instanceIndex + 1 },
    { key: "day", header: "Day", render: (a) => slotDayKey(lookups.slotsById.get(a.slotId)!) },
    { key: "time", header: "Time", render: (a) => { const s = lookups.slotsById.get(a.slotId)!; return `${minutesToHHMM(s.startMinutes)}-${minutesToHHMM(s.endMinutes)}`; } },
    { key: "resources", header: "Resources", render: (a) => <span className="text-xs">{a.resources.map((r) => `${r.role}: ${resourceName(lookups, r.resourceId)}`).join(", ")}</span> },
  ];
  return (
    <div className="space-y-3">
      <Input placeholder="Search activities or resources…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <Table columns={columns} rows={rows} rowKey={(a) => a.id} emptyMessage="No matching assignments." />
    </div>
  );
}

export function ConflictsTab({ result }: { result: SchedulingResult | undefined }) {
  if (!result) return <EmptyState icon={<AlertTriangle className="h-10 w-10" />} title="No result" />;
  const hard = result.hardViolations;
  const soft = result.softViolations;
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title={`Hard violations (${hard.length})`} subtitle={hard.length === 0 ? "No hard constraints violated." : "Solution is invalid."} />
        {hard.length === 0 ? <p className="text-sm text-emerald-600 dark:text-emerald-400">All hard constraints satisfied.</p> : (
          <div className="space-y-1.5">
            {hard.map((v) => (<ViolationRow key={v.id} v={v} tone="danger" />))}
          </div>
        )}
      </Card>
      <Card>
        <CardHeader title={`Soft violations (${soft.length})`} subtitle="Preferences not respected; solution remains valid." />
        {soft.length === 0 ? <p className="text-sm text-emerald-600 dark:text-emerald-400">All soft constraints satisfied.</p> : (
          <div className="space-y-1.5">
            {soft.map((v) => (<ViolationRow key={v.id} v={v} tone="warning" />))}
          </div>
        )}
      </Card>
    </div>
  );
}

function ViolationRow({ v, tone }: { v: import("@/domain/violation").Violation; tone: "danger" | "warning" }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-sm ${tone === "danger" ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300" : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"}`}>
      <div className="flex items-center justify-between">
        <span className="font-medium">{v.description}</span>
        {v.penalty !== undefined ? <Badge tone={tone}>−{v.penalty.toFixed(1)}</Badge> : null}
      </div>
      {v.constraintType ? <span className="text-xs opacity-70">{v.constraintType}</span> : null}
    </div>
  );
}

export function MetricsTab({ schedule, result }: { schedule: Schedule; result: SchedulingResult | undefined }) {
  if (!result) return <EmptyState icon={<BarChart3 className="h-10 w-10" />} title="No metrics" />;
  const usage = new Map<string, number>();
  for (const a of result.assignments) for (const r of a.resources) usage.set(r.resourceId, (usage.get(r.resourceId) ?? 0) + 1);
  const totalSlots = schedule.slots.length || 1;
  const rows = schedule.resources.map((r) => ({ id: r.id, name: r.name, count: usage.get(r.id) ?? 0, utilization: Math.round(((usage.get(r.id) ?? 0) / totalSlots) * 100) }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Scheduled" value={`${result.assignments.length}/${schedule.activities.reduce((s, a) => s + a.count, 0)}`} />
        <StatTile label="Unscheduled" value={result.unscheduled.length} tone={result.unscheduled.length === 0 ? "success" : "danger"} />
        <StatTile label="Hard conflicts" value={result.score.hardViolations} tone={result.score.hardViolations === 0 ? "success" : "danger"} />
        <StatTile label="Score" value={result.score.value} tone={result.valid ? "success" : "danger"} />
      </div>
      <Card>
        <CardHeader title="Resource utilization" subtitle="Assignments per resource relative to total slots." />
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id}>
              <div className="flex justify-between text-sm"><span className="font-medium text-slate-700 dark:text-slate-200">{r.name}</span><span className="text-slate-500">{r.count} · {r.utilization}%</span></div>
              <ProgressBar value={r.utilization} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function HistoryTab({ schedule, onRestore }: { schedule: Schedule; onRestore: (solutionId: string) => void }) {
  const summaries = schedule.results.map((r) => ({ id: r.solutionId, score: r.score.value, hard: r.score.hardViolations, soft: r.score.softViolations, scheduled: r.assignments.length, unscheduled: r.unscheduled.length, at: r.generatedAt, seed: r.seed, valid: r.valid }));
  if (summaries.length === 0) return <EmptyState icon={<History className="h-10 w-10" />} title="No solutions yet" />;
  return (
    <Table
      columns={[
        { key: "score", header: "Score", render: (s) => <Badge tone={s.valid ? "success" : "danger"}>{s.score}</Badge> },
        { key: "scheduled", header: "Scheduled", render: (s) => `${s.scheduled} (${s.unscheduled} unscheduled)` },
        { key: "violations", header: "Violations", render: (s) => `${s.hard} hard / ${s.soft} soft` },
        { key: "at", header: "Generated", render: (s) => formatDateTime(s.at) },
        { key: "seed", header: "Seed", render: (s) => s.seed },
        { key: "action", header: "", render: (s) => <Button size="sm" variant="subtle" disabled={s.id === schedule.currentSolutionId} onClick={() => onRestore(s.id)}>Restore</Button>, width: "90px" },
      ]}
      rows={summaries}
      rowKey={(s) => s.id}
    />
  );
}
