import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScheduleStore } from "@/presentation/store/scheduleStore";
import { useAuthStore } from "@/presentation/store/authStore";
import { useUiStore } from "@/presentation/store/uiStore";
import { Button, Card, Input, Textarea, Select, Field, Badge, Spinner, ProgressBar } from "@/presentation/components/ui";
import { SlotEditor, makeDefaultWeekdaySlots } from "@/presentation/components/schedule/SlotEditor";
import { ResourceEditor } from "@/presentation/components/schedule/ResourceEditor";
import { ActivityEditor } from "@/presentation/components/schedule/ActivityEditor";
import { ConstraintEditor } from "@/presentation/components/schedule/ConstraintEditor";
import { buildAcademicDataset, buildSportsDataset, buildSurgeryDataset } from "@/domain/presets";
import type { PresetData } from "@/domain/presets";
import type { SchedulePreset } from "@/domain/schedule";
import type { TimeSlot } from "@/domain/time";
import type { Resource } from "@/domain/resource";
import type { Activity } from "@/domain/activity";
import type { Constraint } from "@/domain/constraint";
import type { SolverOptions, OptimizationLevel } from "@/domain/problem";
import { optionsForLevel } from "@/domain/problem";
import { Check, ChevronLeft, ChevronRight, Sparkles, Wand2 } from "lucide-react";

interface Config {
  name: string;
  description: string;
  preset: SchedulePreset;
  timeRange: { startDate: string; endDate: string };
  slots: TimeSlot[];
  resources: Resource[];
  activities: Activity[];
  constraints: Constraint[];
}

const STEPS = ["General", "Time range", "Days & blocks", "Resources", "Activities", "Constraints", "Review", "Run"] as const;

function loadPresetData(preset: SchedulePreset): PresetData | null {
  if (preset === "academic") return buildAcademicDataset();
  if (preset === "sports") return buildSportsDataset();
  if (preset === "surgery") return buildSurgeryDataset();
  return null;
}

