import { useMemo, useState } from "react";
import type { TimeSlot } from "@/domain/time";
import { id } from "@/domain/ids";
import { Button, Input, Select, Table } from "@/presentation/components/ui";
import type { Column } from "@/presentation/components/ui";
import { Plus, Trash2, Copy, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { minutesToHHMM, labelToMinutesSafe } from "./timeUtils";

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

export function SlotEditor({ slots, onChange }: { slots: TimeSlot[]; onChange: (slots: TimeSlot[]) => void }) {
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);
  const grouped = useMemo(
    () => new Map(DAYS.map((day) => [day.value, slots.filter((slot) => slot.dayOfWeek === day.value)])),
    [slots],
  );

  const addDateSpecific = () => {\n    onChange([...slots, { id: id.slot(), date: new Date().toISOString().slice(0, 10), startMinutes: 9 * 60, endMinutes: 10 * 60 + 30, label: "09:00-10:30" }]);\n  };\n\n  const add = (dayOfWeek = 1) => {
    const next = [...slots, { id: id.slot(), dayOfWeek, startMinutes: 9 * 60, endMinutes: 10 * 60 + 30, label: "09:00-10:30" }];
    onChange(next);
    setExpandedDays((current) => current.includes(dayOfWeek) ? current : [...current, dayOfWeek]);
  };
  const update = (slotId: string, patch: Partial<TimeSlot>) =>
    onChange(slots.map((slot) => slot.id === slotId ? { ...slot, ...patch } : slot));
  const remove = (slotId: string) => onChange(slots.filter((slot) => slot.id !== slotId));
  const toggleDay = (day: number) =>
    setExpandedDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day]);

  const copyMondayToWeekdays = () => {
    const monday = grouped.get(1) ?? [];
    if (monday.length === 0) return;
    const weekdays = [2, 3, 4, 5];
    const retained = slots.filter((slot) => !weekdays.includes(slot.dayOfWeek ?? -1));
    const copies = weekdays.flatMap((day) => monday.map((slot) => ({
      ...slot,
      id: id.slot(),
      dayOfWeek: day,
      date: undefined,
    })));
    onChange([...retained, ...copies]);
  };

  const dateSpecificSlots = slots.filter((slot) => slot.dayOfWeek === undefined);\n\n  const columns: Column<TimeSlot>[] = [
    {
      key: "day",
      header: "Day",
      render: (slot) => (
        <Select value={String(slot.dayOfWeek ?? "")} onChange={(event) => update(slot.id, { dayOfWeek: event.target.value === "" ? undefined : Number(event.target.value), date: undefined })}>
          {DAYS.map((day) => <option key={day.value} value={day.value}>{day.short}</option>)}
        </Select>
      ),
    },
    {
      key: "start",
      header: "Start",
      render: (slot) => <Input aria-label={`Start time ${slot.id}`} type="time" value={minutesToHHMM(slot.startMinutes)} onChange={(event) => update(slot.id, { startMinutes: labelToMinutesSafe(event.target.value, slot.startMinutes) })} />,
    },
    {
      key: "end",
      header: "End",
      render: (slot) => <Input aria-label={`End time ${slot.id}`} type="time" value={minutesToHHMM(slot.endMinutes)} onChange={(event) => update(slot.id, { endMinutes: labelToMinutesSafe(event.target.value, slot.endMinutes) })} />,
    },
    {
      key: "actions",
      header: "",
      render: (slot) => <Button size="sm" variant="ghost" className="text-red-500" aria-label="Remove time slot" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => remove(slot.id)} />,
      width: "40px",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{slots.length} time slot(s)</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Set the weekly windows when activities can be scheduled.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" icon={<CalendarDays className="h-3.5 w-3.5" />} onClick={addDateSpecific}>Add specific date</Button>\n          <Button size="sm" variant="ghost" icon={<Copy className="h-3.5 w-3.5" />} disabled={(grouped.get(1)?.length ?? 0) === 0} onClick={copyMondayToWeekdays}>Copy Monday to weekdays</Button>
          <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => add()}>Add slot</Button>
        </div>
      </div>

      <div className="space-y-2 md:hidden">
        {DAYS.map((day) => {
          const daySlots = grouped.get(day.value) ?? [];
          const expanded = expandedDays.includes(day.value);
          return (
            <section key={day.value} className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center gap-2 p-3">
                <button type="button" onClick={() => toggleDay(day.value)} aria-expanded={expanded} className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{day.short.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-800 dark:text-slate-100">{day.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">{daySlots.length === 0 ? "No time windows" : `${daySlots.length} time window(s)`}</span>
                  </span>
                  {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
                </button>
                <Button size="sm" variant="ghost" aria-label={`Add slot on ${day.label}`} icon={<Plus className="h-4 w-4" />} onClick={() => add(day.value)} />
              </div>
              {expanded ? (
                <div className="space-y-2 border-t border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
                  {daySlots.length === 0 ? <p className="py-2 text-sm text-slate-500">Add the first time window for this day.</p> : null}
                  {daySlots.map((slot) => (
                    <div key={slot.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500">Time window</span>
                        <button type="button" aria-label="Remove time window" onClick={() => remove(slot.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300">From
                          <Input className="mt-1 min-h-11" type="time" value={minutesToHHMM(slot.startMinutes)} onChange={(event) => update(slot.id, { startMinutes: labelToMinutesSafe(event.target.value, slot.startMinutes) })} />
                        </label>
                        <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300">To
                          <Input className="mt-1 min-h-11" type="time" value={minutesToHHMM(slot.endMinutes)} onChange={(event) => update(slot.id, { endMinutes: labelToMinutesSafe(event.target.value, slot.endMinutes) })} />
                        </label>
                      </div>
                    </div>
                  ))}
                  <Button block size="lg" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={() => add(day.value)}>Add time window</Button>
                </div>
              ) : null}
            </section>
          );
        })}
        {dateSpecificSlots.length > 0 ? (
          <section className="overflow-hidden rounded-xl border border-amber-200 bg-white dark:border-amber-900 dark:bg-slate-900">
            <div className="p-3">
              <p className="font-semibold text-slate-800 dark:text-slate-100">Date-specific windows</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{dateSpecificSlots.length} window(s) assigned to a specific date</p>
            </div>
            <div className="space-y-2 border-t border-amber-100 bg-amber-50/50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
              {dateSpecificSlots.map((slot) => (
                <div key={slot.id} className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500">Specific date</span>
                    <button type="button" aria-label="Remove time window" onClick={() => remove(slot.id)} className="rounded-lg p-2 text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Date
                    <Input className="mt-1 min-h-11" type="date" value={slot.date ?? ""} onChange={(event) => update(slot.id, { date: event.target.value })} />
                  </label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300">From
                      <Input className="mt-1 min-h-11" type="time" value={minutesToHHMM(slot.startMinutes)} onChange={(event) => update(slot.id, { startMinutes: labelToMinutesSafe(event.target.value, slot.startMinutes) })} />
                    </label>
                    <label className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-300">To
                      <Input className="mt-1 min-h-11" type="time" value={minutesToHHMM(slot.endMinutes)} onChange={(event) => update(slot.id, { endMinutes: labelToMinutesSafe(event.target.value, slot.endMinutes) })} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <div className="hidden md:block">
        <Table columns={columns} rows={slots} rowKey={(slot) => slot.id} emptyMessage="No time slots defined." />
      </div>
    </div>
  );
}

export function makeDefaultWeekdaySlots(): TimeSlot[] {
  const blocks = [
    { start: 510, end: 600, label: "08:30-10:00" },
    { start: 615, end: 705, label: "10:15-11:45" },
    { start: 720, end: 810, label: "12:00-13:30" },
    { start: 870, end: 960, label: "14:30-16:00" },
  ];
  const result: TimeSlot[] = [];
  for (const day of [1, 2, 3, 4, 5]) {
    for (const block of blocks) {
      result.push({ id: id.slot(), dayOfWeek: day, startMinutes: block.start, endMinutes: block.end, label: block.label });
    }
  }
  return result;
}
