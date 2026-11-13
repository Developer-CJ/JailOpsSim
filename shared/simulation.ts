import { reduceExpansion, expansionTypes } from "./expansion.ts";
import type { ExpansionAction } from "./expansion.ts";
import { createInitialState, zoneName } from "./model.ts";
import type {
  Simulation,
  Activity,
  Incident,
  Resident,
  WorkOrder,
  Alarm,
  Staff,
  Program,
  Appointment,
} from "./model.ts";

export type Action =
  | ExpansionAction
  | { type: "door"; id: string; mode: "release" | "secure" | "hold" }
  | { type: "expire"; ids: string[] }
  | { type: "secureAll" }
  | {
      type: "resident";
      id: string;
      changes: Partial<
        Pick<Resident, "unit" | "room" | "status" | "caseManager" | "plan">
      >;
    }
  | { type: "incident"; incident: Incident }
  | { type: "incidentStatus"; id: string; status: Incident["status"] }
  | { type: "alarm"; zone: string; kind: Alarm["kind"] }
  | { type: "acknowledge" }
  | { type: "silence" }
  | { type: "clearSource"; id: string }
  | { type: "resetPanel" }
  | { type: "staff"; id: string; status: Staff["status"]; post?: string }
  | { type: "program"; id: string; status: Program["status"] }
  | { type: "enroll"; id: string; residentId: string; remove?: boolean }
  | { type: "workOrder"; order: WorkOrder }
  | { type: "workOrderStatus"; id: string; status: WorkOrder["status"] }
  | { type: "settings"; settings: Simulation["settings"] }
  | { type: "admit"; resident: Resident }
  | { type: "discharge"; id: string; reason: string }
  | { type: "appointment"; appointment: Appointment }
  | { type: "appointmentStatus"; id: string; status: Appointment["status"] }
  | { type: "log"; title: string; detail: string; category: Activity["type"] }
  | { type: "reset" };
