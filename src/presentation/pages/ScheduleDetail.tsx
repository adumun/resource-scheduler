import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useScheduleStore } from "@/presentation/store/scheduleStore";
import { useAuthStore } from "@/presentation/store/authStore";
import { useUiStore } from "@/presentation/store/uiStore";
import { scheduleService } from "@/application/compositionRoot";
import { recompute } from "@/application/services/SchedulingService";
import { exportSchedule } from "@/infrastructure/importExport/serializer";
import { currentResult } from "@/domain/schedule";
import type { Schedule } from "@/domain/schedule";
import type { SchedulingResult } from "@/domain/result";
import type { Assignment } from "@/domain/assignment";
import type { SolverOptions, OptimizationLevel } from "@/domain/problem";
import { optionsForLevel } from "@/domain/problem";
import { rid } from "@/domain/ids";
import type { TimeSlotId } from "@/domain/ids";
import { Button, Card, Badge, Modal, Field, Input, Select, ConfirmDialog, Spinner, ProgressBar } from "@/presentation/components/ui";
import { SlotEditor } from "@/presentation/components/schedule/SlotEditor";
import { ResourceEditor } from "@/presentation/components/schedule/ResourceEditor";
import { ActivityEditor } from "@/presentation/components/schedule/ActivityEditor";
import { ConstraintEditor } from "@/presentation/components/schedule/ConstraintEditor";
import {
  OverviewTab,
  CalendarView,
  TimelineView,
  ResourceView,
  TableView,
  ConflictsTab,
  MetricsTab,
  HistoryTab,
  buildLookups,
} from "./scheduleViews";
import { statusLabel, statusTone, presetLabel, formatDateTime, minutesToHHMM } from "@/presentation/lib/format";
import { Play, Download, Copy, Trash2, Pencil, Sparkles, AlertTriangle, Check } from "lucide-react";

const TABS = ["Overview", "Calendar", "Timeline", "Resource", "Table", "Conflicts", "Metrics", "History", "Configure"] as const;
type Tab = (typeof TABS)[number];

