import type { PresetData } from "./types";
import { slot, person, location, activity, requirement, constraint, res } from "./builders";

const SATURDAYS = ["2026-08-01", "2026-08-08", "2026-08-15", "2026-08-22"];
const MATCH_BLOCKS = [
  { start: 600, end: 690, label: "10:00-11:30" },
  { start: 720, end: 810, label: "12:00-13:30" },
  { start: 840, end: 930, label: "14:00-15:30" },
  { start: 960, end: 1050, label: "16:00-17:30" },
  { start: 1080, end: 1170, label: "18:00-19:30" },
];

export function buildSportsDataset(): PresetData {
  const slots: ReturnType<typeof slot>[] = [];
  SATURDAYS.forEach((date, di) => {
    MATCH_BLOCKS.forEach((b, bi) => {
      const s = slot(6, b.start, b.end, b.label, di * MATCH_BLOCKS.length + bi);
      s.dayOfWeek = undefined;
      s.date = date;
      slots.push(s);
    });
  });

  const teams = [1, 2, 3, 4, 5, 6].map((n) =>
    person(`team-${n}`, `Team ${String.fromCharCode(64 + n)}`, ["team"], []),
  );
  const refAvail = SATURDAYS.map((d) => ({ date: d, startMinutes: 600, endMinutes: 1170 }));
  const referees = [1, 2, 3, 4].map((n) =>
    person(`ref-${n}`, `Referee ${n}`, ["referee"], refAvail),
  );
  const pitches = [1, 2, 3].map((n) => location(`pitch-${n}`, `Pitch ${n}`, ["pitch"], 100));

  const teamIds = teams.map((t) => t.id);
  const pitchIds = pitches.map((p) => p.id);
  const refIds = referees.map((r) => r.id);

  const matches: ReturnType<typeof activity>[] = [];
  let matchIdx = 1;
  for (let i = 0; i < teamIds.length; i += 1) {
    for (let j = i + 1; j < teamIds.length; j += 1) {
      matches.push(
        activity(
          `match-${matchIdx}`,
          `Team ${String.fromCharCode(65 + i)} vs Team ${String.fromCharCode(65 + j)}`,
          "match",
          `matchday`,
          1,
          90,
          [
            requirement("team-home", [teamIds[i]!]),
            requirement("team-away", [teamIds[j]!]),
            requirement("pitch", pitchIds),
            requirement("referee", refIds),
          ],
          {},
          1,
        ),
      );
      matchIdx += 1;
    }
  }

  const constraints = [
    constraint({
      type: "preferredTime",
      hard: false,
      weight: 5,
      name: "Prefer afternoon",
      scope: "resource",
      refId: res("pitch-1"),
      fromMinutes: 720,
      toMinutes: 1180,
    }),
    ...teamIds.map((tid) =>
      constraint({
        type: "maxActivitiesPerDay",
        hard: true,
        weight: 0,
        name: `Team max 2/day`,
        scope: "resource",
        refId: tid,
        max: 2,
      }),
    ),
    ...teamIds.map((tid) =>
      constraint({
        type: "minSeparation",
        hard: false,
        weight: 10,
        name: `Team rest 180min`,
        scope: "resource",
        refId: tid,
        minutes: 180,
      }),
    ),
  ];

  return {
    name: "Winter Championship 2026",
    description: "6-team round-robin (15 matches) across 4 Saturdays, 3 pitches and 4 referees with rest constraints.",
    preset: "sports",
    timeRange: { startDate: "2026-08-01", endDate: "2026-08-22" },
    slots,
    resources: [...teams, ...referees, ...pitches],
    activities: matches,
    constraints,
  };
}
