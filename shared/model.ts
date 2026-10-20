export type Page =
  | "overview"
  | "facilities"
  | "controls"
  | "cameras"
  | "fire"
  | "residents"
  | "admissions"
  | "services"
  | "programs"
  | "incidents"
  | "staff"
  | "maintenance"
  | "reports"
  | "settings";
export type Tone = "green" | "amber" | "red" | "blue" | "neutral";
export type Door = {
  id: string;
  name: string;
  zone: string;
  status: "Secured" | "Released" | "Held open";
  pair?: string;
  releaseUntil?: number;
};
export type Resident = {
  id: string;
  name: string;
  age: number;
  unit: string;
  room: string;
  admitted: string;
  caseManager: string;
  status: "In unit" | "In program" | "Health services";
  plan: string;
};
export type Incident = {
  id: string;
  title: string;
  category: string;
  priority: "Low" | "Medium" | "High";
  zone: string;
  status: "Open" | "In review" | "Resolved";
  description: string;
  created: string;
  reporter: string;
};
export type Activity = {
  id: string;
  time: string;
  title: string;
  detail: string;
  type: "system" | "access" | "safety" | "resident" | "incident" | "program";
};
export type Alarm = {
  id: string;
  zone: string;
  device: string;
  kind: "Fire alarm" | "Trouble" | "Supervisory";
  acknowledged: boolean;
  active: boolean;
  time: string;
};
export type Program = {
  id: string;
  name: string;
  category: string;
  time: string;
  duration: string;
  location: string;
  facilitator: string;
  capacity: number;
  roster: string[];
  status: "Scheduled" | "In session" | "Completed";
};
export type Staff = {
  id: string;
  name: string;
  initials: string;
  role: string;
  post: string;
  shift: string;
  status: "On duty" | "On break" | "Off duty";
};
export type WorkOrder = {
  id: string;
  title: string;
  zone: string;
  priority: "Routine" | "Urgent";
  status: "Open" | "In progress" | "Completed";
  assignee: string;
  created: string;
};
export type Appointment = {
  id: string;
  residentId: string;
  service:
    | "Health check"
    | "Family visit"
    | "Court hearing"
    | "Case review"
    | "Transition planning";
  date: string;
  time: string;
  owner: string;
  notes: string;
  status: "Scheduled" | "Checked in" | "Completed" | "Cancelled";
};
export type Simulation = {
  version: 1;
  doors: Door[];
  residents: Resident[];
  incidents: Incident[];
  activity: Activity[];
  alarms: Alarm[];
  silenced: boolean;
  programs: Program[];
  staff: Staff[];
  workOrders: WorkOrder[];
  appointments: Appointment[];
  discharged: (Resident & { dischargedAt: string; reason: string })[];
  settings: {
    facilityName: string;
    operator: string;
    shift: string;
    compact: boolean;
    sounds: boolean;
  };
};