const uid = () => crypto.randomUUID();
function addLog(
  s: Simulation,
  title: string,
  detail: string,
  type: Activity["type"],
): Simulation {
  return {
    ...s,
    activity: [
      { id: uid(), time: new Date().toISOString(), title, detail, type },
      ...s.activity,
    ].slice(0, 250),
  };
}
export function reduceSimulation(s: Simulation, a: Action): Simulation {
  if (expansionTypes.includes(a.type))
    return reduceExpansion(s, a as ExpansionAction);
  switch (a.type) {
    case "door": {
      const door = s.doors.find((d) => d.id === a.id);
      if (!door) return s;
      if (
        a.mode !== "secure" &&
        s.doors.some((d) => d.id === door.pair && d.status !== "Secured")
      )
        return s;
      const status =
        a.mode === "release"
          ? "Released"
          : a.mode === "hold"
            ? "Held open"
            : "Secured";
      return addLog(
        {
          ...s,
          doors: s.doors.map((d) =>
            d.id === a.id
              ? {
                  ...d,
                  status,
                  releaseUntil:
                    a.mode === "release" ? Date.now() + 8000 : undefined,
                }
              : d,
          ),
        },
        `Door ${status.toLowerCase()}`,
        `${door.id} · ${door.name} · Simulated command`,
        "access",
      );
    }
    case "expire":
      return addLog(
        {
          ...s,
          doors: s.doors.map((d) =>
            a.ids.includes(d.id)
              ? { ...d, status: "Secured", releaseUntil: undefined }
              : d,
          ),
        },
        "Access cycle completed",
        `${a.ids.join(", ")} · Automatically secured after 8 seconds`,
        "access",
      );
    case "secureAll":
      return addLog(
        {
          ...s,
          doors: s.doors.map((d) => ({
            ...d,
            status: "Secured",
            releaseUntil: undefined,
          })),
        },
        "All doors secured",
        "Facility-wide simulated secure command completed",
        "access",
      );
    case "resident": {
      const resident = s.residents.find((r) => r.id === a.id);
      if (!resident) return s;
      if (
        a.changes.unit &&
        a.changes.unit !== resident.unit &&
        s.residents.filter((r) => r.unit === a.changes.unit).length >= 16
      )
        return s;
      const room = a.changes.room ?? resident.room;
      const unit = a.changes.unit ?? resident.unit;
      if (
        s.residents.some(
          (r) => r.id !== a.id && r.unit === unit && r.room === room,
        )
      )
        return s;
      return addLog(
        {
          ...s,
          residents: s.residents.map((r) =>
            r.id === a.id ? { ...r, ...a.changes } : r,
          ),
        },
        "Resident record updated",
        `${resident.id} · ${resident.name} · ${zoneName(unit)}, room ${room}`,
        "resident",
      );
    }
    case "incident":
      return addLog(
        { ...s, incidents: [a.incident, ...s.incidents] },
        "Incident reported",
        `${a.incident.id} · ${a.incident.title}`,
        "incident",
      );
    case "incidentStatus":
      return addLog(
        {
          ...s,
          incidents: s.incidents.map((i) =>
            i.id === a.id ? { ...i, status: a.status } : i,
          ),
        },
        `Incident ${a.status.toLowerCase()}`,
        a.id,
        "incident",
      );
    case "alarm": {
      const duplicate = s.alarms.some(
        (v) => v.active && v.zone === a.zone && v.kind === a.kind,
      );
      if (duplicate) return s;
      const alarm: Alarm = {
        id: uid(),
        zone: a.zone,
        device:
          a.kind === "Fire alarm"
            ? "Smoke detector · SD-01"
            : a.kind === "Trouble"
              ? "Loop circuit · SLC-01"
              : "Sprinkler valve · SV-01",
        kind: a.kind,
        active: true,
        acknowledged: false,
        time: new Date().toISOString(),
      };
      return addLog(
        { ...s, alarms: [...s.alarms, alarm], silenced: false },
        `${a.kind} simulated`,
        `${zoneName(a.zone)} · ${alarm.device}`,
        "safety",
      );
    }
    case "acknowledge":
      return addLog(
        { ...s, alarms: s.alarms.map((v) => ({ ...v, acknowledged: true })) },
        "Panel events acknowledged",
        "Operator acknowledged all current life safety events",
        "safety",
      );
    case "silence": {
      if (!s.alarms.length || s.alarms.some((v) => !v.acknowledged)) return s;
      return addLog(
        { ...s, silenced: true },
        "Notification outputs silenced",
        "Simulated notification appliances silenced; events remain latched",
        "safety",
      );
    }
    case "clearSource":
      return addLog(
        {
          ...s,
          alarms: s.alarms.map((v) =>
            v.id === a.id ? { ...v, active: false } : v,
          ),
        },
        "Alarm source restored",
        "Initiating condition cleared · Panel reset still required",
        "safety",
      );
    case "resetPanel": {
      if (s.alarms.some((v) => v.active || !v.acknowledged)) return s;
      return addLog(
        { ...s, alarms: [], silenced: false },
        "Fire panel reset",
        "All initiating conditions restored · System normal",
        "safety",
      );
    }
    case "staff":
      return addLog(
        {
          ...s,
          staff: s.staff.map((v) =>
            v.id === a.id
              ? { ...v, status: a.status, post: a.post ?? v.post }
              : v,
          ),
        },
        "Staff assignment updated",
        `${s.staff.find((v) => v.id === a.id)?.name} · ${a.status}${a.post ? ` · ${a.post}` : ""}`,
        "system",
      );
    case "program": {
      const program = s.programs.find((v) => v.id === a.id);
      if (!program) return s;
      const programs = s.programs.map((v) =>
        v.id === a.id ? { ...v, status: a.status } : v,
      );
      return addLog(
        {
          ...s,
          programs,
          residents: s.residents.map((r) =>
            program.roster.includes(r.id)
              ? {
                  ...r,
                  status: programs.some(
                    (p) => p.status === "In session" && p.roster.includes(r.id),
                  )
                    ? "In program"
                    : "In unit",
                }
              : r,
          ),
        },
        `Program ${a.status.toLowerCase()}`,
        program.name,
        "program",
      );
    }
    case "enroll": {
      const p = s.programs.find((v) => v.id === a.id);
      if (
        !p ||
        p.status === "Completed" ||
        (!a.remove &&
          (p.roster.length >= p.capacity || p.roster.includes(a.residentId)))
      )
        return s;
      const programs = s.programs.map((v) =>
        v.id === a.id
          ? {
              ...v,
              roster: a.remove
                ? v.roster.filter((id) => id !== a.residentId)
                : [...v.roster, a.residentId],
            }
          : v,
      );
      return addLog(
        {
          ...s,
          programs,
          residents: s.residents.map((r) =>
            r.id === a.residentId && p.status === "In session"
              ? {
                  ...r,
                  status: programs.some(
                    (v) => v.status === "In session" && v.roster.includes(r.id),
                  )
                    ? "In program"
                    : "In unit",
                }
              : r,
          ),
        },
        a.remove ? "Program enrollment removed" : "Program enrollment added",
        `${a.residentId} · ${p.name}`,
        "program",
      );
    }
    case "workOrder":
      return addLog(
        { ...s, workOrders: [a.order, ...s.workOrders] },
        "Work order created",
        `${a.order.id} · ${a.order.title}`,
        "system",
      );
    case "workOrderStatus":
      return addLog(
        {
          ...s,
          workOrders: s.workOrders.map((v) =>
            v.id === a.id ? { ...v, status: a.status } : v,
          ),
        },
        `Work order ${a.status.toLowerCase()}`,
        a.id,
        "system",
      );
    case "settings":
      return addLog(
        { ...s, settings: a.settings },
        "Workspace settings updated",
        "Shared simulation preferences saved",
        "system",
      );
    case "admit": {
      if (
        s.residents.some(
          (r) =>
            r.id === a.resident.id ||
            (r.unit === a.resident.unit && r.room === a.resident.room),
        )
      )
        return s;
      if (s.residents.filter((r) => r.unit === a.resident.unit).length >= 16)
        return s;
      return addLog(
        { ...s, residents: [...s.residents, a.resident] },
        "Resident admission completed",
        `${a.resident.id} · ${a.resident.name} · ${zoneName(a.resident.unit)} room ${a.resident.room}`,
        "resident",
      );
    }
    case "discharge": {
      const r = s.residents.find((v) => v.id === a.id);
      if (!r) return s;
      return addLog(
        {
          ...s,
          extension: {
            ...s.extension,
            locations: Object.fromEntries(
              Object.entries(s.extension.locations).filter(
                ([id]) => id !== a.id,
              ),
            ),
            movements: s.extension.movements.map((m) =>
              m.residentId === a.id && ["Queued", "En route"].includes(m.status)
                ? {
                    ...m,
                    status: "Cancelled",
                    updated: new Date().toISOString(),
                  }
                : m,
            ),
          },
          residents: s.residents.filter((v) => v.id !== a.id),
          discharged: [
            { ...r, dischargedAt: new Date().toISOString(), reason: a.reason },
            ...s.discharged,
          ],
          programs: s.programs.map((p) => ({
            ...p,
            roster: p.roster.filter((id) => id !== a.id),
          })),
          appointments: s.appointments.map((p) =>
            p.residentId === a.id &&
            (p.status === "Scheduled" || p.status === "Checked in")
              ? { ...p, status: "Cancelled" }
              : p,
          ),
        },
        "Resident discharge completed",
        `${r.id} · ${r.name} · ${a.reason}`,
        "resident",
      );
    }
    case "appointment":
      return addLog(
        { ...s, appointments: [...s.appointments, a.appointment] },
        "Care appointment scheduled",
        `${a.appointment.residentId} · ${a.appointment.service} · ${a.appointment.date} ${a.appointment.time}`,
        "resident",
      );
    case "appointmentStatus":
      return addLog(
        {
          ...s,
          appointments: s.appointments.map((p) =>
            p.id === a.id ? { ...p, status: a.status } : p,
          ),
        },
        `Care appointment ${a.status.toLowerCase()}`,
        `${a.id} · ${s.appointments.find((p) => p.id === a.id)?.service}`,
        "resident",
      );
    case "log":
      return addLog(s, a.title, a.detail, a.category);
    case "reset":
      return addLog(
        createInitialState(),
        "Simulation reset",
        "Original fictional sample records restored",
        "system",
      );
  }
  return s;
}
