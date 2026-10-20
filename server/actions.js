import { expansionSchemas, validateExpansion } from "./expansion-actions.js";
import { z } from "zod";
import { zones } from "../shared/model.ts";
import { ApiError } from "./database.js";

const text = (max = 200) => z.string().trim().min(1).max(max);
const id = text(80),
  zone = z.enum(zones.map((v) => v.id)),
  unit = z.enum(["A1", "A2", "B1", "B2"]);
const room = z.string().regex(/^(0[1-9]|1[0-6])$/);
const residentStatus = z.enum(["In unit", "In program", "Health services"]);
const incidentStatus = z.enum(["Open", "In review", "Resolved"]);
const workStatus = z.enum(["Open", "In progress", "Completed"]);
const timestamp = z.string().datetime();
const resident = z
  .object({
    id,
    name: text(70),
    age: z.number().int().min(12).max(20),
    unit,
    room,
    admitted: timestamp,
    caseManager: text(100),
    status: residentStatus,
    plan: text(100),
  })
  .strict();
const variants = [
  ...expansionSchemas,
  z.object({
    type: z.literal("door"),
    id,
    mode: z.enum(["release", "secure", "hold"]),
  }),
  z.object({ type: z.literal("secureAll") }),
  z.object({
    type: z.literal("resident"),
    id,
    changes: z
      .object({
        unit,
        room,
        status: residentStatus,
        caseManager: text(100),
        plan: text(100),
      })
      .partial()
      .strict()
      .refine((v) => Object.keys(v).length > 0),
  }),
  z.object({
    type: z.literal("incident"),
    incident: z
      .object({
        id,
        title: text(120).min(3),
        category: z.enum([
          "Resident welfare",
          "Equipment",
          "Access control",
          "Life safety",
          "Operational",
          "Other",
        ]),
        priority: z.enum(["Low", "Medium", "High"]),
        zone,
        status: incidentStatus,
        description: text(3000).min(10),
        created: timestamp,
        reporter: text(100),
      })
      .strict(),
  }),
  z.object({ type: z.literal("incidentStatus"), id, status: incidentStatus }),
  z.object({
    type: z.literal("alarm"),
    zone,
    kind: z.enum(["Fire alarm", "Trouble", "Supervisory"]),
  }),
  ...["acknowledge", "silence", "resetPanel", "reset"].map((type) =>
    z.object({ type: z.literal(type) }),
  ),
  z.object({ type: z.literal("clearSource"), id }),
  z.object({
    type: z.literal("staff"),
    id,
    status: z.enum(["On duty", "On break", "Off duty"]),
    post: text(100).optional(),
  }),
  z.object({
    type: z.literal("program"),
    id,
    status: z.enum(["Scheduled", "In session", "Completed"]),
  }),
  z.object({
    type: z.literal("enroll"),
    id,
    residentId: id,
    remove: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("workOrder"),
    order: z
      .object({
        id,
        title: text(180).min(3),
        zone,
        priority: z.enum(["Routine", "Urgent"]),
        status: workStatus,
        assignee: text(100),
        created: timestamp,
      })
      .strict(),
  }),
  z.object({ type: z.literal("workOrderStatus"), id, status: workStatus }),
  z.object({
    type: z.literal("settings"),
    settings: z
      .object({
        facilityName: text(60),
        operator: text(60),
        shift: z.enum([
          "Day shift · 07:00–19:00",
          "Night shift · 19:00–07:00",
          "Training shift · Flexible",
        ]),
        compact: z.boolean(),
        sounds: z.boolean(),
      })
      .strict(),
  }),
  z.object({ type: z.literal("admit"), resident }),
  z.object({
    type: z.literal("discharge"),
    id,
    reason: z.enum([
      "Community transition",
      "Family reunification",
      "Placement transfer",
    ]),
  }),
  z.object({
    type: z.literal("appointment"),
    appointment: z
      .object({
        id,
        residentId: id,
        service: z.enum([
          "Health check",
          "Family visit",
          "Court hearing",
          "Case review",
          "Transition planning",
        ]),
        date: z.iso.date(),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        owner: text(100),
        notes: z.string().trim().max(1000),
        status: z.enum(["Scheduled", "Checked in", "Completed", "Cancelled"]),
      })
      .strict(),
  }),
  z.object({
    type: z.literal("appointmentStatus"),
    id,
    status: z.enum(["Scheduled", "Checked in", "Completed", "Cancelled"]),
  }),
  z.object({
    type: z.literal("log"),
    title: text(150),
    detail: text(1000),
    category: z.enum([
      "system",
      "access",
      "safety",
      "resident",
      "incident",
      "program",
    ]),
  }),
];
export const actionSchema = z.discriminatedUnion(
  "type",
  variants.map((v) => v.strict()),
);
const requireRecord = (records, id) => {
  const value = records.find((v) => v.id === id);
  if (!value) throw new ApiError(404, "The selected record no longer exists.");
  return value;
};
const conflict = (message) => {
  throw new ApiError(409, message);
};
const nextId = (prefix, records, initial) =>
  `${prefix}-${Math.max(initial, ...records.map((v) => Number(v.id.split("-")[1]) || 0)) + 1}`;