export function ScheduleWizard() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const create = useScheduleStore((s) => s.create);
  const runScheduling = useScheduleStore((s) => s.runScheduling);
  const scheduling = useScheduleStore((s) => s.scheduling);
  const cancelScheduling = useScheduleStore((s) => s.cancelScheduling);
  const toast = useUiStore((s) => s.toast);

  const [step, setStep] = useState(0);
  const [optimization, setOptimization] = useState<OptimizationLevel>("balanced");
  const [alternatives, setAlternatives] = useState(1);
  const [config, setConfig] = useState<Config>({
    name: "",
    description: "",
    preset: "academic",
    timeRange: { startDate: "2026-03-01", endDate: "2026-07-31" },
    slots: [],
    resources: [],
    activities: [],
    constraints: [],
  });

  const set = (patch: Partial<Config>) => setConfig({ ...config, ...patch });

  const loadDemo = () => {
    const data = loadPresetData(config.preset);
    if (data === null) {
      toast("No demo dataset for custom preset.", "warning");
      return;
    }
    set({
      name: data.name,
      description: data.description,
      timeRange: data.timeRange,
      slots: data.slots,
      resources: data.resources,
      activities: data.activities,
      constraints: data.constraints,
    });
    toast("Demo data loaded.", "success");
  };

  const canNext = step !== 0 || config.name.trim() !== "";

  const finish = async () => {
    if (!session) return;
    const schedule = await create({
      ownerId: session.userId,
      name: config.name,
      description: config.description,
      preset: config.preset,
      timeRange: config.timeRange,
      slots: config.slots,
      resources: config.resources,
      activities: config.activities,
      constraints: config.constraints,
    });
    if (schedule === null) return;
    const options: SolverOptions = optionsForLevel(optimization, { alternativeCount: alternatives });
    const results = await runScheduling(schedule, options);
    if (results && results.length > 0) {
      toast(`Scheduling complete. Best score ${results[0]!.score.value}.`, "success");
    }
    navigate(`/schedules/${schedule.id}`);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">New schedule</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure your scheduling problem in {STEPS.length} steps.</p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1">
            <button
              onClick={() => setStep(i)}
              className={`flex h-7 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${i === step ? "bg-brand-600 text-white" : i < step ? "bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
            >
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>
              {label}
            </button>
            {i < STEPS.length - 1 ? <ChevronRight className="h-3 w-3 text-slate-300" /> : null}
          </div>
        ))}
      </div>

      <Card>
        {step === 0 ? (
          <div className="space-y-4">
            <Field label="Name" required>
              <Input value={config.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. University Schedule 2026" />
            </Field>
            <Field label="Description">
              <Textarea rows={2} value={config.description} onChange={(e) => set({ description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Preset">
                <Select value={config.preset} onChange={(e) => set({ preset: e.target.value as SchedulePreset })}>
                  <option value="academic">Academic</option>
                  <option value="sports">Sports</option>
                  <option value="surgery">Surgery</option>
                  <option value="custom">Custom</option>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button variant="subtle" icon={<Wand2 className="h-4 w-4" />} onClick={loadDemo}>Load demo data for preset</Button>
              </div>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><Input type="date" value={config.timeRange.startDate} onChange={(e) => set({ timeRange: { ...config.timeRange, startDate: e.target.value } })} /></Field>
            <Field label="End date"><Input type="date" value={config.timeRange.endDate} onChange={(e) => set({ timeRange: { ...config.timeRange, endDate: e.target.value } })} /></Field>
          </div>
        ) : step === 2 ? (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => set({ slots: makeDefaultWeekdaySlots() })}>Fill default weekday blocks</Button>
            </div>
            <SlotEditor slots={config.slots} onChange={(slots) => set({ slots })} />
          </div>
        ) : step === 3 ? (
          <ResourceEditor resources={config.resources} onChange={(resources) => set({ resources })} />
        ) : step === 4 ? (
          <ActivityEditor activities={config.activities} resources={config.resources} onChange={(activities) => set({ activities })} />
        ) : step === 5 ? (
          <ConstraintEditor constraints={config.constraints} resources={config.resources} activities={config.activities} slots={config.slots} onChange={(constraints) => set({ constraints })} />
        ) : step === 6 ? (
          <div className="space-y-3 text-sm">
            <ReviewRow label="Name" value={config.name || "—"} />
            <ReviewRow label="Preset" value={<Badge tone="brand">{config.preset}</Badge>} />
            <ReviewRow label="Time range" value={`${config.timeRange.startDate} → ${config.timeRange.endDate}`} />
            <ReviewRow label="Slots" value={config.slots.length} />
            <ReviewRow label="Resources" value={config.resources.length} />
            <ReviewRow label="Activities" value={`${config.activities.length} (${config.activities.reduce((s, a) => s + a.count, 0)} instances)`} />
            <ReviewRow label="Constraints" value={config.constraints.length} />
          </div>
        ) : (
          <RunStep optimization={optimization} setOptimization={setOptimization} alternatives={alternatives} setAlternatives={setAlternatives} scheduling={scheduling} onCancel={cancelScheduling} />
        )}
      </Card>

      <div className="flex justify-between">
        <Button variant="ghost" icon={<ChevronLeft className="h-4 w-4" />} onClick={() => (step === 0 ? navigate("/schedules") : setStep(step - 1))}>
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < STEPS.length - 1 ? (
          <Button icon={<ChevronRight className="h-4 w-4" />} disabled={!canNext} onClick={() => setStep(step + 1)}>Next</Button>
        ) : (
          <Button icon={<Sparkles className="h-4 w-4" />} loading={scheduling.running} disabled={scheduling.running} onClick={finish}>Create & run</Button>
        )}
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="font-medium text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

function RunStep({
  optimization,
  setOptimization,
  alternatives,
  setAlternatives,
  scheduling,
  onCancel,
}: {
  optimization: OptimizationLevel;
  setOptimization: (o: OptimizationLevel) => void;
  alternatives: number;
  setAlternatives: (n: number) => void;
  scheduling: { running: boolean; progress: { assigned: number; total: number; bestScore: number; elapsedMs: number } | null };
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Optimization level">
        <Select value={optimization} onChange={(e) => setOptimization(e.target.value as OptimizationLevel)}>
          <option value="fast">Fast — quick valid solution</option>
          <option value="balanced">Balanced — time/score tradeoff</option>
          <option value="best">Best — more iterations, slower</option>
        </Select>
      </Field>
      <Field label="Alternative solutions" hint="Generate multiple distinct solutions to compare.">
        <Input type="number" min={1} max={5} value={alternatives} onChange={(e) => setAlternatives(Math.max(1, Math.min(5, Number(e.target.value))))} />
      </Field>
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
        Finding the global optimum is not guaranteed. The engine searches for a good feasible solution within the time budget.
      </p>
      {scheduling.running && scheduling.progress ? (
        <div className="space-y-2">
          <ProgressBar value={scheduling.progress.assigned} max={scheduling.progress.total || 1} label={`Assigned ${scheduling.progress.assigned}/${scheduling.progress.total} · best score ${scheduling.progress.bestScore} · ${(scheduling.progress.elapsedMs / 1000).toFixed(1)}s`} />
          <div className="flex items-center gap-2"><Spinner /> <Button size="sm" variant="danger" onClick={onCancel}>Cancel</Button></div>
        </div>
      ) : null}
    </div>
  );
}