export const zones = [
  {
    id: "A1",
    name: "Cedar House",
    label: "Housing A1",
    capacity: 16,
    color: "#e5eee1",
    type: "Residential",
    x: 65,
    y: 73,
    w: 195,
    h: 114,
  },
  {
    id: "A2",
    name: "Maple House",
    label: "Housing A2",
    capacity: 16,
    color: "#e5eee1",
    type: "Residential",
    x: 65,
    y: 227,
    w: 195,
    h: 114,
  },
  {
    id: "B1",
    name: "Oak House",
    label: "Housing B1",
    capacity: 16,
    color: "#e4ebe8",
    type: "Residential",
    x: 480,
    y: 73,
    w: 195,
    h: 114,
  },
  {
    id: "B2",
    name: "Willow House",
    label: "Housing B2",
    capacity: 16,
    color: "#e4ebe8",
    type: "Residential",
    x: 480,
    y: 227,
    w: 195,
    h: 114,
  },
  {
    id: "EDU",
    name: "Education",
    label: "Learning center",
    capacity: 0,
    color: "#f4ecd9",
    type: "Programs",
    x: 288,
    y: 73,
    w: 163,
    h: 84,
  },
  {
    id: "YARD",
    name: "Courtyard",
    label: "Recreation",
    capacity: 0,
    color: "#e6efdc",
    type: "Recreation",
    x: 288,
    y: 186,
    w: 163,
    h: 100,
  },
  {
    id: "MED",
    name: "Health services",
    label: "Wellness center",
    capacity: 0,
    color: "#e6e9f2",
    type: "Health",
    x: 288,
    y: 315,
    w: 163,
    h: 58,
  },
  {
    id: "INT",
    name: "Intake & reception",
    label: "Administration",
    capacity: 0,
    color: "#ece9e3",
    type: "Operations",
    x: 65,
    y: 379,
    w: 195,
    h: 65,
  },
  {
    id: "OPS",
    name: "Central control",
    label: "Operations",
    capacity: 0,
    color: "#dce7e2",
    type: "Operations",
    x: 480,
    y: 379,
    w: 195,
    h: 65,
  },
];
export function zoneName(id: string) {
  return zones.find((z) => z.id === id)?.name ?? id;
}
export function relativeTime(time: string) {
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(time).getTime()) / 60000),
  );
  return minutes < 1
    ? "Just now"
    : minutes < 60
      ? `${minutes} min ago`
      : minutes < 1440
        ? `${Math.floor(minutes / 60)} hr ago`
        : `${Math.floor(minutes / 1440)}d ago`;
}
export function clockTime(time: string) {
  return new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60000).toISOString();