export function ScheduleDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const current = useScheduleStore((s) => s.current);
  const loading = useScheduleStore((s) => s.loading);
  const scheduling = useScheduleStore((s) => s.scheduling);
  const loadOne = useScheduleStore((s) => s.loadOne);
  const update = useScheduleStore((s) => s.update);
  const remove = useScheduleStore((s) => s.remove);
  const duplicate = useScheduleStore((s) => s.duplicate);
  const runScheduling = useScheduleStore((s) => s.runScheduling);
  const cancelScheduling = useScheduleStore((s) => s.cancelScheduling);
  const setCurrentSolution = useScheduleStore((s) => s.setCurrentSolution);
  const replaceCurrent = useScheduleStore((s) => s.replaceCurrent);
  const toast = useUiStore((s) => s.toast);

  const [tab, setTab] = useState<Tab>("Overview");
  const [runOpen, setRunOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [toDelete, setToDelete] = useState(false);
  const [moveTarget, setMoveTarget] = useState<Assignment | null>(null);
  const [optimization, setOptimization] = useState<OptimizationLevel>("balanced");
  const [alternatives, setAlternatives] = useState(1);
  const [nameDraft, setNameDraft] = useState("");

  useEffect(() => {
    if (id) void loadOne(id);
  }, [id, loadOne]);

  const schedule = current;
  const result = useMemo(() => (schedule ? currentResult(schedule) : undefined), [schedule]);

  if (loading && !schedule) return <div className="flex justify-center py-16"><Spinner label="Loading schedule…" /></div>;
  if (!schedule) return <div className="py-16 text-center text-slate-500">Schedule not found.</div>;

  const onRun = async () => {
    const options: SolverOptions = optionsForLevel(optimization, { alternativeCount: alternatives });
    const results = await runScheduling(schedule, options);
    if (results && results.length > 1) toast(`${results.length} alternatives generated. Best score ${results[0]!.score.value}.`, "success");
    else if (results && results.length === 1) toast(`Scheduling complete. Score ${results[0]!.score.value}.`, results[0]!.valid ? "success" : "warning");
    setRunOpen(false);
  };

  const onExport = () => {
    const json = exportSchedule(schedule);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schedule.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Exported.", "success");
  };

  const onRestore = async (solutionId: string) => {
    await setCurrentSolution(schedule.id, solutionId);
    toast("Solution restored.", "info");
  };

  const onMoveApply = async (newAssignments: Assignment[]) => {
    const { result: newResult } = recompute(schedule, newAssignments, result?.seed ?? 1, result?.solverOptions ?? optionsForLevel("balanced"));
    if (newResult.hardViolations.length > 0) {
      toast(`Move rejected: ${newResult.hardViolations.length} hard violation(s).`, "error");
      return;
    }
    const updated = await scheduleService.saveResults(schedule.id, [newResult]);
    replaceCurrent(updated);
    setMoveTarget(null);
    toast(`Assignment moved. Score ${newResult.score.value}.`, "success");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{schedule.name}</h1>
            <Badge tone={statusTone(schedule.status)}>{statusLabel(schedule.status)}</Badge>
            <Badge tone="brand">{presetLabel(schedule.preset)}</Badge>
          </div>
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{schedule.description || "No description."} · Updated {formatDateTime(schedule.updatedAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button icon={<Play className="h-4 w-4" />} onClick={() => setRunOpen(true)}>Run</Button>
          <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => { setNameDraft(schedule.name); setEditNameOpen(true); }}>Rename</Button>
          <Button variant="secondary" icon={<Download className="h-4 w-4" />} onClick={onExport}>Export</Button>
          <Button variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => session && void duplicate(schedule.id, session.userId).then((s) => s && navigate(`/schedules/${s.id}`))}>Duplicate</Button>
          <Button variant="ghost" className="text-red-500" icon={<Trash2 className="h-4 w-4" />} onClick={() => setToDelete(true)}>Delete</Button>
        </div>
      </div>

      {scheduling.running && scheduling.progress ? (
        <Card>
          <div className="flex items-center justify-between">
            <Spinner label={`Scheduling… ${scheduling.progress.assigned}/${scheduling.progress.total} assigned · best score ${scheduling.progress.bestScore}`} />
            <Button size="sm" variant="danger" onClick={cancelScheduling}>Cancel</Button>
          </div>
          <div className="mt-2"><ProgressBar value={scheduling.progress.assigned} max={scheduling.progress.total || 1} /></div>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t ? "border-brand-600 text-brand-600 dark:text-brand-400" : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}>{t}</button>
        ))}
      </div>

      <div>
        {tab === "Overview" ? <OverviewTab schedule={schedule} result={result} /> : null}
        {tab === "Calendar" ? <CalendarView schedule={schedule} result={result} onMove={setMoveTarget} /> : null}
        {tab === "Timeline" ? <TimelineView schedule={schedule} result={result} /> : null}
        {tab === "Resource" ? <ResourceView schedule={schedule} result={result} /> : null}
        {tab === "Table" ? <TableView schedule={schedule} result={result} /> : null}
        {tab === "Conflicts" ? <ConflictsTab result={result} /> : null}
        {tab === "Metrics" ? <MetricsTab schedule={schedule} result={result} /> : null}
        {tab === "History" ? <HistoryTab schedule={schedule} onRestore={onRestore} /> : null}
        {tab === "Configure" ? <ConfigureTab schedule={schedule} onSave={update} /> : null}
      </div>

      <RunModal open={runOpen} onClose={() => setRunOpen(false)} optimization={optimization} setOptimization={setOptimization} alternatives={alternatives} setAlternatives={setAlternatives} onRun={onRun} running={scheduling.running} />
      <Modal open={editNameOpen} onClose={() => setEditNameOpen(false)} title="Rename schedule" footer={<><Button variant="secondary" onClick={() => setEditNameOpen(false)}>Cancel</Button><Button onClick={() => { void update({ ...schedule, name: nameDraft }); setEditNameOpen(false); }}>Save</Button></>}>
        <Field label="Name"><Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} /></Field>
      </Modal>
      {moveTarget ? <MoveModal schedule={schedule} assignment={moveTarget} result={result} onApply={onMoveApply} onClose={() => setMoveTarget(null)} /> : null}
      <ConfirmDialog open={toDelete} onClose={() => setToDelete(false)} onConfirm={() => { void remove(schedule.id).then(() => navigate("/schedules")); }} title="Delete schedule" message={<>Delete <strong>{schedule.name}</strong>? This cannot be undone.</>} confirmLabel="Delete" danger />
    </div>
  );
}

