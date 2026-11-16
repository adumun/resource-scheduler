import { LABS_DEMO_USER_ID } from "@/application/labsMode";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScheduleStore } from "@/presentation/store/scheduleStore";
import { useAuthStore } from "@/presentation/store/authStore";
import { useUiStore } from "@/presentation/store/uiStore";
import { scheduleService } from "@/application/compositionRoot";
import { exportSchedule, importSchedule } from "@/infrastructure/importExport/serializer";
import { scheduleStats, solutionSummaries, currentResult } from "@/domain/schedule";
import { Button, Card, Badge, EmptyState, ConfirmDialog, Spinner } from "@/presentation/components/ui";
import { statusLabel, statusTone, presetLabel, formatDateTime } from "@/presentation/lib/format";
import { Plus, Calendar, Copy, Trash2, Download, Upload, ArrowRight, AlertTriangle } from "lucide-react";
import type { Schedule } from "@/domain/schedule";

export function Dashboard() {
  const navigate = useNavigate();
  const session = useAuthStore((s) => s.session);
  const schedules = useScheduleStore((s) => s.schedules);
  const loading = useScheduleStore((s) => s.loading);
  const loadAll = useScheduleStore((s) => s.loadAll);
  const duplicate = useScheduleStore((s) => s.duplicate);
  const remove = useScheduleStore((s) => s.remove);
  const toast = useUiStore((s) => s.toast);

  const [toDelete, setToDelete] = useState<Schedule | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) void loadAll(session.userId);
  }, [session, loadAll]);

  const onExport = (schedule: Schedule) => {
    const json = exportSchedule(schedule);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${schedule.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Schedule exported.", "success");
  };

  const onImportFile = async (file: File) => {
    const text = await file.text();
    const result = importSchedule(text);
    if (!result.ok) {
      toast(`Invalid file: ${result.errors[0]}`, "error");
      return;
    }
    if (!session) return;
    const s = result.schedule!;
    const created = await scheduleService.create({
      ownerId: session.userId,
      name: `${s.name} (imported)`,
      description: s.description,
      preset: s.preset,
      timeRange: s.timeRange,
      slots: s.slots,
      resources: s.resources,
      activities: s.activities,
      constraints: s.constraints,
    });
    await loadAll(session.userId);
    toast(`Imported "${created.name}".`, "success");
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Schedules</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Plan and assign resources across projects.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = "";
            }}
          />
          <Button variant="secondary" icon={<Upload className="h-4 w-4" />} onClick={() => fileRef.current?.click()}>
            Import
          </Button>
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate("/schedules/new")}>
            New schedule
          </Button>
        </div>
      </div>

      {session?.userId === LABS_DEMO_USER_ID ? (
        <section className="flex flex-col gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-900/20 sm:flex-row sm:items-center sm:justify-between" aria-label="Prueba el simulador con datos ficticios">
          <div>
            <h2 className="font-semibold text-teal-950 dark:text-teal-100">¿Qué estamos probando?</h2>
            <p className="text-sm text-teal-800 dark:text-teal-200">
              Cómo asignar horarios y recursos sin conflictos. Crea un horario y pulsa “Load demo data” para probar un ejemplo ficticio; nada se envía a un servidor.
            </p>
          </div>
          <Button icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate("/schedules/new")}>
            Explorar demo
          </Button>
        </section>
      ) : null}

            {loading ? (
        <div className="flex justify-center py-16">
          <Spinner label="Loading schedules…" />
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-10 w-10" />}
          title="No schedules yet"
          description="Create your first schedule or import one from a JSON file."
          action={<Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate("/schedules/new")}>New schedule</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {schedules.map((s) => {
            const stats = scheduleStats(s);
            const summaries = solutionSummaries(s);
            const result = currentResult(s);
            return (
              <Card key={s.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => navigate(`/schedules/${s.id}`)} className="text-left">
                    <h3 className="font-semibold text-slate-900 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-400">{s.name}</h3>
                  </button>
                  <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{s.description || "No description."}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <Badge tone="brand">{presetLabel(s.preset)}</Badge>
                  <Badge tone="neutral">{stats.activeActivities} activities</Badge>
                  <Badge tone="neutral">{stats.activeResources} resources</Badge>
                  {result ? (
                    <Badge tone={result.valid ? "success" : "danger"}>Score {result.score.value}</Badge>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>Updated {formatDateTime(s.updatedAt)}</span>
                  <span>{summaries.length} solution{summaries.length === 1 ? "" : "s"}</span>
                </div>
                <div className="mt-4 flex items-center gap-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <Button size="sm" variant="subtle" icon={<ArrowRight className="h-3.5 w-3.5" />} onClick={() => navigate(`/schedules/${s.id}`)}>
                    Open
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => session && void duplicate(s.id, session.userId)}>
                    Duplicate
                  </Button>
                  <Button size="sm" variant="ghost" icon={<Download className="h-3.5 w-3.5" />} onClick={() => onExport(s)}>
                    Export
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => setToDelete(s)}>
                    Delete
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        onConfirm={() => {
          if (toDelete) void remove(toDelete.id);
          toast("Schedule deleted.", "info");
        }}
        title="Delete schedule"
        message={<>Are you sure you want to delete <strong>{toDelete?.name}</strong>? This cannot be undone.</>}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}

export { AlertTriangle };
