import type { PresetData } from "./types";
import { slot, availability, person, location, activity, requirement, constraint, res } from "./builders";
import type { ResourceId } from "@/domain/ids";

const BLOCKS = [
  { start: 510, end: 600, label: "08:30-10:00" },
  { start: 615, end: 705, label: "10:15-11:45" },
  { start: 720, end: 810, label: "12:00-13:30" },
  { start: 870, end: 960, label: "14:30-16:00" },
  { start: 975, end: 1065, label: "16:15-17:45" },
];
const DAYS = [1, 2, 3, 4, 5];
const FULL = 510;
const FULL_END = 1065;
const MORNING_END = 810;
const AFTERNOON = 870;

function fullWeek(start: number, end: number) {
  return DAYS.map((d) => availability(d, start, end));
}

export function buildAcademicDataset(): PresetData {
  const slots = BLOCKS.map((b, i) => DAYS.map((d) => slot(d, b.start, b.end, b.label, i))).flat();

  const teachers: ReturnType<typeof person>[] = [
    person("prof-1", "Carlos Martínez", ["teacher"], [
      availability(1, FULL, FULL_END),
      availability(3, FULL, FULL_END),
      availability(5, FULL, FULL_END),
    ]),
    person("prof-2", "Ana Torres", ["teacher"], [
      availability(2, FULL, FULL_END),
      availability(4, FULL, FULL_END),
    ]),
    person("prof-3", "Luis Rojas", ["teacher"], fullWeek(FULL, MORNING_END)),
    person("prof-4", "Marta Vidal", ["teacher"], fullWeek(AFTERNOON, FULL_END)),
    person("prof-5", "Jorge Campos", ["teacher"], [
      availability(1, FULL, FULL_END),
      availability(2, FULL, FULL_END),
      availability(3, FULL, FULL_END),
    ]),
    person("prof-6", "Sofía Núñez", ["teacher"], [
      availability(3, FULL, FULL_END),
      availability(4, FULL, FULL_END),
      availability(5, FULL, FULL_END),
    ]),
    person("prof-7", "Diego Herrera", ["teacher"], fullWeek(FULL, FULL_END)),
    person("prof-8", "Elena Castro", ["teacher"], fullWeek(FULL, FULL_END)),
    person("prof-9", "Pablo Medina", ["teacher"], [
      availability(1, AFTERNOON, FULL_END),
      availability(3, AFTERNOON, FULL_END),
      availability(5, AFTERNOON, FULL_END),
    ]),
    person("prof-10", "Lucía Fernández", ["teacher"], [
      availability(2, FULL, FULL_END),
      availability(4, FULL, FULL_END),
    ]),
  ];

  const rooms = [
    location("room-1", "A101", ["room"], 25),
    location("room-2", "A102", ["room"], 30),
    location("room-3", "A103", ["room"], 30),
    location("room-4", "B201", ["room"], 40),
    location("room-5", "B202", ["room"], 40),
    location("room-6", "B204", ["room"], 45),
    location("room-7", "C301", ["room"], 50),
    location("room-8", "C302", ["room"], 60),
  ];

  const courses = [
    { id: "course-1", name: "Software Engineering 2026", size: 35 },
    { id: "course-2", name: "Data Science 2026", size: 40 },
    { id: "course-3", name: "Cybersecurity 2026", size: 30 },
    { id: "course-4", name: "Cloud & DevOps 2026", size: 25 },
    { id: "course-5", name: "AI & Machine Learning 2026", size: 45 },
    { id: "course-6", name: "Mobile Development 2026", size: 30 },
  ];

  const subjectPool = [
    "Software Architecture", "Algorithms & Data Structures", "Databases II", "Distributed Systems",
    "Statistics", "Machine Learning Foundations", "Data Visualization", "Big Data Processing",
    "Network Security", "Cryptography", "Ethical Hacking", "Security Operations",
    "Cloud Architecture", "CI/CD Pipelines", "Container Orchestration", "Infrastructure as Code",
    "Deep Learning", "Reinforcement Learning", "NLP", "Computer Vision",
    "Mobile UI", "React Native", "iOS Development", "Android Development",
  ];

  const subjectSpecs: {
    course: number;
    name: string;
    count: number;
    teachers: string[];
  }[] = [
    { course: 0, name: subjectPool[0]!, count: 3, teachers: ["prof-1", "prof-7"] },
    { course: 0, name: subjectPool[1]!, count: 2, teachers: ["prof-7", "prof-8"] },
    { course: 0, name: subjectPool[2]!, count: 2, teachers: ["prof-1", "prof-8"] },
    { course: 1, name: subjectPool[4]!, count: 3, teachers: ["prof-2", "prof-5"] },
    { course: 1, name: subjectPool[5]!, count: 2, teachers: ["prof-5", "prof-7"] },
    { course: 1, name: subjectPool[6]!, count: 2, teachers: ["prof-2", "prof-6"] },
    { course: 2, name: subjectPool[8]!, count: 3, teachers: ["prof-3", "prof-9"] },
    { course: 2, name: subjectPool[9]!, count: 2, teachers: ["prof-9", "prof-10"] },
    { course: 2, name: subjectPool[10]!, count: 2, teachers: ["prof-3", "prof-10"] },
    { course: 3, name: subjectPool[12]!, count: 2, teachers: ["prof-4", "prof-6"] },
    { course: 3, name: subjectPool[13]!, count: 3, teachers: ["prof-6", "prof-8"] },
    { course: 3, name: subjectPool[14]!, count: 2, teachers: ["prof-4", "prof-8"] },
    { course: 4, name: subjectPool[16]!, count: 3, teachers: ["prof-7", "prof-5"] },
    { course: 4, name: subjectPool[17]!, count: 2, teachers: ["prof-5", "prof-1"] },
    { course: 4, name: subjectPool[18]!, count: 2, teachers: ["prof-7", "prof-2"] },
    { course: 5, name: subjectPool[20]!, count: 2, teachers: ["prof-10", "prof-3"] },
    { course: 5, name: subjectPool[21]!, count: 3, teachers: ["prof-3", "prof-6"] },
    { course: 5, name: subjectPool[22]!, count: 2, teachers: ["prof-10", "prof-6"] },
  ];

  const activities = subjectSpecs.map((spec, i) => {
    const course = courses[spec.course]!;
    const candidateRooms = rooms.filter((r) => (r.attributes["capacity"] as number) >= course.size).map((r) => r.id);
    return activity(
      `act-${i + 1}`,
      `${course.name.split(" 2026")[0]} — ${spec.name}`,
      "class",
      course.id,
      spec.count,
      90,
      [
        requirement("teacher", spec.teachers.map((t) => res(t))),
        requirement("room", candidateRooms),
      ],
      { size: course.size },
    );
  });

  const constraints = [
    constraint({ type: "resourceCapacity", hard: true, weight: 0, name: "Room capacity" }),
    constraint({
      type: "blockedSlot",
      hard: true,
      weight: 0,
      name: "B204 blocked Mon 12:00",
      resourceId: res("room-6"),
      slotIds: [slots.find((s) => s.dayOfWeek === 1 && s.startMinutes === 720)!.id],
    }),
    constraint({
      type: "preferredTime",
      hard: false,
      weight: 8,
      name: "Prof-7 prefers morning",
      scope: "resource",
      refId: res("prof-7"),
      fromMinutes: FULL,
      toMinutes: MORNING_END,
    }),
    constraint({
      type: "preferredTime",
      hard: false,
      weight: 6,
      name: "Prof-3 prefers morning",
      scope: "resource",
      refId: res("prof-3"),
      fromMinutes: FULL,
      toMinutes: MORNING_END,
    }),
    constraint({
      type: "uniformDistribution",
      hard: false,
      weight: 5,
      name: "Course-1 spread across week",
      groupId: "course-1",
    }),
    ...courses.map((c) =>
      constraint({
        type: "maxActivitiesPerDay",
        hard: true,
        weight: 0,
        name: `${c.name} max 3/day`,
        scope: "group",
        refId: c.id,
        max: 3,
      }),
    ),
  ];

  return {
    name: "University Schedule 2026",
    description: "6 courses, 18 subjects, 10 professors, 8 rooms across 5 weekdays with availability and preferences.",
    preset: "academic",
    timeRange: { startDate: "2026-03-01", endDate: "2026-07-31" },
    slots,
    resources: [...teachers, ...rooms],
    activities,
    constraints,
  };
}

export type { ResourceId };
