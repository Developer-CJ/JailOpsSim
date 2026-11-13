import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  Clock3,
  FilePlus2,
  HeartHandshake,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
  X,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  DownloadButton,
  Empty,
  Field,
  Modal,
  PageHeading,
  SearchField,
  Stat,
  csvDownload,
} from "./components";
import { clockTime, relativeTime, zoneName, zones } from "./model";
import type { Incident, Program, Resident, Staff, WorkOrder } from "./model";
import { useSimulation } from "./store";

export function Residents({ initialId }: { initialId?: string }) {
  const { state, notify } = useSimulation();
  const [query, setQuery] = useState("");
  const [unit, setUnit] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(initialId ?? null);
  const filtered = state.residents.filter(
    (r) =>
      `${r.name} ${r.id}`.toLowerCase().includes(query.toLowerCase()) &&
      (unit === "all" || r.unit === unit) &&
      (status === "all" || r.status === status),
  );
  const resident = state.residents.find((r) => r.id === selected);
  return (
    <>
      <PageHeading
        eyebrow="RESIDENT SERVICES"
        title="People, before everything"
        description="A connected view of care, placement, and individual progress."
      >
        <DownloadButton
          onClick={() => {
            csvDownload(
              "residents.csv",
              ["ID", "Name", "Age", "House", "Room", "Status", "Case manager"],
              filtered.map((r) => [
                r.id,
                r.name,
                r.age,
                zoneName(r.unit),
                r.room,
                r.status,
                r.caseManager,
              ]),
            );
            notify("Resident roster exported");
          }}
        >
          Export roster
        </DownloadButton>
      </PageHeading>
      <div className="info-strip">
        <HeartHandshake size={19} />
        <span>
          All profiles are fictional training records. Names, placements, and
          care information are generated sample data.
        </span>
      </div>
      <div className="stats-grid">
        <Stat
          label="Residents in care"
          value={state.residents.length}
          icon={Users}
          note="Across 4 residential houses"
        />
        <Stat
          label="In education & programs"
          value={
            state.residents.filter((r) => r.status === "In program").length
          }
          icon={BookOpen}
          note="Current recorded attendance"
        />
        <Stat
          label="Available placements"
          value={64 - state.residents.length}
          icon={UserRound}
          note="64 total residential spaces"
        />
        <Stat
          label="Case coordinators"
          value={3}
          icon={HeartHandshake}
          note="Assigned to every resident"
        />
      </div>
      <Card>
        <CardTitle
          title="Resident directory"
          subtitle={`${filtered.length} of ${state.residents.length} profiles`}
        />
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search name or resident ID…"
          />
          <div className="filter-group">
            <select
              aria-label="Filter by house"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="all">All houses</option>
              {zones
                .filter((z) => z.capacity)
                .map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
            </select>
            <select
              aria-label="Filter resident status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All statuses</option>
              {["In unit", "In program", "Health services"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Resident</th>
                <th>Age</th>
                <th>Placement</th>
                <th>Current status</th>
                <th>Case manager</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => (
                <tr key={r.id}>
                  <td>
                    <button
                      className="person-cell"
                      onClick={() => setSelected(r.id)}
                    >
                      <span className={`avatar color-${i % 4}`}>
                        {r.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                      <span>
                        <strong>{r.name}</strong>
                        <small>{r.id}</small>
                      </span>
                    </button>
                  </td>
                  <td>{r.age}</td>
                  <td>
                    <strong className="table-primary">
                      {zoneName(r.unit)}
                    </strong>
                    <small>Room {r.room}</small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        r.status === "In program"
                          ? "blue"
                          : r.status === "Health services"
                            ? "amber"
                            : "green"
                      }
                      dot
                    >
                      {r.status}
                    </Badge>
                  </td>
                  <td>{r.caseManager}</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`View ${r.name}`}
                      onClick={() => setSelected(r.id)}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <Empty
            title="No matching residents"
            description="Try another name, ID, house, or status."
          />
        )}
        <div className="table-footer">
          {filtered.length} fictional resident records
          <span>Shared simulation data</span>
        </div>
      </Card>
      {resident && (
        <ResidentModal resident={resident} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function ResidentModal({
  resident: r,
  onClose,
}: {
  resident: Resident;
  onClose: () => void;
}) {
  const { state, dispatch, notify } = useSimulation();
  const [unit, setUnit] = useState(r.unit);
  const [room, setRoom] = useState(r.room);
  const [status, setStatus] = useState(r.status);
  const [manager, setManager] = useState(r.caseManager);
  const [plan, setPlan] = useState(r.plan);
  const occupied = state.residents
    .filter((v) => v.id !== r.id && v.unit === unit)
    .map((v) => v.room);
  const programs = state.programs.filter((p) => p.roster.includes(r.id));
  const changeUnit = (next: string) => {
    setUnit(next);
    const available = Array.from({ length: 16 }, (_, i) =>
      String(i + 1).padStart(2, "0"),
    ).find(
      (n) =>
        !state.residents.some(
          (v) => v.id !== r.id && v.unit === next && v.room === n,
        ),
    );
    setRoom(available ?? "");
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || occupied.includes(room)) {
      notify("Select an available room in this house.", true);
      return;
    }
    if (
      !(await dispatch({
        type: "resident",
        id: r.id,
        changes: {
          unit,
          room,
          status,
          caseManager: manager,
          plan: plan.trim(),
        },
      }))
    )
      return;
    notify(`${r.name}’s record updated`);
    onClose();
  };
  return (
    <Modal
      title={r.name}
      subtitle={`${r.id} · Age ${r.age} · Admitted ${new Date(r.admitted).toLocaleDateString()}`}
      onClose={onClose}
      wide
    >
      <form onSubmit={save}>
        <div className="modal-body">
          <div className="profile-banner">
            <span className="avatar large">
              {r.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
            <div>
              <strong>Individual care & placement</strong>
              <p>Fictional resident · Training profile</p>
            </div>
            <Badge tone="green">Active</Badge>
          </div>
          <div className="form-grid">
            <Field label="Residential house">
              <select value={unit} onChange={(e) => changeUnit(e.target.value)}>
                {zones
                  .filter((z) => z.capacity)
                  .map((z) => (
                    <option
                      value={z.id}
                      key={z.id}
                      disabled={
                        z.id !== r.unit &&
                        state.residents.filter((v) => v.unit === z.id).length >=
                          z.capacity
                      }
                    >
                      {z.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Assigned room">
              <select
                value={room}
                required
                onChange={(e) => setRoom(e.target.value)}
              >
                <option value="" disabled>
                  No available room
                </option>
                {Array.from({ length: 16 }, (_, i) =>
                  String(i + 1).padStart(2, "0"),
                ).map((n) => (
                  <option key={n} value={n} disabled={occupied.includes(n)}>
                    Room {n}
                    {occupied.includes(n) ? " · Occupied" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Current status">
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Resident["status"])
                }
              >
                {["In unit", "In program", "Health services"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Case manager">
              <select
                value={manager}
                onChange={(e) => setManager(e.target.value)}
              >
                {["J. Rivera", "S. Chen", "M. Patel"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Support pathway">
            <input
              required
              maxLength={100}
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
            />
          </Field>
          <h3 className="section-label">Program enrollments</h3>
          <div className="profile-programs">
            {programs.length ? (
              programs.map((p) => (
                <div key={p.id}>
                  <BookOpen size={16} />
                  <span>
                    {p.name}
                    <small>
                      {p.time} · {zoneName(p.location)}
                    </small>
                  </span>
                  <Badge tone={p.status === "In session" ? "green" : "neutral"}>
                    {p.status}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="muted">No program enrollments recorded.</p>
            )}
          </div>
        </div>
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            <Check size={16} />
            Save resident record
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function IncidentForm({ onClose }: { onClose: () => void }) {
  const { state, dispatch, notify } = useSimulation();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Resident welfare");
  const [zone, setZone] = useState("A1");
  const [priority, setPriority] = useState<Incident["priority"]>("Low");
  const [description, setDescription] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 10) {
      notify("Add a title and at least 10 characters of detail.", true);
      return;
    }
    const next =
      Math.max(
        1042,
        ...state.incidents.map((v) => Number(v.id.split("-")[1]) || 0),
      ) + 1;
    const id = `INC-${next}`;
    if (
      !(await dispatch({
        type: "incident",
        incident: {
          id,
          title: title.trim(),
          category,
          priority,
          zone,
          status: "Open",
          description: description.trim(),
          created: new Date().toISOString(),
          reporter: state.settings.operator,
        },
      }))
    )
      return;
    notify(`${id} reported and added to the activity log`);
    onClose();
  };
  return (
    <Modal
      title="New incident report"
      subtitle="Record a clear, factual account of a simulated event."
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          <Field label="Incident title">
            <input
              required
              minLength={3}
              maxLength={120}
              placeholder="Briefly describe what happened"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <div className="form-grid">
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  "Resident welfare",
                  "Equipment",
                  "Access control",
                  "Life safety",
                  "Operational",
                  "Other",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as Incident["priority"])
                }
              >
                {["Low", "Medium", "High"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Location">
            <select value={zone} onChange={(e) => setZone(e.target.value)}>
              {zones.map((z) => (
                <option value={z.id} key={z.id}>
                  {z.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Incident details"
            hint="Use fictional information only. Describe observations and support provided."
          >
            <textarea
              required
              minLength={10}
              maxLength={3000}
              rows={5}
              placeholder="What was observed? What action was taken?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <div className="modal-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">
            <FilePlus2 size={16} />
            Submit incident
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function Incidents({
  initialId,
  onNew,
}: {
  initialId?: string;
  onNew: () => void;
}) {
  const { state, dispatch, notify } = useSimulation();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<string | null>(initialId ?? null);
  const list = state.incidents.filter(
    (i) =>
      `${i.title} ${i.id} ${i.category} ${zoneName(i.zone)}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (status === "all" || i.status === status),
  );
  const incident = state.incidents.find((i) => i.id === selected);
  return (
    <>
      <PageHeading
        eyebrow="INCIDENT MANAGEMENT"
        title="Clarity in every response"
        description="Document events, coordinate follow-up, and close the loop."
      >
        <DownloadButton
          onClick={() => {
            csvDownload(
              "incident-register.csv",
              [
                "ID",
                "Title",
                "Category",
                "Priority",
                "Location",
                "Status",
                "Reported",
                "Reporter",
                "Details",
              ],
              list.map((i) => [
                i.id,
                i.title,
                i.category,
                i.priority,
                zoneName(i.zone),
                i.status,
                i.created,
                i.reporter,
                i.description,
              ]),
            );
            notify("Incident register exported");
          }}
        />
        <Button variant="primary" onClick={onNew}>
          <Plus size={16} />
          New incident
        </Button>
      </PageHeading>
      <div className="stats-grid three">
        <Stat
          label="Open reports"
          value={state.incidents.filter((i) => i.status === "Open").length}
          icon={ClipboardList}
          note="Awaiting initial review"
          tone="amber"
        />
        <Stat
          label="Under review"
          value={state.incidents.filter((i) => i.status === "In review").length}
          icon={Search}
          note="Follow-up in progress"
          tone="blue"
        />
        <Stat
          label="Resolved"
          value={state.incidents.filter((i) => i.status === "Resolved").length}
          icon={CheckCheck}
          note="Completed & documented"
        />
      </div>
      <Card>
        <CardTitle
          title="Incident register"
          subtitle={`${list.length} reports in this view`}
        />
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search incident ID, title, or location…"
          />
          <select
            aria-label="Filter incident status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="all">All statuses</option>
            {["Open", "In review", "Resolved"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Incident</th>
                <th>Location</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Reported</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id}>
                  <td>
                    <button
                      className="record-link"
                      onClick={() => setSelected(i.id)}
                    >
                      <strong>{i.title}</strong>
                      <small>
                        {i.id} · {i.category}
                      </small>
                    </button>
                  </td>
                  <td>{zoneName(i.zone)}</td>
                  <td>
                    <Badge
                      tone={
                        i.priority === "High"
                          ? "red"
                          : i.priority === "Medium"
                            ? "amber"
                            : "neutral"
                      }
                    >
                      {i.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={
                        i.status === "Resolved"
                          ? "green"
                          : i.status === "In review"
                            ? "blue"
                            : "amber"
                      }
                      dot
                    >
                      {i.status}
                    </Badge>
                  </td>
                  <td>{relativeTime(i.created)}</td>
                  <td>
                    <button
                      className="icon-button"
                      aria-label={`View ${i.id}`}
                      onClick={() => setSelected(i.id)}
                    >
                      <ArrowUpRight size={17} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty
            title="No reports found"
            description="Adjust your search or create a fictional incident report."
          />
        )}
      </Card>
      {incident && (
        <Modal
          title={incident.title}
          subtitle={`${incident.id} · Reported by ${incident.reporter} · ${clockTime(incident.created)}`}
          onClose={() => setSelected(null)}
        >
          <div className="modal-body">
            <div className="badge-row">
              <Badge
                tone={
                  incident.priority === "High"
                    ? "red"
                    : incident.priority === "Medium"
                      ? "amber"
                      : "neutral"
                }
              >
                {incident.priority} priority
              </Badge>
              <Badge tone={incident.status === "Resolved" ? "green" : "blue"}>
                {incident.status}
              </Badge>
              <Badge>{incident.category}</Badge>
            </div>
            <dl className="detail-list">
              <div>
                <dt>Location</dt>
                <dd>{zoneName(incident.zone)}</dd>
              </div>
              <div>
                <dt>Reported</dt>
                <dd>{new Date(incident.created).toLocaleString()}</dd>
              </div>
            </dl>
            <h3 className="section-label">Incident details</h3>
            <p className="incident-description">{incident.description}</p>
            <Field label="Workflow status">
              <select
                value={incident.status}
                onChange={async (e) => {
                  if (
                    !(await dispatch({
                      type: "incidentStatus",
                      id: incident.id,
                      status: e.target.value as Incident["status"],
                    }))
                  )
                    return;
                  notify("Incident status updated");
                }}
              >
                {["Open", "In review", "Resolved"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
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

export function Programs({ initialId }: { initialId?: string }) {
  const { state } = useSimulation();
  const [filter, setFilter] = useState("All programs");
  const [selected, setSelected] = useState<string | null>(initialId ?? null);
  const program = state.programs.find((p) => p.id === selected);
  const list = state.programs.filter(
    (p) => filter === "All programs" || p.category === filter,
  );
  return (
    <>
      <PageHeading
        eyebrow="EDUCATION & WELLBEING"
        title="Room to grow"
        description="Purposeful routines. Meaningful learning. Positive next steps."
      >
        <Badge tone="green">
          <CalendarDays size={13} />
          Today’s schedule
        </Badge>
      </PageHeading>
      <div className="program-banner">
        <div>
          <span className="eyebrow">EVERY SMALL STEP COUNTS</span>
          <h2>
            Building brighter days,
            <br />
            one program at a time.
          </h2>
          <p>Education, connection, and skills for the road ahead.</p>
        </div>
        <div className="program-banner-art">
          <BookOpen size={74} strokeWidth={1} />
          <span>LEARN / CONNECT / GROW</span>
        </div>
      </div>
      <div className="module-tabs">
        {[
          "All programs",
          "Education",
          "Wellbeing",
          "Recreation",
          "Life skills",
        ].map((s) => (
          <button
            className={filter === s ? "active" : ""}
            key={s}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="program-grid">
        {list.map((p, i) => (
          <Card key={p.id} className="program-card">
            <div className={`program-card-top program-tone-${i % 4}`}>
              <span className="program-symbol">
                {p.category === "Education" ? (
                  <BookOpen size={27} />
                ) : p.category === "Recreation" ? (
                  <Users size={27} />
                ) : (
                  <HeartHandshake size={27} />
                )}
              </span>
              <Badge tone={p.status === "In session" ? "green" : "neutral"} dot>
                {p.status}
              </Badge>
            </div>
            <div className="program-card-body">
              <div className="eyebrow">{p.category}</div>
              <h2>{p.name}</h2>
              <p>Led by {p.facilitator}</p>
              <div className="program-facts">
                <span>
                  <Clock3 size={14} />
                  {p.time} · {p.duration}
                </span>
                <span>
                  <BuildingIcon />
                  {zoneName(p.location)}
                </span>
              </div>
              <div className="capacity-block">
                <div>
                  <span>{p.roster.length} enrolled</span>
                  <strong>{p.capacity} places</strong>
                </div>
                <div className="progress-track">
                  <i
                    style={{
                      width: `${(p.roster.length / p.capacity) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <Button onClick={() => setSelected(p.id)}>
                Manage program
                <ArrowUpRight size={15} />
              </Button>
            </div>
          </Card>
        ))}
      </div>
      {program && (
        <ProgramModal program={program} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
function BuildingIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
    >
      <path d="M2 14V3h9v11M11 6h3v8H1m4-8h3m-3 3h3m-2 5v-2h2v2" />
    </svg>
  );
}
function ProgramModal({
  program: p,
  onClose,
}: {
  program: Program;
  onClose: () => void;
}) {
  const { state, dispatch, notify } = useSimulation();
  const [enrollId, setEnrollId] = useState("");
  return (
    <Modal
      title={p.name}
      subtitle={`${p.time} · ${p.duration} · ${zoneName(p.location)} · ${p.facilitator}`}
      onClose={onClose}
      wide
    >
      <div className="modal-body">
        <div className="badge-row">
          <Badge tone={p.status === "In session" ? "green" : "neutral"}>
            {p.status}
          </Badge>
          <Badge>
            {p.roster.length}/{p.capacity} enrolled
          </Badge>
        </div>
        <h3 className="section-label">Program roster</h3>
        <div className="roster-list">
          {p.roster.map((id) => {
            const r = state.residents.find((v) => v.id === id);
            return (
              <div key={id}>
                <span className="avatar small">
                  {r?.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </span>
                <span>
                  <strong>{r?.name}</strong>
                  <small>
                    {id} · {r ? zoneName(r.unit) : ""}
                  </small>
                </span>
                {p.status !== "Completed" && (
                  <button
                    aria-label={`Remove ${r?.name} from program`}
                    className="icon-button"
                    onClick={async () => {
                      if (
                        !(await dispatch({
                          type: "enroll",
                          id: p.id,
                          residentId: id,
                          remove: true,
                        }))
                      )
                        return;
                      notify("Enrollment removed");
                    }}
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {p.status !== "Completed" && (
          <div className="enroll-row">
            <Field label="Enroll a resident">
              <select
                aria-label="Resident to enroll"
                value={enrollId}
                onChange={(e) => setEnrollId(e.target.value)}
              >
                <option value="">Choose resident…</option>
                {state.residents
                  .filter((r) => !p.roster.includes(r.id))
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.id}
                    </option>
                  ))}
              </select>
            </Field>
            <Button
              variant="primary"
              disabled={!enrollId || p.roster.length >= p.capacity}
              onClick={async () => {
                if (
                  !(await dispatch({
                    type: "enroll",
                    id: p.id,
                    residentId: enrollId,
                  }))
                )
                  return;
                setEnrollId("");
                notify("Resident enrolled");
              }}
            >
              <Plus size={15} />
              Enroll
            </Button>
          </div>
        )}
        {p.roster.length >= p.capacity && (
          <p className="muted">This program has reached its capacity.</p>
        )}
      </div>
      <div className="modal-actions split">
        <Button onClick={onClose}>Close</Button>
        {p.status !== "Completed" && (
          <Button
            variant="primary"
            onClick={async () => {
              if (
                !(await dispatch({
                  type: "program",
                  id: p.id,
                  status: p.status === "Scheduled" ? "In session" : "Completed",
                }))
              )
                return;
              notify(
                p.status === "Scheduled"
                  ? "Program started"
                  : "Program completed",
              );
            }}
          >
            {p.status === "Scheduled" ? "Start session" : "Complete session"}
            <ArrowRight size={15} />
          </Button>
        )}
      </div>
    </Modal>
  );
}

export function Staffing() {
  const { state, dispatch, notify } = useSimulation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Staff | null>(null);
  const [post, setPost] = useState("");
  const [status, setStatus] = useState<Staff["status"]>("On duty");
  const list = state.staff.filter(
    (s) =>
      `${s.name} ${s.role} ${s.post}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" || s.shift === filter),
  );
  const edit = (s: Staff) => {
    setSelected(s);
    setPost(s.post);
    setStatus(s.status);
  };
  return (
    <>
      <PageHeading
        eyebrow="TEAM & SHIFT MANAGEMENT"
        title="The people behind the care"
        description="Coordinate coverage, assignments, and handovers across the campus."
      />
      <div className="stats-grid three">
        <Stat
          label="On duty"
          value={state.staff.filter((s) => s.status === "On duty").length}
          icon={ShieldCheck}
          note="Active across the campus"
        />
        <Stat
          label="On break"
          value={state.staff.filter((s) => s.status === "On break").length}
          icon={Clock3}
          note="Day shift coverage"
          tone="amber"
        />
        <Stat
          label="Team members"
          value={state.staff.length}
          icon={Users}
          note="Day and night rosters"
        />
      </div>
      <Card>
        <CardTitle
          title="Staff roster"
          subtitle="Fictional personnel & assignments"
        />
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search staff, role, or assignment…"
          />
          <select
            aria-label="Filter staff shift"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All shifts</option>
            <option value="Day">Day shift</option>
            <option value="Night">Night shift</option>
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Team member</th>
                <th>Assignment</th>
                <th>Shift</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => (
                <tr key={s.id}>
                  <td>
                    <button className="person-cell" onClick={() => edit(s)}>
                      <span className={`avatar color-${i % 4}`}>
                        {s.initials}
                      </span>
                      <span>
                        <strong>{s.name}</strong>
                        <small>{s.role}</small>
                      </span>
                    </button>
                  </td>
                  <td>{s.post}</td>
                  <td>
                    {s.shift}
                    <small>
                      {s.shift === "Day" ? "07:00–19:00" : "19:00–07:00"}
                    </small>
                  </td>
                  <td>
                    <Badge
                      tone={
                        s.status === "On duty"
                          ? "green"
                          : s.status === "On break"
                            ? "amber"
                            : "neutral"
                      }
                      dot
                    >
                      {s.status}
                    </Badge>
                  </td>
                  <td>
                    <Button onClick={() => edit(s)}>
                      Assign
                      <ArrowUpRight size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty
            title="No team members found"
            description="Try another search or shift."
          />
        )}
      </Card>
      {selected && (
        <Modal
          title={`Assign ${selected.name}`}
          subtitle={`${selected.role} · ${selected.shift} shift`}
          onClose={() => setSelected(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                !(await dispatch({
                  type: "staff",
                  id: selected.id,
                  status,
                  post,
                }))
              )
                return;
              notify("Staff assignment updated");
              setSelected(null);
            }}
          >
            <div className="modal-body">
              <Field label="Assigned post">
                <select value={post} onChange={(e) => setPost(e.target.value)}>
                  {Array.from(
                    new Set([
                      ...zones.map((z) => z.name),
                      "Learning center",
                      "Facilities",
                      "Administration",
                      post,
                    ]),
                  ).map((p) => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
              </Field>
              <Field label="Duty status">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Staff["status"])}
                >
                  {["On duty", "On break", "Off duty"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setSelected(null)}>Cancel</Button>
              <Button variant="primary" type="submit">
                Save assignment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Maintenance() {
  const { state, dispatch, notify } = useSimulation();
  const [filter, setFilter] = useState("all");
  const [create, setCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [zone, setZone] = useState("A1");
  const [priority, setPriority] = useState<WorkOrder["priority"]>("Routine");
  const list = state.workOrders.filter(
    (w) => filter === "all" || w.status === filter,
  );
  return (
    <>
      <PageHeading
        eyebrow="FACILITIES & MAINTENANCE"
        title="Keep good things running"
        description="Track repairs, preventative work, and facility upkeep."
      >
        <Button variant="primary" onClick={() => setCreate(true)}>
          <Plus size={16} />
          New work order
        </Button>
      </PageHeading>
      <div className="stats-grid three">
        <Stat
          label="Open work orders"
          value={state.workOrders.filter((w) => w.status === "Open").length}
          icon={Wrench}
          note="Awaiting assignment"
          tone="amber"
        />
        <Stat
          label="In progress"
          value={
            state.workOrders.filter((w) => w.status === "In progress").length
          }
          icon={Clock3}
          note="Work currently underway"
          tone="blue"
        />
        <Stat
          label="Completed"
          value={
            state.workOrders.filter((w) => w.status === "Completed").length
          }
          icon={CheckCheck}
          note="Repairs & upkeep recorded"
        />
      </div>
      <Card>
        <CardTitle
          title="Work order register"
          action={
            <select
              aria-label="Filter work orders"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              {["Open", "In progress", "Completed"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          }
        />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Work order</th>
                <th>Zone</th>
                <th>Priority</th>
                <th>Assigned to</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => (
                <tr key={w.id}>
                  <td>
                    <strong className="table-primary">{w.title}</strong>
                    <small>
                      {w.id} · {relativeTime(w.created)}
                    </small>
                  </td>
                  <td>{zoneName(w.zone)}</td>
                  <td>
                    <Badge tone={w.priority === "Urgent" ? "amber" : "neutral"}>
                      {w.priority}
                    </Badge>
                  </td>
                  <td>{w.assignee}</td>
                  <td>
                    <select
                      aria-label={`Status for ${w.id}`}
                      value={w.status}
                      onChange={async (e) => {
                        if (
                          !(await dispatch({
                            type: "workOrderStatus",
                            id: w.id,
                            status: e.target.value as WorkOrder["status"],
                          }))
                        )
                          return;
                        notify("Work order updated");
                      }}
                    >
                      {["Open", "In progress", "Completed"].map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && (
          <Empty
            title="Nothing in this queue"
            description="Change the status filter to view other work orders."
          />
        )}
      </Card>
      {create && (
        <Modal
          title="New work order"
          subtitle="Create a simulated maintenance request."
          onClose={() => setCreate(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (title.trim().length < 3) return;
              const next =
                Math.max(
                  203,
                  ...state.workOrders.map(
                    (w) => Number(w.id.split("-")[1]) || 0,
                  ),
                ) + 1;
              if (
                !(await dispatch({
                  type: "workOrder",
                  order: {
                    id: `WO-${next}`,
                    title: title.trim(),
                    zone,
                    priority,
                    assignee: "Ari Simmons",
                    status: "Open",
                    created: new Date().toISOString(),
                  },
                }))
              )
                return;
              notify("Work order created");
              setTitle("");
              setCreate(false);
            }}
          >
            <div className="modal-body">
              <Field label="Work description">
                <input
                  required
                  minLength={3}
                  maxLength={180}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs attention?"
                />
              </Field>
              <Field label="Location">
                <select value={zone} onChange={(e) => setZone(e.target.value)}>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as WorkOrder["priority"])
                  }
                >
                  <option>Routine</option>
                  <option>Urgent</option>
                </select>
              </Field>
              <p className="muted">
                Assigned to Ari Simmons · Facilities technician
              </p>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setCreate(false)}>Cancel</Button>
              <Button variant="primary" type="submit">
                Create work order
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
