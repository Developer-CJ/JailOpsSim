import { z } from "zod";
import { campusIds, drillTemplates } from "../shared/expansion.ts";
import { ApiError } from "./database.js";
const id = z.string().min(1).max(80),
  zone = z.enum(campusIds),
  text = (max = 200) => z.string().trim().min(1).max(max);
export const expansionSchemas = [
  z.object({
    type: z.literal("headcountStart"),
    zone: z.enum(["A1", "A2", "B1", "B2"]),
  }),
  z.object({
    type: z.literal("headcountMark"),
    id,
    residentId: id,
    present: z.boolean(),
  }),
  z.object({ type: z.literal("headcountFinish"), id }),
  z.object({
    type: z.literal("movementCreate"),
    residentId: id,
    destination: zone,
    escort: text(100),
    purpose: text(300),
  }),
  z.object({
    type: z.literal("movementStatus"),
    id,
    status: z.enum(["Queued", "En route", "Arrived", "Cancelled"]),
  }),
  z.object({ type: z.literal("patrolStart"), officer: text(100) }),
  z.object({
    type: z.literal("patrolCheck"),
    id,
    zone,
    note: z.string().trim().max(500),
  }),
  z.object({ type: z.literal("patrolFinish"), id }),
  z.object({ type: z.literal("intercomCreate"), zone, reason: text(300) }),
  z.object({
    type: z.literal("intercomStatus"),
    id,
    status: z.enum(["Waiting", "Connected", "Ended"]),
  }),
  z.object({
    type: z.literal("announcement"),
    zones: z
      .array(zone)
      .min(1)
      .max(9)
      .refine((v) => new Set(v).size === v.length),
    message: text(1000),
    priority: z.enum(["Routine", "Urgent"]),
  }),
  z.object({
    type: z.literal("utility"),
    zone,
    lighting: z.enum(["Day", "Evening", "Night"]),
    temperature: z.number().int().min(16).max(28),
    ventilation: z.enum(["Auto", "Boost"]),
  }),
  z.object({ type: z.literal("assetCheckout"), id, holder: text(100) }),
  z.object({ type: z.literal("assetReturn"), id }),
  z.object({
    type: z.literal("handoverCreate"),
    title: text(120),
    note: text(1500),
    priority: z.enum(["Routine", "Important"]),
    owner: text(100),
  }),
  z.object({ type: z.literal("handoverFinish"), id }),
  z.object({
    type: z.literal("drillStart"),
    kind: z.enum(Object.keys(drillTemplates)),
    zone,
  }),
  z.object({
    type: z.literal("drillStep"),
    id,
    step: z.number().int().min(0).max(4),
  }),
  z.object({ type: z.literal("drillFinish"), id }),
];
const conflict = (message) => {
  throw new ApiError(409, message);
};
const record = (rows, id) => {
  const r = rows.find((r) => r.id === id);
  if (!r) throw new ApiError(404, "The selected record no longer exists.");
  return r;
};
const duty = (s, name) => {
  if (!s.staff.some((v) => v.name === name && v.status === "On duty"))
    conflict("Select a staff member who is on duty.");
};
export function validateExpansion(s, a) {
  const x = s.extension;
  switch (a.type) {
    case "headcountStart":
      if (
        x.headcounts.some(
          (c) => c.zone === a.zone && c.status === "In progress",
        )
      )
        conflict("A count is already in progress for this house.");
      if (!s.residents.some((r) => r.unit === a.zone))
        conflict("This house has no residents to count.");
      break;
    case "headcountMark": {
      const c = record(x.headcounts, a.id);
      if (
        c.status !== "In progress" ||
        !c.expected.some((r) => r.id === a.residentId)
      )
        conflict("This identity cannot be changed on this count.");
      break;
    }
    case "headcountFinish":
      if (record(x.headcounts, a.id).status !== "In progress")
        conflict("This count is already completed.");
      break;
    case "movementCreate": {
      const r = record(s.residents, a.residentId);
      duty(s, a.escort);
      if ((x.locations[r.id] ?? r.unit) === a.destination)
        conflict("Select a destination different from the current location.");
      if (
        x.movements.some(
          (m) =>
            m.residentId === a.residentId &&
            ["Queued", "En route"].includes(m.status),
        )
      )
        conflict("This resident already has an active movement.");
      break;
    }
    case "movementStatus": {
      const m = record(x.movements, a.id);
      if (
        !(
          {
            Queued: ["En route", "Cancelled"],
            "En route": ["Arrived", "Cancelled"],
          }[m.status] ?? []
        ).includes(a.status)
      )
        conflict("This movement cannot make that transition.");
      if (a.status === "En route") {
        record(s.residents, m.residentId);
        duty(s, m.escort);
      }
      break;
    }
    case "patrolStart":
      duty(s, a.officer);
      if (
        x.patrols.some(
          (p) => p.officer === a.officer && p.status === "On patrol",
        )
      )
        conflict("This officer already has an active patrol.");
      break;
    case "patrolCheck": {
      const p = record(x.patrols, a.id);
      if (
        p.status !== "On patrol" ||
        p.checkpoints.find((c) => c.zone === a.zone)?.checkedAt
      )
        conflict(
          "This checkpoint is already verified or the patrol is closed.",
        );
      break;
    }
    case "patrolFinish": {
      const p = record(x.patrols, a.id);
      if (p.status !== "On patrol" || p.checkpoints.some((c) => !c.checkedAt))
        conflict("Verify every checkpoint before completing this patrol.");
      break;
    }
    case "intercomCreate":
      if (x.calls.some((c) => c.zone === a.zone && c.status !== "Ended"))
        conflict("An intercom call is already active at this station.");
      break;
    case "intercomStatus": {
      const c = record(x.calls, a.id);
      if (
        !(
          { Waiting: ["Connected", "Ended"], Connected: ["Ended"] }[c.status] ??
          []
        ).includes(a.status)
      )
        conflict("This call cannot make that transition.");
      if (
        a.status === "Connected" &&
        x.calls.some((c) => c.status === "Connected")
      )
        conflict("End the connected call before answering another station.");
      break;
    }
    case "assetCheckout": {
      const v = record(x.assets, a.id);
      if (v.holder) conflict("This asset is already checked out.");
      duty(s, a.holder);
      break;
    }
    case "assetReturn":
      if (!record(x.assets, a.id).holder)
        conflict("This asset is already available.");
      break;
    case "handoverCreate":
      if (!s.staff.some((v) => v.name === a.owner))
        throw new ApiError(400, "Select a valid handover owner.");
      break;
    case "handoverFinish":
      if (record(x.handovers, a.id).status !== "Open")
        conflict("This task is already complete.");
      break;
    case "drillStart":
      if (x.drills.some((d) => d.status === "Running"))
        conflict("Complete the current guided drill first.");
      if (
        a.kind === "Resident accountability" &&
        !["A1", "A2", "B1", "B2"].includes(a.zone)
      )
        conflict("Choose a housing zone for an accountability drill.");
      break;
    case "drillStep": {
      const d = record(x.drills, a.id);
      if (
        d.status !== "Running" ||
        d.steps[a.step] ||
        d.steps.slice(0, a.step).some((v) => !v)
      )
        conflict("Complete the drill steps in order.");
      if (d.kind === "Fire response") {
        const events = s.alarms.filter((v) => v.zone === d.zone);
        if (a.step === 0 && !events.length)
          conflict("Identify the active event in the fire panel first.");
        if (
          a.step === 1 &&
          (!events.length || events.some((v) => !v.acknowledged))
        )
          conflict("Acknowledge the event in the fire panel first.");
        if (a.step === 2 && !s.silenced)
          conflict("Silence the panel notification outputs first.");
        if (a.step === 3 && (!events.length || events.some((v) => v.active)))
          conflict("Restore the initiating source in the panel first.");
        if (a.step === 4 && s.alarms.length)
          conflict("Reset the fire panel and verify system normal first.");
      }
      if (d.kind === "Access interlock") {
        const doors = s.doors.filter((v) => v.zone === d.zone);
        if (
          [1, 2].includes(a.step) &&
          !doors.some((v) => v.status === "Released")
        )
          conflict("Release an entry door in Central control first.");
        if (
          a.step === 2 &&
          doors.filter((v) => v.status === "Secured").length !== 1
        )
          conflict("Verify that the paired door remains secured.");
        if (a.step >= 3 && doors.some((v) => v.status !== "Secured"))
          conflict("Wait for the timed release to secure both doors.");
      }
      if (d.kind === "Resident accountability") {
        const c = x.headcounts.find(
          (c) => c.zone === d.zone && c.started >= d.started,
        );
        if (!c) conflict("Start a new headcount for this drill first.");
        if (a.step >= 2 && c.status !== "Completed")
          conflict("Record the headcount result first.");
        if (a.step === 4 && !x.handovers.some((h) => h.created >= d.started))
          conflict("Add a shift handover briefing first.");
      }
      break;
    }
    case "drillFinish": {
      const d = record(x.drills, a.id);
      if (d.status !== "Running" || d.steps.some((v) => !v))
        conflict("Verify all five drill steps before completing.");
      break;
    }
  }
}
