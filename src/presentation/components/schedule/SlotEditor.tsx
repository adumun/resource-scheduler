import type { TimeSlot } from "@/domain/time";
import { id, rid } from "@/domain/ids";
import { Button, Input, Select, Table } from "@/presentation/components/ui";
import type { Column } from "@/presentation/components/ui";
import { Plus, Trash2 } from "lucide-react";
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

export function SlotEditor({ slots, onChange }: { slots: TimeSlot[]; onChange: (slots: TimeSlot[]) => void }) {
  const add = () => {
    onChange([
      ...slots,
      { id: id.slot(), dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 10 * 60 + 30, label: "09:00-10:30" },
    ]);
  };
  const update = (idx: number, patch: Partial<TimeSlot>) => {
    onChange(slots.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };
  const remove = (idx: number) => onChange(slots.filter((_, i) => i !== idx));

  const columns: Column<TimeSlot>[] = [
    {
      key: "day",
      header: "Day",
      render: (s, i) => (
        <Select value={String(s.dayOfWeek ?? "")} onChange={(e) => update(i, { dayOfWeek: e.target.value === "" ? undefined : Number(e.target.value), date: undefined })}>
          {DAYS.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </Select>
      ),
    },
    {
      key: "start",
      header: "Start",
      render: (s, i) => <Input value={minutesToHHMM(s.startMinutes)} onChange={(e) => update(i, { startMinutes: labelToMinutesSafe(e.target.value, s.startMinutes) })} />,
    },
    {
      key: "end",
      header: "End",
      render: (s, i) => <Input value={minutesToHHMM(s.endMinutes)} onChange={(e) => update(i, { endMinutes: labelToMinutesSafe(e.target.value, s.endMinutes) })} />,
    },
    {
      key: "actions",
      header: "",
      render: (_, i) => (
        <Button size="sm" variant="ghost" className="text-red-500" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => remove(i)} />
      ),
      width: "40px",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{slots.length} time slot(s)</p>
        <Button size="sm" variant="secondary" icon={<Plus className="h-3.5 w-3.5" />} onClick={add}>Add slot</Button>
      </div>
      <Table columns={columns} rows={slots} rowKey={(s) => s.id} emptyMessage="No time slots defined." />
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
  for (const d of [1, 2, 3, 4, 5]) {
    for (const b of blocks) {
      result.push({ id: id.slot(), dayOfWeek: d, startMinutes: b.start, endMinutes: b.end, label: b.label });
    }
  }
  return result;
}

export const _rid = rid;