function RunModal({ open, onClose, optimization, setOptimization, alternatives, setAlternatives, onRun, running }: { open: boolean; onClose: () => void; optimization: OptimizationLevel; setOptimization: (o: OptimizationLevel) => void; alternatives: number; setAlternatives: (n: number) => void; onRun: () => void; running: boolean }) {
  return (
    <Modal open={open} onClose={onClose} title="Run scheduling" footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={<Sparkles className="h-4 w-4" />} loading={running} disabled={running} onClick={onRun}>Run</Button></>}>
      <div className="space-y-4">
        <Field label="Optimization level">
          <Select value={optimization} onChange={(e) => setOptimization(e.target.value as OptimizationLevel)}>
            <option value="fast">Fast</option>
            <option value="balanced">Balanced</option>
            <option value="best">Best</option>
          </Select>
        </Field>
        <Field label="Alternative solutions" hint="Generate multiple distinct solutions to compare.">
          <Input type="number" min={1} max={5} value={alternatives} onChange={(e) => setAlternatives(Math.max(1, Math.min(5, Number(e.target.value))))} />
        </Field>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">Global optimum is not guaranteed. The engine searches for a good feasible solution within the time budget.</p>
      </div>
    </Modal>
  );
}

function MoveModal({ schedule, assignment, result, onApply, onClose }: { schedule: Schedule; assignment: Assignment; result: SchedulingResult | undefined; onApply: (a: Assignment[]) => void; onClose: () => void }) {
  const lookups = useMemo(() => buildLookups(schedule), [schedule]);
  const activity = lookups.activitiesById.get(assignment.activityId);
  const [slotId, setSlotId] = useState<string>(assignment.slotId);
  const [resources, setResources] = useState(assignment.resources.map((r) => ({ ...r })));

  const apply = () => {
    onApply(result?.assignments.map((a) => (a.id === assignment.id ? { ...a, slotId: rid<TimeSlotId>(slotId), resources } : a)) ?? []);
  };

  return (
    <Modal open onClose={onClose} title="Move assignment" description={activity?.name} footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button icon={<Check className="h-4 w-4" />} onClick={apply}>Apply</Button></>}>
      <div className="space-y-4">
        <Field label="Time slot">
          <Select value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            {schedule.slots.map((s) => (<option key={s.id} value={s.id}>{s.label ?? `${minutesToHHMM(s.startMinutes)}-${minutesToHHMM(s.endMinutes)}`} ({s.date ?? ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][s.dayOfWeek ?? 0]})</option>))}
          </Select>
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Resources</p>
          {resources.map((r, i) => {
            const req = activity?.requirements.find((q) => q.role === r.role);
            const candidates = req?.candidateResourceIds ?? [...lookups.resourcesById.keys()];
            return (
              <Field key={i} label={r.role}>
                <Select value={r.resourceId} onChange={(e) => setResources(resources.map((x, idx) => (idx === i ? { ...x, resourceId: e.target.value as never } : x)))}>
                  {candidates.map((cid) => (<option key={cid} value={cid}>{lookups.resourcesById.get(cid)?.name ?? cid}</option>))}
                </Select>
              </Field>
            );
          })}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Hard-constraint violations will block the change.</p>
      </div>
    </Modal>
  );
}

function ConfigureTab({ schedule, onSave }: { schedule: Schedule; onSave: (s: Schedule) => Promise<void> }) {
  const [slots, setSlots] = useState(schedule.slots);
  const [resources, setResources] = useState(schedule.resources);
  const [activities, setActivities] = useState(schedule.activities);
  const [constraints, setConstraints] = useState(schedule.constraints);
  const [saving, setSaving] = useState(false);
  const toast = useUiStore((s) => s.toast);

  const save = async () => {
    setSaving(true);
    await onSave({ ...schedule, slots, resources, activities, constraints });
    setSaving(false);
    toast("Configuration saved.", "success");
  };

  return (
    <div className="space-y-5">
      <Card><CardHeaderSmall title="Time slots" /><SlotEditor slots={slots} onChange={setSlots} /></Card>
      <Card><CardHeaderSmall title="Resources" /><ResourceEditor resources={resources} onChange={setResources} /></Card>
      <Card><CardHeaderSmall title="Activities" /><ActivityEditor activities={activities} resources={resources} onChange={setActivities} /></Card>
      <Card><CardHeaderSmall title="Constraints" /><ConstraintEditor constraints={constraints} resources={resources} activities={activities} slots={slots} onChange={setConstraints} /></Card>
      <div className="flex justify-end"><Button loading={saving} onClick={save}>Save configuration</Button></div>
    </div>
  );
}

function CardHeaderSmall({ title }: { title: string }) {
  return <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>;
}
