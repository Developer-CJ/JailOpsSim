import type { Simulation } from "./model.ts";

export const campusIds = [
  "A1",
  "A2",
  "B1",
  "B2",
  "EDU",
  "YARD",
  "MED",
  "INT",
  "OPS",
];
export const drillTemplates = {
  "Fire response": [
    "Identify the affected zone",
    "Acknowledge the panel event",
    "Silence notification outputs",
    "Restore the initiating source",
    "Reset the panel and verify normal",
  ],
  "Access interlock": [
    "Inspect the paired doors",
    "Release the entry door",
    "Verify the interior interlock",
    "Wait for automatic securing",
    "Confirm both doors secured",
  ],
  "Resident accountability": [
    "Start a housing headcount",
    "Verify resident identities",
    "Record the count result",
    "Review discrepancies",
    "Brief the incoming shift",
  ],
} as const;
export type DrillKind = keyof typeof drillTemplates;
export type Headcount = {
  id: string;
  zone: string;
  expected: { id: string; name: string; room: string }[];
  present: string[];
  status: "In progress" | "Completed";
  started: string;
  completed?: string;
  operator: string;
};
export type Movement = {
  id: string;
  residentId: string;
  residentName: string;
  origin: string;
  destination: string;
  escort: string;
  purpose: string;
  status: "Queued" | "En route" | "Arrived" | "Cancelled";
  created: string;
  updated: string;
};
export type Patrol = {
  id: string;
  officer: string;
  checkpoints: { zone: string; checkedAt?: string; note?: string }[];
  status: "On patrol" | "Completed";
  started: string;
  completed?: string;
};
export type IntercomCall = {
  id: string;
  zone: string;
  reason: string;
  status: "Waiting" | "Connected" | "Ended";
  created: string;
  answered?: string;
  ended?: string;
};
export type Announcement = {
  id: string;
  zones: string[];
  message: string;
  priority: "Routine" | "Urgent";
  time: string;
  operator: string;
};
export type Asset = {
  id: string;
  name: string;
  category: "Key set" | "Radio" | "Equipment";
  holder?: string;
  checkedOut?: string;
  returned?: string;
};
export type Handover = {
  id: string;
  title: string;
  note: string;
  priority: "Routine" | "Important";
  owner: string;
  status: "Open" | "Completed";
  created: string;
  completed?: string;
};
export type Drill = {
  id: string;
  kind: DrillKind;
  zone: string;
  steps: boolean[];
  status: "Running" | "Completed";
  started: string;
  completed?: string;
  score?: number;
};
export type Expansion = {
  schema: 1;
  headcounts: Headcount[];
  movements: Movement[];
  locations: Record<string, string>;
  patrols: Patrol[];
  calls: IntercomCall[];
  announcements: Announcement[];
  utilities: Record<
    string,
    {
      lighting: "Day" | "Evening" | "Night";
      temperature: number;
      ventilation: "Auto" | "Boost";
    }
  >;
  assets: Asset[];
  handovers: Handover[];
  drills: Drill[];
};
export function initialExpansion(): Expansion {
  return {
    schema: 1,
    headcounts: [],
    movements: [],
    locations: {},
    patrols: [],
    calls: [],
    announcements: [],
    utilities: Object.fromEntries(
      campusIds.map((id) => [
        id,
        { lighting: "Day", temperature: 21, ventilation: "Auto" },
      ]),
    ),
    assets: [
      { id: "KEY-01", name: "Housing A training keys", category: "Key set" },
      { id: "KEY-02", name: "Housing B training keys", category: "Key set" },
      { id: "RAD-01", name: "Portable radio 01", category: "Radio" },
      { id: "RAD-02", name: "Portable radio 02", category: "Radio" },
      { id: "EQ-01", name: "Patrol inspection tablet", category: "Equipment" },
      { id: "EQ-02", name: "First aid training kit", category: "Equipment" },
    ],
    handovers: [],
    drills: [],
  };
}
export type ExpansionAction =
  | { type: "headcountStart"; zone: string }
  | { type: "headcountMark"; id: string; residentId: string; present: boolean }
  | { type: "headcountFinish"; id: string }
  | {
      type: "movementCreate";
      residentId: string;
      destination: string;
      escort: string;
      purpose: string;
    }
  | { type: "movementStatus"; id: string; status: Movement["status"] }
  | { type: "patrolStart"; officer: string }
  | { type: "patrolCheck"; id: string; zone: string; note: string }
  | { type: "patrolFinish"; id: string }
  | { type: "intercomCreate"; zone: string; reason: string }
  | { type: "intercomStatus"; id: string; status: IntercomCall["status"] }
  | {
      type: "announcement";
      zones: string[];
      message: string;
      priority: Announcement["priority"];
    }
  | {
      type: "utility";
      zone: string;
      lighting: "Day" | "Evening" | "Night";
      temperature: number;
      ventilation: "Auto" | "Boost";
    }
  | { type: "assetCheckout"; id: string; holder: string }
  | { type: "assetReturn"; id: string }
  | {
      type: "handoverCreate";
      title: string;
      note: string;
      priority: Handover["priority"];
      owner: string;
    }
  | { type: "handoverFinish"; id: string }
  | { type: "drillStart"; kind: DrillKind; zone: string }
  | { type: "drillStep"; id: string; step: number }
  | { type: "drillFinish"; id: string };
