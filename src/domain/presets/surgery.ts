import type { PresetData } from "./types";
import { slot, person, location, activity, requirement, constraint, res } from "./builders";

const DATES = ["2026-08-15", "2026-08-16", "2026-08-17"];
const OR_BLOCKS = [
  { start: 480, end: 570, label: "08:00-09:30" },
  { start: 600, end: 690, label: "10:00-11:30" },
  { start: 720, end: 810, label: "12:00-13:30" },
  { start: 840, end: 930, label: "14:00-15:30" },
];

export function buildSurgeryDataset(): PresetData {
  const slots: ReturnType<typeof slot>[] = [];
  DATES.forEach((date, di) => {
    OR_BLOCKS.forEach((b, bi) => {
      const s = slot(1, b.start, b.end, b.label, di * OR_BLOCKS.length + bi);
      s.dayOfWeek = undefined;
      s.date = date;
      slots.push(s);
    });
  });

  const availAllDays = DATES.map((d) => ({ date: d, startMinutes: 480, endMinutes: 930 }));

  const surgeons = [1, 2, 3, 4].map((n) =>
    person(`surgeon-${n}`, `Surgeon ${String.fromCharCode(64 + n)}`, ["surgeon"], availAllDays),
  );
  const helpers = [1, 2, 3, 4].map((n) =>
    person(`helper-${n}`, `Assistant ${n}`, ["assistant"], availAllDays),
  );
  const anesths = [1, 2, 3].map((n) =>
    person(`anesth-${n}`, `Anesthesiologist ${n}`, ["anesthesiologist"], availAllDays),
  );

  const pabellones = [
    location("pab-1", "OR 1", ["operating-room"], 1, ["laparoscopic", "standard"]),
    location("pab-2", "OR 2", ["operating-room"], 1, ["standard"]),
    location("pab-3", "OR 3", ["operating-room"], 1, ["laparoscopic", "standard", "robotic"]),
  ];

  const surgeonIds = surgeons.map((s) => s.id);
  const helperIds = helpers.map((h) => h.id);
  const anesthIds = anesths.map((a) => a.id);
  const pabIds = pabellones.map((p) => p.id);

  const procedures = Array.from({ length: 12 }, (_, i) => {
    const needsLaparoscopic = i % 3 === 0;
    const needsRobotic = i === 11;
    const requiredEquipment: string[] = ["standard"];
    if (needsLaparoscopic) requiredEquipment.push("laparoscopic");
    if (needsRobotic) requiredEquipment.push("robotic");
    return activity(
      `surgery-${i + 1}`,
      `Patient ${String(i + 1).padStart(3, "0")} — Procedure ${i + 1}`,
      "surgery",
      `patient-${i + 1}`,
      1,
      90,
      [
        requirement("surgeon", surgeonIds),
        requirement("assistant", helperIds),
        requirement("anesthesiologist", anesthIds),
        requirement("operating-room", pabIds),
      ],
      { requiredEquipment },
      1,
    );
  });

  const constraints = [
    constraint({ type: "equipmentCompatibility", hard: true, weight: 0, name: "Equipment compatibility" }),
    ...surgeonIds.map((sid) =>
      constraint({
        type: "minSeparation",
        hard: false,
        weight: 8,
        name: "Surgeon rest 120min",
        scope: "resource",
        refId: sid,
        minutes: 120,
      }),
    ),
    constraint({
      type: "preferredTime",
      hard: false,
      weight: 6,
      name: "Prefer morning",
      scope: "resource",
      refId: res("surgeon-1"),
      fromMinutes: 480,
      toMinutes: 720,
    }),
  ];

  return {
    name: "Operating Rooms — August 2026",
    description: "12 surgical procedures across 3 days, 4 surgeons, 4 assistants, 3 anesthesiologists and 3 ORs with equipment compatibility. (Demo only — no real clinical rules.)",
    preset: "surgery",
    timeRange: { startDate: "2026-08-15", endDate: "2026-08-17" },
    slots,
    resources: [...surgeons, ...helpers, ...anesths, ...pabellones],
    activities: procedures,
    constraints,
  };
}
