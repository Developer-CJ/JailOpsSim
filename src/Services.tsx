import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  ClipboardCheck,
  HeartHandshake,
  LogOut,
  Plus,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Empty,
  Field,
  Modal,
  PageHeading,
  Stat,
} from "./components";
import { zoneName, zones } from "./model";
import type { Appointment, Resident } from "./model";
import { useSimulation } from "./store";
import type { Navigate } from "./Operations";

const services: Appointment["service"][] = [
  "Health check",
  "Family visit",
  "Court hearing",
  "Case review",
  "Transition planning",
];
const localDate = () => new Date().toLocaleDateString("en-CA");

export function CareServices() {
  const { state, dispatch, notify } = useSimulation();
  const [filter, setFilter] = useState("All services");
  const [dateFilter, setDateFilter] = useState("all");
  const [create, setCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [residentId, setResidentId] = useState("");
  const [service, setService] =
    useState<Appointment["service"]>("Health check");
  const [date, setDate] = useState(localDate);
  const [time, setTime] = useState("15:00");
  const [owner, setOwner] = useState("Noah Bailey");
  const [notes, setNotes] = useState("");
  const list = state.appointments
    .filter(
      (a) =>
        (filter === "All services" || a.service === filter) &&
        (dateFilter === "all" || a.date === localDate()),
    )
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
  const appointment = state.appointments.find((a) => a.id === selected);
  const residentName = (id: string) =>
    [...state.residents, ...state.discharged].find((r) => r.id === id)?.name ??
    id;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      state.appointments.some(
        (a) =>
          a.residentId === residentId &&
          a.date === date &&
          a.time === time &&
          a.status !== "Cancelled",
      )
    ) {
      notify(
        "This resident already has an appointment at that date and time.",
        true,
      );
      return;
    }
    const id = `AP-${Math.max(105, ...state.appointments.map((a) => Number(a.id.split("-")[1]) || 0)) + 1}`;
    if (
      !(await dispatch({
        type: "appointment",
        appointment: {
          id,
          residentId,
          service,
          date,
          time,
          owner,
          notes: notes.trim(),
          status: "Scheduled",
        },
      }))
    )
      return;
    notify("Care appointment scheduled");
    setCreate(false);
    setNotes("");
    setResidentId("");
  };
  return (
    <>
      <PageHeading
        eyebrow="HEALTH, FAMILY & CASE COORDINATION"
        title="Support at every step"
        description="Bring wellbeing, family connections, hearings, and transition planning together."
      >
        <Button variant="primary" onClick={() => setCreate(true)}>
          <Plus size={16} />
          Schedule appointment
        </Button>
      </PageHeading>
      <div className="stats-grid three">
        <Stat
          label="Scheduled appointments"
          value={
            state.appointments.filter((a) => a.status === "Scheduled").length
          }
          icon={CalendarClock}
          note="Across all care services"
        />
        <Stat
          label="Checked in"
          value={
            state.appointments.filter((a) => a.status === "Checked in").length
          }
          icon={HeartHandshake}
          note="Currently receiving support"
          tone="blue"
        />
        <Stat
          label="Completed appointments"
          value={
            state.appointments.filter((a) => a.status === "Completed").length
          }
          icon={ClipboardCheck}
          note="Recorded in the activity log"
        />
      </div>
      <div className="module-tabs">
        {["All services", ...services].map((s) => (
          <button
            key={s}
            className={filter === s ? "active" : ""}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <Card>
        <CardTitle
          title="Care & appointment calendar"
          subtitle="Fictional bookings · No external scheduling integrations"
          action={
            <select
              aria-label="Appointment date filter"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All dates</option>
              <option value="today">Today</option>
            </select>
          }
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Appointment</th>
                <th>Resident</th>
                <th>Date / time</th>
                <th>Coordinator</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td>
                    <button
                      className="record-link"
                      onClick={() => setSelected(a.id)}
                    >
                      <strong>{a.service}</strong>
                      <small>{a.id}</small>
                    </button>
                  </td>
                  <td>
                    {residentName(a.residentId)}
                    <small>{a.residentId}</small>
                  </td>
                  <td className="nowrap">
                    {a.date}
                    <small>{a.time}</small>
                  </td>
                  <td>{a.owner}</td>
                  <td>
                    <Badge
                      tone={
                        a.status === "Completed"
                          ? "green"
                          : a.status === "Checked in"
                            ? "blue"
                            : a.status === "Cancelled"
                              ? "neutral"
                              : "amber"
                      }
                      dot
                    >
                      {a.status}
                    </Badge>
                  </td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`View appointment ${a.id}`}
                      onClick={() => setSelected(a.id)}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty
            title="Space for your next appointment"
            description="Schedule a fictional care, family, court, or planning session."
          />
        )}
      </Card>
      {create && (
        <Modal
          title="Schedule a care appointment"
          subtitle="Plan a fictional resident support session."
          onClose={() => setCreate(false)}
        >
          <form onSubmit={submit}>
            <div className="modal-body">
              <Field label="Resident">
                <select
                  required
                  value={residentId}
                  onChange={(e) => setResidentId(e.target.value)}
                >
                  <option value="">Choose a resident…</option>
                  {state.residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.id}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Service">
                <select
                  value={service}
                  onChange={(e) =>
                    setService(e.target.value as Appointment["service"])
                  }
                >
                  {services.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <div className="form-grid">
                <Field label="Date">
                  <input
                    type="date"
                    required
                    min={localDate()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </Field>
                <Field label="Time">
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Coordinator">
                <select
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                >
                  {state.staff
                    .filter((s) => s.shift === "Day")
                    .map((s) => (
                      <option key={s.id}>{s.name}</option>
                    ))}
                </select>
              </Field>
              <Field
                label="Planning notes"
                hint="Fictional training details only."
              >
                <textarea
                  maxLength={1000}
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Purpose, meeting location, or support goals…"
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setCreate(false)}>Cancel</Button>
              <Button type="submit" variant="primary">
                <CalendarClock size={15} />
                Schedule appointment
              </Button>
            </div>
          </form>
        </Modal>
      )}
      {appointment && (
        <Modal
          title={appointment.service}
          subtitle={`${appointment.id} · ${residentName(appointment.residentId)} · ${appointment.residentId}`}
          onClose={() => setSelected(null)}
        >
          <div className="modal-body">
            <dl className="detail-list">
              <div>
                <dt>Date & time</dt>
                <dd>
                  {appointment.date} at {appointment.time}
                </dd>
              </div>
              <div>
                <dt>Coordinator</dt>
                <dd>{appointment.owner}</dd>
              </div>
            </dl>
            <h3 className="section-label">Planning notes</h3>
            <p className="incident-description">
              {appointment.notes || "No additional planning notes."}
            </p>
            <Field label="Appointment status">
              <select
                value={appointment.status}
                onChange={async (e) => {
                  if (
                    !(await dispatch({
                      type: "appointmentStatus",
                      id: appointment.id,
                      status: e.target.value as Appointment["status"],
                    }))
                  )
                    return;
                  notify("Appointment status updated");
                }}
              >
                {["Scheduled", "Checked in", "Completed", "Cancelled"].map(
                  (s) => (
                    <option
                      key={s}
                      disabled={
                        !state.residents.some(
                          (r) => r.id === appointment.residentId,
                        ) && ["Scheduled", "Checked in"].includes(s)
                      }
                    >
                      {s}
                    </option>
                  ),
                )}
              </select>
            </Field>
          </div>
          <div className="modal-actions">
            <Button variant="primary" onClick={() => setSelected(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Admissions({ navigate }: { navigate: Navigate }) {
  const { state } = useSimulation();
  const [mode, setMode] = useState<"admit" | "discharge" | null>(null);
  const [view, setView] = useState("Current admissions");
  const latest = [...state.residents]
    .sort((a, b) => b.admitted.localeCompare(a.admitted))
    .slice(0, 10);
  return (
    <>
      <PageHeading
        eyebrow="INTAKE & COMMUNITY TRANSITION"
        title="Thoughtful arrivals. Supported exits."
        description="Coordinate admission, placement, and a documented transition from care."
      >
        <Button onClick={() => setMode("discharge")}>
          <LogOut size={16} />
          Record discharge
        </Button>
        <Button variant="primary" onClick={() => setMode("admit")}>
          <UserPlus size={16} />
          New admission
        </Button>
      </PageHeading>
      <div className="stats-grid three">
        <Stat
          label="Current residents"
          value={state.residents.length}
          icon={Users}
          note="Active care placements"
        />
        <Stat
          label="Spaces available"
          value={64 - state.residents.length}
          icon={ArrowDownLeft}
          note="Across 4 residential houses"
        />
        <Stat
          label="Discharges recorded"
          value={state.discharged.length}
          icon={HeartHandshake}
          note="Preserved in the server archive"
        />
      </div>
      <div className="info-strip">
        <ClipboardCheck size={19} />
        <span>
          Admission requires identity, wellbeing, and property checks. A
          discharge preserves the resident’s record, releases their room, and
          cancels pending appointments.
        </span>
      </div>
      <div className="module-tabs">
        {["Current admissions", "Discharge archive"].map((v) => (
          <button
            key={v}
            className={view === v ? "active" : ""}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </div>
      <Card>
        <CardTitle
          title={
            view === "Current admissions"
              ? "Recent admissions"
              : "Discharge archive"
          }
          subtitle={
            view === "Current admissions"
              ? "The 10 most recent active resident admissions"
              : "Preserved fictional records from completed transitions"
          }
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Resident</th>
                <th>
                  {view === "Current admissions"
                    ? "Placement"
                    : "Transition reason"}
                </th>
                <th>
                  {view === "Current admissions"
                    ? "Admission date"
                    : "Discharge date"}
                </th>
                <th>Case manager</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {view === "Current admissions"
                ? latest.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong className="table-primary">{r.name}</strong>
                        <small>
                          {r.id} · Age {r.age}
                        </small>
                      </td>
                      <td>
                        {zoneName(r.unit)}
                        <small>Room {r.room}</small>
                      </td>
                      <td>{new Date(r.admitted).toLocaleDateString()}</td>
                      <td>{r.caseManager}</td>
                      <td>
                        <Button onClick={() => navigate("residents", r.id)}>
                          Profile
                          <ArrowUpRight size={13} />
                        </Button>
                      </td>
                    </tr>
                  ))
                : state.discharged.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong className="table-primary">{r.name}</strong>
                        <small>{r.id}</small>
                      </td>
                      <td>{r.reason}</td>
                      <td>{new Date(r.dischargedAt).toLocaleDateString()}</td>
                      <td>{r.caseManager}</td>
                      <td>
                        <Badge>Archived</Badge>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {view === "Discharge archive" && !state.discharged.length && (
          <Empty
            title="No recorded discharges"
            description="Completed transitions will appear here, with the original resident record preserved."
          />
        )}
      </Card>
      {mode === "admit" && <AdmissionModal onClose={() => setMode(null)} />}
      {mode === "discharge" && <DischargeModal onClose={() => setMode(null)} />}
    </>
  );
}

function AdmissionModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch, notify } = useSimulation();
  const [name, setName] = useState("");
  const [age, setAge] = useState(16);
  const [unit, setUnit] = useState("A1");
  const [room, setRoom] = useState("13");
  const [checks, setChecks] = useState<string[]>([]);
  const availableRooms = (id: string) =>
    Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, "0")).filter(
      (n) => !state.residents.some((r) => r.unit === id && r.room === n),
    );
  const currentRooms = availableRooms(unit);
  const validRoom = currentRooms.includes(room)
    ? room
    : (currentRooms[0] ?? "");
  const admit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checks.length !== 3 || !validRoom || name.trim().length < 3) return;
    const next =
      Math.max(
        1048,
        ...[...state.residents, ...state.discharged].map(
          (r) => Number(r.id.split("-")[1]) || 0,
        ),
      ) + 1;
    const resident: Resident = {
      id: `R-${next}`,
      name: name.trim(),
      age,
      unit,
      room: validRoom,
      admitted: new Date().toISOString(),
      status: "In unit",
      caseManager: "J. Rivera",
      plan: "Initial assessment & orientation",
    };
    if (!(await dispatch({ type: "admit", resident }))) return;
    notify(`${resident.id} admitted to ${zoneName(unit)}`);
    onClose();
  };
  return (
    <Modal
      title="New fictional admission"
      subtitle="Complete the intake checklist and choose an available placement."
      onClose={onClose}
    >
      <form onSubmit={admit}>
        <div className="modal-body">
          <Field label="Fictional resident name">
            <input
              required
              minLength={3}
              maxLength={70}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a made-up full name"
            />
          </Field>
          <div className="form-grid">
            <Field label="Age">
              <input
                type="number"
                min={12}
                max={20}
                required
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
              />
            </Field>
            <Field label="Residential house">
              <select
                value={unit}
                onChange={(e) => {
                  setUnit(e.target.value);
                  setRoom(availableRooms(e.target.value)[0] ?? "");
                }}
              >
                {zones
                  .filter((z) => z.capacity)
                  .map((z) => (
                    <option
                      key={z.id}
                      value={z.id}
                      disabled={!availableRooms(z.id).length}
                    >
                      {z.name}
                      {!availableRooms(z.id).length ? " · Full" : ""}
                    </option>
                  ))}
              </select>
            </Field>
          </div>
          <Field label="Available room">
            <select
              required
              value={validRoom}
              onChange={(e) => setRoom(e.target.value)}
            >
              {!currentRooms.length && (
                <option value="">No rooms available</option>
              )}
              {currentRooms.map((n) => (
                <option key={n} value={n}>
                  Room {n}
                </option>
              ))}
            </select>
          </Field>
          <h3 className="section-label">Intake checklist</h3>
          <div className="checklist">
            {[
              "Fictional identity & placement verified",
              "Initial wellbeing check completed",
              "Property inventory & orientation recorded",
            ].map((c) => (
              <label key={c}>
                <input
                  type="checkbox"
                  checked={checks.includes(c)}
                  onChange={(e) =>
                    setChecks((v) =>
                      e.target.checked ? [...v, c] : v.filter((x) => x !== c),
                    )
                  }
                />
                <span>{c}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="primary"
            disabled={checks.length !== 3 || !validRoom}
          >
            <Check size={15} />
            Complete admission
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DischargeModal({ onClose }: { onClose: () => void }) {
  const { state, dispatch, notify } = useSimulation();
  const [id, setId] = useState("");
  const [reason, setReason] = useState("Community transition");
  const [checked, setChecked] = useState(false);
  return (
    <Modal
      title="Record a supported discharge"
      subtitle="Archive the fictional resident’s record and release their placement."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!id || !checked) return;
          if (!(await dispatch({ type: "discharge", id, reason }))) return;
          notify(
            "Discharge recorded; placement released and pending bookings cancelled",
          );
          onClose();
        }}
      >
        <div className="modal-body">
          <Field label="Resident to discharge">
            <select required value={id} onChange={(e) => setId(e.target.value)}>
              <option value="">Choose a resident…</option>
              {state.residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} · {r.id}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Transition reason">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {[
                "Community transition",
                "Family reunification",
                "Placement transfer",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </Field>
          <div className="checklist">
            <label>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              <span>
                Simulated handover, belongings, and transition plan confirmed
              </span>
            </label>
          </div>
          <div className="info-strip">
            <HeartHandshake size={18} />
            <span>
              This removes the resident from active care and program rosters.
              Their original record remains in the discharge archive.
            </span>
          </div>
        </div>
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!id || !checked}>
            Complete discharge
          </Button>
        </div>
      </form>
    </Modal>
  );
}