export const expansionTypes = [
  "headcountStart",
  "headcountMark",
  "headcountFinish",
  "movementCreate",
  "movementStatus",
  "patrolStart",
  "patrolCheck",
  "patrolFinish",
  "intercomCreate",
  "intercomStatus",
  "announcement",
  "utility",
  "assetCheckout",
  "assetReturn",
  "handoverCreate",
  "handoverFinish",
  "drillStart",
  "drillStep",
  "drillFinish",
];
export function reduceExpansion(s: Simulation, a: ExpansionAction): Simulation {
  let x: Expansion = { ...s.extension };
  const now = new Date().toISOString(),
    id = crypto.randomUUID();
  let title = "",
    detail = "",
    category: "system" | "resident" | "access" | "safety" = "system";
  switch (a.type) {
    case "headcountStart": {
      const expected = s.residents
        .filter((r) => r.unit === a.zone)
        .map(({ id, name, room }) => ({ id, name, room }));
      x.headcounts = [
        {
          id,
          zone: a.zone,
          expected,
          present: [],
          status: "In progress",
          started: now,
          operator: s.settings.operator,
        },
        ...x.headcounts,
      ];
      title = "Headcount started";
      detail = `${a.zone} · ${expected.length} expected`;
      category = "resident";
      break;
    }
    case "headcountMark":
      x.headcounts = x.headcounts.map((c) =>
        c.id === a.id
          ? {
              ...c,
              present: a.present
                ? [...new Set([...c.present, a.residentId])]
                : c.present.filter((id) => id !== a.residentId),
            }
          : c,
      );
      title = "Headcount identity verified";
      detail = a.residentId;
      category = "resident";
      break;
    case "headcountFinish":
      x.headcounts = x.headcounts.map((c) =>
        c.id === a.id ? { ...c, status: "Completed", completed: now } : c,
      );
      title = "Headcount completed";
      detail = a.id;
      category = "resident";
      break;
    case "movementCreate": {
      const r = s.residents.find((r) => r.id === a.residentId)!;
      x.movements = [
        {
          id,
          residentId: r.id,
          residentName: r.name,
          origin: x.locations[r.id] ?? r.unit,
          destination: a.destination,
          escort: a.escort,
          purpose: a.purpose,
          status: "Queued",
          created: now,
          updated: now,
        },
        ...x.movements,
      ];
      title = "Escorted movement queued";
      detail = `${r.name} → ${a.destination} · ${a.escort}`;
      category = "resident";
      break;
    }
    case "movementStatus": {
      const m = x.movements.find((m) => m.id === a.id)!;
      x.movements = x.movements.map((m) =>
        m.id === a.id ? { ...m, status: a.status, updated: now } : m,
      );
      if (a.status === "Arrived")
        x.locations = { ...x.locations, [m.residentId]: m.destination };
      title = `Movement ${a.status.toLowerCase()}`;
      detail = `${m.residentName} · ${m.origin} → ${m.destination}`;
      category = "resident";
      break;
    }
    case "patrolStart":
      x.patrols = [
        {
          id,
          officer: a.officer,
          checkpoints: campusIds.map((zone) => ({ zone })),
          status: "On patrol",
          started: now,
        },
        ...x.patrols,
      ];
      title = "Patrol round started";
      detail = a.officer;
      category = "access";
      break;
    case "patrolCheck":
      x.patrols = x.patrols.map((p) =>
        p.id === a.id
          ? {
              ...p,
              checkpoints: p.checkpoints.map((c) =>
                c.zone === a.zone ? { ...c, checkedAt: now, note: a.note } : c,
              ),
            }
          : p,
      );
      title = "Patrol checkpoint verified";
      detail = `${a.zone} · ${a.note || "No exceptions"}`;
      category = "access";
      break;
    case "patrolFinish":
      x.patrols = x.patrols.map((p) =>
        p.id === a.id ? { ...p, status: "Completed", completed: now } : p,
      );
      title = "Patrol round completed";
      detail = a.id;
      category = "access";
      break;
    case "intercomCreate":
      x.calls = [
        { id, zone: a.zone, reason: a.reason, status: "Waiting", created: now },
        ...x.calls,
      ];
      title = "Intercom call received";
      detail = `${a.zone} · ${a.reason}`;
      break;
    case "intercomStatus":
      x.calls = x.calls.map((c) =>
        c.id === a.id
          ? {
              ...c,
              status: a.status,
              ...(a.status === "Connected"
                ? { answered: now }
                : { ended: now }),
            }
          : c,
      );
      title = `Intercom call ${a.status.toLowerCase()}`;
      detail = a.id;
      break;
    case "announcement":
      x.announcements = [
        {
          id,
          zones: a.zones,
          message: a.message,
          priority: a.priority,
          time: now,
          operator: s.settings.operator,
        },
        ...x.announcements,
      ];
      title = "PA announcement dispatched";
      detail = `${a.zones.join(", ")} · ${a.message}`;
      break;
    case "utility":
      x.utilities = {
        ...x.utilities,
        [a.zone]: {
          lighting: a.lighting,
          temperature: a.temperature,
          ventilation: a.ventilation,
        },
      };
      title = "Zone environment updated";
      detail = `${a.zone} · ${a.lighting} · ${a.temperature}°C · ${a.ventilation}`;
      break;
    case "assetCheckout":
      x.assets = x.assets.map((v) =>
        v.id === a.id
          ? { ...v, holder: a.holder, checkedOut: now, returned: undefined }
          : v,
      );
      title = "Asset checked out";
      detail = `${a.id} · ${a.holder}`;
      category = "access";
      break;
    case "assetReturn":
      x.assets = x.assets.map((v) =>
        v.id === a.id ? { ...v, holder: undefined, returned: now } : v,
      );
      title = "Asset returned";
      detail = a.id;
      category = "access";
      break;
    case "handoverCreate":
      x.handovers = [
        {
          id,
          title: a.title,
          note: a.note,
          priority: a.priority,
          owner: a.owner,
          status: "Open",
          created: now,
        },
        ...x.handovers,
      ];
      title = "Shift handover added";
      detail = `${a.title} · ${a.owner}`;
      break;
    case "handoverFinish":
      x.handovers = x.handovers.map((h) =>
        h.id === a.id ? { ...h, status: "Completed", completed: now } : h,
      );
      title = "Handover task completed";
      detail = a.id;
      break;
    case "drillStart":
      if (
        a.kind === "Fire response" &&
        !s.alarms.some(
          (v) => v.zone === a.zone && v.kind === "Fire alarm" && v.active,
        )
      )
        s = {
          ...s,
          silenced: false,
          alarms: [
            ...s.alarms,
            {
              id: crypto.randomUUID(),
              zone: a.zone,
              device: "Training smoke detector · SD-01",
              kind: "Fire alarm",
              active: true,
              acknowledged: false,
              time: now,
            },
          ],
        };
      x.drills = [
        {
          id,
          kind: a.kind,
          zone: a.zone,
          steps: drillTemplates[a.kind].map(() => false),
          status: "Running",
          started: now,
        },
        ...x.drills,
      ];
      title = "Guided drill started";
      detail = `${a.kind} · ${a.zone}`;
      category = "safety";
      break;
    case "drillStep":
      x.drills = x.drills.map((d) =>
        d.id === a.id
          ? { ...d, steps: d.steps.map((v, i) => (i === a.step ? true : v)) }
          : d,
      );
      title = "Drill step verified";
      detail = `${a.id} · Step ${a.step + 1}`;
      category = "safety";
      break;
    case "drillFinish":
      x.drills = x.drills.map((d) =>
        d.id === a.id
          ? {
              ...d,
              status: "Completed",
              completed: now,
              score: Math.round(
                (d.steps.filter(Boolean).length / d.steps.length) * 100,
              ),
            }
          : d,
      );
      title = "Guided drill completed";
      detail = a.id;
      category = "safety";
      break;
  }
  return {
    ...s,
    extension: x,
    activity: [
      { id, time: now, title, detail, type: category },
      ...s.activity,
    ].slice(0, 250),
  };
}