export function createInitialState(): Simulation {
  const names = [
    "Alex Morgan",
    "Jordan Hayes",
    "Riley Brooks",
    "Taylor Reed",
    "Cameron Ellis",
    "Avery Parker",
    "Casey Bennett",
    "Quinn Foster",
    "Drew Collins",
    "Morgan Blake",
    "Jamie Rivers",
    "Skyler James",
    "Reese Carter",
    "Rowan Kelly",
    "Dakota Wells",
    "Emerson Cole",
    "Finley Grant",
    "Hayden Scott",
    "Peyton Lane",
    "Sage Mitchell",
    "Robin Brooks",
    "Charlie West",
    "Elliot Quinn",
    "River Mason",
    "Jules Adams",
    "Kendall Green",
    "Remy Turner",
    "Shiloh Davis",
    "Arden Lewis",
    "Blair Evans",
    "Devon Moore",
    "Frankie Bell",
    "Harper Stone",
    "Indigo Ross",
    "Jesse Hill",
    "Kai Wood",
    "Lane Cooper",
    "Marley Fox",
    "Noel Price",
    "Oakley Shaw",
    "Phoenix Gray",
    "Rory King",
    "Sam Carter",
    "Toby Nash",
    "Val Emery",
    "Winter Holt",
    "Wren Miller",
    "Zion Clarke",
  ];
  const residents: Resident[] = names.map((name, i) => ({
    id: `R-${String(1001 + i)}`,
    name,
    age: 14 + (i % 4),
    unit: ["A1", "A2", "B1", "B2"][Math.floor(i / 12)],
    room: `${String((i % 12) + 1).padStart(2, "0")}`,
    admitted: ago(1440 * (8 + i)),
    caseManager: ["J. Rivera", "S. Chen", "M. Patel"][i % 3],
    status: i < 12 ? "In program" : "In unit",
    plan: [
      "Education & transition",
      "Restorative pathway",
      "Family reintegration",
    ][i % 3],
  }));
  const doors: Door[] = zones.flatMap((z) => [
    {
      id: `${z.id}-01`,
      name: `${z.name} entry`,
      zone: z.id,
      status: "Secured" as const,
      pair: `${z.id}-02`,
    },
    {
      id: `${z.id}-02`,
      name: `${z.name} interior`,
      zone: z.id,
      status: "Secured" as const,
      pair: `${z.id}-01`,
    },
  ]);
  return {
    version: 1,
    residents,
    doors,
    alarms: [],
    silenced: false,
    discharged: [],
    appointments: [
      {
        id: "AP-101",
        residentId: "R-1001",
        service: "Health check",
        date: new Date().toLocaleDateString("en-CA"),
        time: "10:30",
        owner: "Noah Bailey",
        notes: "Routine wellbeing appointment. Fictional training record.",
        status: "Scheduled",
      },
      {
        id: "AP-102",
        residentId: "R-1005",
        service: "Family visit",
        date: new Date().toLocaleDateString("en-CA"),
        time: "15:00",
        owner: "Sky Martin",
        notes: "Family connection session in visiting room 1.",
        status: "Scheduled",
      },
      {
        id: "AP-103",
        residentId: "R-1013",
        service: "Court hearing",
        date: new Date().toLocaleDateString("en-CA"),
        time: "11:00",
        owner: "Alex Mitchell",
        notes: "Simulated remote review hearing; no external connection.",
        status: "Scheduled",
      },
      {
        id: "AP-104",
        residentId: "R-1025",
        service: "Case review",
        date: new Date().toLocaleDateString("en-CA"),
        time: "14:00",
        owner: "Morgan Patel",
        notes: "Review education goals and support pathway.",
        status: "Scheduled",
      },
      {
        id: "AP-105",
        residentId: "R-1037",
        service: "Transition planning",
        date: new Date().toLocaleDateString("en-CA"),
        time: "16:00",
        owner: "Sky Martin",
        notes: "Plan community resources and next steps.",
        status: "Scheduled",
      },
    ],
    settings: {
      facilityName: "Northwood Youth Center",
      operator: "Alex Mitchell",
      shift: "Day shift · 07:00–19:00",
      compact: false,
      sounds: false,
    },
    incidents: [
      {
        id: "INC-1042",
        title: "Scheduled headcount discrepancy",
        category: "Resident welfare",
        priority: "Medium",
        zone: "A2",
        status: "In review",
        description:
          "Initial count did not account for a resident attending education. All residents located; supervisor review pending.",
        created: ago(38),
        reporter: "S. Chen",
      },
      {
        id: "INC-1041",
        title: "Door position sensor intermittent",
        category: "Equipment",
        priority: "Low",
        zone: "B1",
        status: "Open",
        description:
          "Intermittent sensor feedback at Oak House entry. Maintenance notified; manual checks in place.",
        created: ago(96),
        reporter: "J. Rivera",
      },
      {
        id: "INC-1040",
        title: "Recreation activity support",
        category: "Resident welfare",
        priority: "Low",
        zone: "YARD",
        status: "Resolved",
        description:
          "Resident requested a break from group recreation. Staff provided a quiet space and supportive check-in.",
        created: ago(210),
        reporter: "M. Patel",
      },
    ],
    activity: [
      {
        id: "EV-1",
        time: ago(2),
        title: "Resident count verified",
        detail: "Cedar House · 12 of 12 residents accounted for",
        type: "resident",
      },
      {
        id: "EV-2",
        time: ago(7),
        title: "Education session started",
        detail: "Learning center · Academic foundations",
        type: "program",
      },
      {
        id: "EV-3",
        time: ago(11),
        title: "Access cycle completed",
        detail: "Maple House entry · Door secured",
        type: "access",
      },
      {
        id: "EV-4",
        time: ago(24),
        title: "Life safety system checked",
        detail: "All 9 zones normal · No active alarms",
        type: "safety",
      },
      {
        id: "EV-5",
        time: ago(38),
        title: "Incident moved to review",
        detail: "INC-1042 · Supervisor review requested",
        type: "incident",
      },
      {
        id: "EV-6",
        time: ago(60),
        title: "Day shift handover complete",
        detail: "Central control · A. Mitchell",
        type: "system",
      },
    ],
    programs: [
      {
        id: "PR-1",
        name: "Academic foundations",
        category: "Education",
        time: "09:00",
        duration: "90 min",
        location: "EDU",
        facilitator: "Dr. E. Warren",
        capacity: 16,
        roster: residents.slice(0, 12).map((r) => r.id),
        status: "In session",
      },
      {
        id: "PR-2",
        name: "Creative expression",
        category: "Wellbeing",
        time: "10:45",
        duration: "60 min",
        location: "EDU",
        facilitator: "S. Chen",
        capacity: 12,
        roster: residents.slice(12, 20).map((r) => r.id),
        status: "Scheduled",
      },
      {
        id: "PR-3",
        name: "Team recreation",
        category: "Recreation",
        time: "13:00",
        duration: "60 min",
        location: "YARD",
        facilitator: "J. Rivera",
        capacity: 20,
        roster: residents.slice(24, 39).map((r) => r.id),
        status: "Scheduled",
      },
      {
        id: "PR-4",
        name: "Restorative circles",
        category: "Life skills",
        time: "14:30",
        duration: "45 min",
        location: "EDU",
        facilitator: "M. Patel",
        capacity: 10,
        roster: residents.slice(35, 42).map((r) => r.id),
        status: "Scheduled",
      },
      {
        id: "PR-5",
        name: "Morning mindfulness",
        category: "Wellbeing",
        time: "07:30",
        duration: "30 min",
        location: "YARD",
        facilitator: "L. Thompson",
        capacity: 20,
        roster: residents.slice(8, 24).map((r) => r.id),
        status: "Completed",
      },
    ],
    staff: [
      {
        id: "ST-1",
        name: "Alex Mitchell",
        initials: "AM",
        role: "Shift supervisor",
        post: "Central control",
        shift: "Day",
        status: "On duty",
      },
      {
        id: "ST-2",
        name: "Jordan Rivera",
        initials: "JR",
        role: "Youth care specialist",
        post: "Cedar House",
        shift: "Day",
        status: "On duty",
      },
      {
        id: "ST-3",
        name: "Sam Chen",
        initials: "SC",
        role: "Youth care specialist",
        post: "Maple House",
        shift: "Day",
        status: "On duty",
      },
      {
        id: "ST-4",
        name: "Morgan Patel",
        initials: "MP",
        role: "Youth care specialist",
        post: "Oak House",
        shift: "Day",
        status: "On duty",
      },
      {
        id: "ST-5",
        name: "Lee Thompson",
        initials: "LT",
        role: "Youth care specialist",
        post: "Willow House",
        shift: "Day",
        status: "On break",
      },
      {
        id: "ST-6",
        name: "Emma Warren",
        initials: "EW",
        role: "Education specialist",
        post: "Learning center",
        shift: "Day",
        status: "On duty",
      },
      {
        id: "ST-7",
        name: "Noah Bailey",
        initials: "NB",
        role: "Health practitioner",
        post: "Health services",
        shift: "Day",
        status: "On duty",
      },
      {
        id: "ST-8",
        name: "Ari Simmons",
        initials: "AS",
        role: "Facilities technician",
        post: "Facilities",
        shift: "Day",
        status: "On duty",
      },
      {
        id: "ST-9",
        name: "Chris Taylor",
        initials: "CT",
        role: "Control operator",
        post: "Central control",
        shift: "Night",
        status: "Off duty",
      },
      {
        id: "ST-10",
        name: "Dani Campbell",
        initials: "DC",
        role: "Youth care specialist",
        post: "Cedar House",
        shift: "Night",
        status: "Off duty",
      },
      {
        id: "ST-11",
        name: "Evan Reid",
        initials: "ER",
        role: "Youth care specialist",
        post: "Oak House",
        shift: "Night",
        status: "Off duty",
      },
      {
        id: "ST-12",
        name: "Sky Martin",
        initials: "SM",
        role: "Case coordinator",
        post: "Administration",
        shift: "Day",
        status: "On duty",
      },
    ],
    workOrders: [
      {
        id: "WO-201",
        title: "Inspect entry door position sensor",
        zone: "B1",
        priority: "Routine",
        status: "Open",
        assignee: "Ari Simmons",
        created: ago(96),
      },
      {
        id: "WO-202",
        title: "Quarterly HVAC filter replacement",
        zone: "EDU",
        priority: "Routine",
        status: "In progress",
        assignee: "Ari Simmons",
        created: ago(1440),
      },
      {
        id: "WO-203",
        title: "Replace courtyard light fitting",
        zone: "YARD",
        priority: "Routine",
        status: "Completed",
        assignee: "Ari Simmons",
        created: ago(2880),
      },
    ],
  };
}