export function validateAction(s, a, user) {
  validateExpansion(s, a);
  if (["reset", "settings"].includes(a.type) && user.role !== "admin")
    throw new ApiError(
      403,
      "An administrator account is required for this operation.",
    );
  switch (a.type) {
    case "door": {
      const d = requireRecord(s.doors, a.id);
      if (a.mode !== "secure" && d.status !== "Secured")
        conflict("This door already has an active release or hold.");
      if (
        a.mode !== "secure" &&
        s.doors.some((v) => v.id === d.pair && v.status !== "Secured")
      )
        conflict("Interlock active: secure the paired door first.");
      break;
    }
    case "resident": {
      const r = requireRecord(s.residents, a.id),
        targetUnit = a.changes.unit ?? r.unit,
        targetRoom = a.changes.room ?? r.room;
      if (
        s.residents.some(
          (v) =>
            v.id !== a.id && v.unit === targetUnit && v.room === targetRoom,
        )
      )
        conflict("That room is already occupied. Select an available room.");
      break;
    }
    case "admit":
      if (
        s.residents.some(
          (v) => v.unit === a.resident.unit && v.room === a.resident.room,
        )
      )
        conflict("That room is already occupied.");
      a.resident.id = nextId("R", [...s.residents, ...s.discharged], 1048);
      a.resident.admitted = new Date().toISOString();
      break;
    case "discharge":
      requireRecord(s.residents, a.id);
      break;
    case "incident":
      a.incident.id = nextId("INC", s.incidents, 1042);
      a.incident.reporter = user.username;
      a.incident.created = new Date().toISOString();
      a.incident.status = "Open";
      break;
    case "incidentStatus":
      requireRecord(s.incidents, a.id);
      break;
    case "workOrder":
      a.order.id = nextId("WO", s.workOrders, 203);
      a.order.created = new Date().toISOString();
      a.order.status = "Open";
      break;
    case "workOrderStatus":
      requireRecord(s.workOrders, a.id);
      break;
    case "staff":
      requireRecord(s.staff, a.id);
      break;
    case "program": {
      const p = requireRecord(s.programs, a.id);
      if (!(
        (p.status === "Scheduled" && a.status === "In session") ||
        (p.status === "In session" && a.status === "Completed")
      ))
        conflict("This session cannot move to the requested status.");
      break;
    }
    case "enroll": {
      const p = requireRecord(s.programs, a.id);
      requireRecord(s.residents, a.residentId);
      if (p.status === "Completed")
        conflict("Completed program rosters are closed.");
      if (
        !a.remove &&
        (p.roster.includes(a.residentId) || p.roster.length >= p.capacity)
      )
        conflict("The resident is already enrolled or the program is full.");
      if (a.remove && !p.roster.includes(a.residentId))
        conflict("That resident is not enrolled in this program.");
      break;
    }
    case "appointment":
      requireRecord(s.residents, a.appointment.residentId);
      if (!s.staff.some((v) => v.name === a.appointment.owner))
        throw new ApiError(400, "Select a valid coordinator.");
      if (
        s.appointments.some(
          (v) =>
            v.residentId === a.appointment.residentId &&
            v.date === a.appointment.date &&
            v.time === a.appointment.time &&
            v.status !== "Cancelled",
        )
      )
        conflict(
          "This resident already has an appointment at that date and time.",
        );
      a.appointment.id = nextId("AP", s.appointments, 105);
      a.appointment.status = "Scheduled";
      break;
    case "appointmentStatus": {
      const p = requireRecord(s.appointments, a.id);
      if (
        ["Scheduled", "Checked in"].includes(a.status) &&
        !s.residents.some((v) => v.id === p.residentId)
      )
        conflict("This resident has been discharged.");
      break;
    }
    case "alarm":
      if (
        s.alarms.some((v) => v.zone === a.zone && v.kind === a.kind && v.active)
      )
        conflict("An identical initiating condition is already active.");
      break;
    case "clearSource":
      if (!requireRecord(s.alarms, a.id).active)
        conflict("This source has already been restored.");
      break;
    case "acknowledge":
      if (!s.alarms.some((v) => !v.acknowledged))
        conflict("There are no unacknowledged events.");
      break;
    case "silence":
      if (!s.alarms.length || s.alarms.some((v) => !v.acknowledged))
        conflict("Acknowledge all panel events before silencing.");
      break;
    case "resetPanel":
      if (!s.alarms.length || s.alarms.some((v) => v.active || !v.acknowledged))
        conflict(
          "Acknowledge every event and restore every source before resetting.",
        );
      break;
  }
}
