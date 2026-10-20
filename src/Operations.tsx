import { useState } from "react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Building2,
  Check,
  ChevronDown,
  CircleCheck,
  Clock3,
  DoorClosed,
  DoorOpen,
  Flame,
  LockKeyhole,
  Play,
  Radio,
  ScanLine,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  FacilityMap,
  Field,
  Modal,
  PageHeading,
  Stat,
  TextLink,
  csvDownload,
} from "./components";
import { relativeTime, zoneName, zones } from "./model";
import type { Page, Activity as ActivityType } from "./model";
import { useSimulation } from "./store";

export type Navigate = (page: Page, recordId?: string) => void;
const activityIcons = {
  system: ShieldCheck,
  access: DoorClosed,
  safety: Flame,
  resident: Users,
  incident: Activity,
  program: ScanLine,
};

export function ActivityList({
  limit = 5,
  category = "all",
}: {
  limit?: number;
  category?: string;
}) {
  const { state } = useSimulation();
  const events = state.activity
    .filter((e) => category === "all" || e.type === category)
    .slice(0, limit);
  return (
    <div className="activity-list">
      {events.length ? (
        events.map((event) => {
          const Icon = activityIcons[event.type];
          return (
            <div className="activity-item" key={event.id}>
              <div className={`event-icon ${event.type}`}>
                <Icon size={16} />
              </div>
              <div className="event-content">
                <strong>{event.title}</strong>
                <p>{event.detail}</p>
              </div>
              <time dateTime={event.time}>{relativeTime(event.time)}</time>
            </div>
          );
        })
      ) : (
        <p className="muted padded">No activity matches this category.</p>
      )}
    </div>
  );
}

export function Overview({
  navigate,
  onScenario,
  onIncident,
}: {
  navigate: Navigate;
  onScenario: () => void;
  onIncident: () => void;
}) {
  const { state, dispatch, notify } = useSimulation();
  const [zone, setZone] = useState("A1");
  const [eventFilter, setEventFilter] = useState("all");
  const selected = zones.find((z) => z.id === zone)!;
  const onDuty = state.staff.filter((s) => s.status === "On duty").length;
  const openIncidents = state.incidents.filter(
    (i) => i.status !== "Resolved",
  ).length;
  const secured = state.doors.filter((d) => d.status === "Secured").length;
  const exportSnapshot = () => {
    csvDownload(
      "facility-snapshot.csv",
      ["Metric", "Value"],
      [
        ["Facility", state.settings.facilityName],
        ["Snapshot", new Date().toISOString()],
        ["Residents", state.residents.length],
        ["Capacity", 64],
        ["Staff on duty", onDuty],
        ["Doors secured", secured],
        ["Active panel events", state.alarms.length],
        ["Open incidents", openIncidents],
      ],
    );
    notify("Facility snapshot exported");
  };
  return (
    <>
      <PageHeading
        title="Facility overview"
        description="A clear view of your facility. Every system, in sync."
      >
        <Button onClick={exportSnapshot}>
          <ArrowDownToLine size={16} />
          Export snapshot
        </Button>
        <Button variant="primary" onClick={onIncident}>
          <PlusIcon />
          New incident
        </Button>
      </PageHeading>
      <div className="overview-subnav">
        <div className="view-tab">
          <span className="live-dot" />
          Live overview
        </div>
        <span>
          <Clock3 size={14} />
          Current shift <span className="subnav-divider" />
          {state.settings.shift}
        </span>
      </div>
      <div className="stats-grid">
        <Stat
          label="Residents in care"
          value={state.residents.length}
          unit="/ 64"
          icon={Users}
          note={`${Math.round((state.residents.length / 64) * 100)}% facility occupancy`}
          trend={[10, 13, 11, 16, 16, 20, 18, 20]}
        />
        <Stat
          label="Staff on duty"
          value={onDuty}
          unit="staff"
          icon={ShieldCheck}
          note={`${state.staff.filter((s) => s.status === "On break").length} on break · Day roster`}
          trend={[9, 14, 13, 20, 20, 18, 20, 20]}
        />
        <Stat
          label="Access control"
          value={`${secured}/${state.doors.length}`}
          unit="secured"
          icon={DoorClosed}
          note={
            secured === state.doors.length
              ? "All access points secured"
              : `${state.doors.length - secured} access cycles active`
          }
          tone={secured === state.doors.length ? "green" : "amber"}
          trend={[21, 21, 17, 21, 21, 21, 21, 21]}
        />
        <Stat
          label="Open incidents"
          value={openIncidents.toString().padStart(2, "0")}
          icon={Activity}
          note={`${state.incidents.filter((i) => i.status === "In review").length} awaiting review`}
          tone="amber"
          trend={[20, 16, 18, 10, 13, 8, 9, 9]}
        />
      </div>
      <div className="overview-grid">
        <Card className="map-card">
          <CardTitle
            title="Facility command view"
            subtitle="North campus · Ground floor"
            action={
              <Badge tone={state.alarms.length ? "red" : "green"} dot>
                {state.alarms.length
                  ? "Attention required"
                  : "Systems operational"}
              </Badge>
            }
          />
          <FacilityMap selected={zone} onSelect={setZone} />
          <div className="selected-zone-bar">
            <div className="zone-icon">
              <Building2 size={18} />
            </div>
            <div>
              <strong>{selected.name}</strong>
              <span>
                {selected.type} ·{" "}
                {
                  state.doors.filter(
                    (d) => d.zone === zone && d.status === "Secured",
                  ).length
                }{" "}
                of 2 doors secured
              </span>
            </div>
            <button
              className="round-arrow"
              aria-label={`Open ${selected.name} controls`}
              onClick={() => navigate("controls", zone)}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        </Card>
        <div className="overview-rail">
          <section className="shift-card">
            <div className="shift-card-top">
              <span>
                <i className="live-dot" /> YOUR SHIFT, AT A GLANCE
              </span>
              <Radio size={19} />
            </div>
            <div className="shift-illustration">
              <span />
              <span />
              <span />
              <ShieldCheck size={60} strokeWidth={1} />
            </div>
            <h2>
              Good to go,
              <br />
              {state.settings.operator.split(" ")[0]}.
            </h2>
            <p>
              {state.alarms.length
                ? `${state.alarms.length} life safety event requires your attention.`
                : "Your facility is connected and all life safety systems are normal."}
            </p>
            <div className="shift-footer">
              <span className="avatar">
                {state.settings.operator
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")}
              </span>
              <div>
                <strong>{state.settings.operator}</strong>
                <small>Shift supervisor</small>
              </div>
              <Badge>On duty</Badge>
            </div>
          </section>
          <Card className="quick-actions">
            <CardTitle title="Quick actions" />
            <button onClick={onScenario}>
              <span className="quick-icon">
                <Play size={17} />
              </span>
              <span>
                Run a training scenario
                <small>Practice with simulated events</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button onClick={() => navigate("controls")}>
              <span className="quick-icon">
                <LockKeyhole size={17} />
              </span>
              <span>
                Open central control<small>Manage doors & access points</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <button onClick={() => navigate("cameras")}>
              <span className="quick-icon">
                <Video size={17} />
              </span>
              <span>
                Camera workspace<small>View simulated camera feeds</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          </Card>
        </div>
      </div>
      <div className="overview-bottom">
        <Card>
          <CardTitle
            title="Live activity"
            subtitle="The latest across your facility"
            action={
              <label className="small-select">
                <select
                  aria-label="Filter activity"
                  value={eventFilter}
                  onChange={(e) => setEventFilter(e.target.value)}
                >
                  <option value="all">All events</option>
                  <option value="access">Access</option>
                  <option value="safety">Life safety</option>
                  <option value="resident">Residents</option>
                  <option value="incident">Incidents</option>
                  <option value="program">Programs</option>
                  <option value="system">System</option>
                </select>
                <ChevronDown size={13} />
              </label>
            }
          />
          <ActivityList category={eventFilter} />
          <div className="card-footer">
            <span>
              <i className="live-dot" />
              Updates automatically
            </span>
            <TextLink onClick={() => navigate("reports")}>
              View audit log
            </TextLink>
          </div>
        </Card>
        <Card className="schedule-card">
          <CardTitle
            title="Today’s programs"
            subtitle="Structure that supports progress"
            action={<span className="count-chip">{state.programs.length}</span>}
          />
          <div className="mini-schedule">
            {state.programs
              .filter((p) => p.status !== "Completed")
              .slice(0, 3)
              .map((p) => (
                <button key={p.id} onClick={() => navigate("programs", p.id)}>
                  <div className="schedule-time">
                    {p.time}
                    <span>{p.duration}</span>
                  </div>
                  <div className="schedule-details">
                    <strong>{p.name}</strong>
                    <span>
                      {zoneName(p.location)} · {p.roster.length} residents
                    </span>
                  </div>
                  {p.status === "In session" ? (
                    <span className="in-session-dot" title="In session" />
                  ) : (
                    <ArrowUpRight size={15} />
                  )}
                </button>
              ))}
          </div>
          <div className="card-footer">
            <TextLink onClick={() => navigate("programs")}>
              View program schedule
            </TextLink>
            <button
              className="subtle-button"
              onClick={async () => {
                if (
                  !(await dispatch({
                    type: "log",
                    title: "Program schedule reviewed",
                    detail: `${state.settings.operator} · ${state.programs.length} programs`,
                    category: "program",
                  }))
                )
                  return;
                notify("Schedule review recorded in the audit log");
              }}
            >
              Mark reviewed <Check size={13} />
            </button>
          </div>
        </Card>
      </div>
      <div className="workspace-footnote">
        <span>
          <ShieldCheck size={13} />A fictional facility. A realistic training
          environment.
        </span>
        <span>
          JailOpsSim <span className="footnote-dot">/</span> Simulation mode
        </span>
      </div>
    </>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 3v10M3 8h10"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Facilities({ navigate }: { navigate: Navigate }) {
  const { state, dispatch, notify } = useSimulation();
  const [selected, setSelected] = useState("A1");
  const z = zones.find((v) => v.id === selected)!;
  const count = state.residents.filter((r) => r.unit === selected).length;
  return (
    <>
      <PageHeading
        eyebrow="FACILITY MANAGEMENT"
        title="Spaces with purpose"
        description="Explore your campus, housing capacity, and zone health."
      />
      <div className="stats-grid">
        <Stat
          label="Facility zones"
          value={zones.length}
          icon={Building2}
          note="One connected campus"
        />
        <Stat
          label="Residential capacity"
          value={64}
          unit="beds"
          icon={Users}
          note={`${64 - state.residents.length} spaces available`}
        />
        <Stat
          label="Occupancy"
          value={`${Math.round((state.residents.length / 64) * 100)}%`}
          icon={Activity}
          note={`${state.residents.length} residents in care`}
        />
        <Stat
          label="Life safety"
          value={state.alarms.length ? "Alert" : "Normal"}
          icon={Flame}
          tone={state.alarms.length ? "red" : "green"}
          note={`${state.alarms.length} panel events`}
        />
      </div>
      <div className="detail-grid">
        <Card>
          <CardTitle
            title="Campus floor plan"
            subtitle="Choose any zone to view its operational details"
          />
          <FacilityMap selected={selected} onSelect={setSelected} />
        </Card>
        <Card className="zone-detail">
          <div className="zone-hero">
            <Building2 size={34} />
            <Badge tone="green">{z.type}</Badge>
          </div>
          <h2>{z.name}</h2>
          <p>
            {z.label} · Zone {z.id}
          </p>
          <dl className="detail-list">
            <div>
              <dt>Assigned residents</dt>
              <dd>
                {z.capacity ? `${count} / ${z.capacity}` : "Non-residential"}
              </dd>
            </div>
            <div>
              <dt>Access points</dt>
              <dd>2 simulated doors</dd>
            </div>
            <div>
              <dt>Panel events</dt>
              <dd>{state.alarms.filter((a) => a.zone === z.id).length}</dd>
            </div>
            <div>
              <dt>Open work orders</dt>
              <dd>
                {
                  state.workOrders.filter(
                    (w) => w.zone === z.id && w.status !== "Completed",
                  ).length
                }
              </dd>
            </div>
          </dl>
          {z.capacity > 0 && (
            <div className="capacity-block">
              <div>
                <span>Housing occupancy</span>
                <strong>{Math.round((count / z.capacity) * 100)}%</strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${(count / z.capacity) * 100}%` }} />
              </div>
            </div>
          )}
          <Button
            variant="primary"
            onClick={() => navigate("controls", selected)}
          >
            <DoorClosed size={16} />
            Open zone controls
            <ArrowRight size={15} />
          </Button>
          <Button
            onClick={async () => {
              if (
                !(await dispatch({
                  type: "log",
                  title: "Zone inspection recorded",
                  detail: `${z.name} · Visual inspection complete · ${state.settings.operator}`,
                  category: "system",
                }))
              )
                return;
              notify(`${z.name} inspection recorded`);
            }}
          >
            <CircleCheck size={16} />
            Record inspection
          </Button>
        </Card>
      </div>
      <div className="housing-grid">
        {zones
          .filter((v) => v.capacity)
          .map((v) => (
            <Card
              key={v.id}
              className={`housing-card ${selected === v.id ? "active" : ""}`}
            >
              <button onClick={() => setSelected(v.id)}>
                <div>
                  <span className="eyebrow">HOUSING {v.id}</span>
                  <h3>{v.name}</h3>
                </div>
                <ArrowUpRight size={18} />
              </button>
              <div className="housing-count">
                {state.residents.filter((r) => r.unit === v.id).length}
                <span>/ {v.capacity} residents</span>
              </div>
              <div className="progress-track">
                <i
                  style={{
                    width: `${(state.residents.filter((r) => r.unit === v.id).length / v.capacity) * 100}%`,
                  }}
                />
              </div>
              <p>
                <i className="live-dot" />
                {
                  state.doors.filter(
                    (d) => d.zone === v.id && d.status === "Secured",
                  ).length
                }{" "}
                of 2 access points secured
              </p>
            </Card>
          ))}
      </div>
    </>
  );
}

export function Controls({ initialZone = "A1" }: { initialZone?: string }) {
  const { state, dispatch, notify } = useSimulation();
  const [selected, setSelected] = useState(initialZone);
  const [confirm, setConfirm] = useState(false);
  const zoneDoors = state.doors.filter((d) => d.zone === selected);
  const [filter, setFilter] = useState<"zone" | "all">("zone");
  const displayed = filter === "zone" ? zoneDoors : state.doors;
  const command = async (id: string, mode: "release" | "secure" | "hold") => {
    const d = state.doors.find((v) => v.id === id)!;
    if (
      mode !== "secure" &&
      state.doors.some((v) => v.id === d.pair && v.status !== "Secured")
    ) {
      notify("Interlock active: secure the paired door first.", true);
      return;
    }
    if (!(await dispatch({ type: "door", id, mode }))) return;
    notify(
      mode === "release"
        ? `${id} released for 8 seconds`
        : `${id} ${mode === "hold" ? "held open" : "secured"}`,
    );
  };
  return (
    <>
      <PageHeading
        eyebrow="SIMULATED BUILDING SYSTEMS"
        title="Central control"
        description="A connected control room for every access point on campus."
      >
        <Badge tone="green" dot>
          Training simulation
        </Badge>
        <Button variant="primary" onClick={() => setConfirm(true)}>
          <LockKeyhole size={16} />
          Secure all doors
        </Button>
      </PageHeading>
      <div className="info-strip">
        <ShieldCheck size={18} />
        <span>
          <strong>Interlocks enabled.</strong> Paired doors cannot be released
          together. Timed releases automatically secure after 8 seconds.
        </span>
      </div>
      <div className="control-layout">
        <Card className="control-map">
          <CardTitle
            title="Interactive control plan"
            subtitle="Select a zone, then operate its access points"
            action={
              <Badge>
                {state.doors.filter((d) => d.status === "Secured").length}/
                {state.doors.length} secured
              </Badge>
            }
          />
          <FacilityMap selected={selected} onSelect={setSelected} />
        </Card>
        <Card className="door-panel">
          <CardTitle
            title={zoneName(selected)}
            subtitle={`Zone ${selected} · Access control`}
          />
          <div className="segmented">
            <button
              className={filter === "zone" ? "active" : ""}
              onClick={() => setFilter("zone")}
            >
              Selected zone
            </button>
            <button
              className={filter === "all" ? "active" : ""}
              onClick={() => setFilter("all")}
            >
              All doors
            </button>
          </div>
          <div className="door-list">
            {displayed.map((d) => {
              const paired = state.doors.find((v) => v.id === d.pair);
              const blocked = paired?.status !== "Secured";
              return (
                <div className="door-item" key={d.id}>
                  <div className="door-title">
                    <span
                      className={`door-state-icon ${d.status === "Secured" ? "" : "unlocked"}`}
                    >
                      {d.status === "Secured" ? (
                        <DoorClosed size={21} />
                      ) : (
                        <DoorOpen size={21} />
                      )}
                    </span>
                    <div>
                      <strong>{d.id}</strong>
                      <p>{d.name}</p>
                    </div>
                    <Badge
                      tone={d.status === "Secured" ? "green" : "amber"}
                      dot
                    >
                      {d.status}
                    </Badge>
                  </div>
                  <div className="door-info">
                    <span>INTERLOCK {d.pair}</span>
                    <span>{blocked ? "Paired door active" : "Ready"}</span>
                  </div>
                  <div className="door-buttons">
                    <Button
                      variant={d.status === "Secured" ? "primary" : "secondary"}
                      disabled={d.status !== "Secured" || blocked}
                      onClick={() => command(d.id, "release")}
                    >
                      <DoorOpen size={14} />
                      Release 8s
                    </Button>
                    <Button
                      disabled={d.status !== "Secured" || blocked}
                      onClick={() => command(d.id, "hold")}
                    >
                      Hold open
                    </Button>
                    <Button
                      disabled={d.status === "Secured"}
                      onClick={() => command(d.id, "secure")}
                    >
                      <LockKeyhole size={14} />
                      Secure
                    </Button>
                  </div>
                  {blocked && (
                    <p className="interlock-warning">
                      Interlock active — secure {d.pair} to enable release.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="panel-note">
            <Radio size={15} />
            Commands affect this simulation only.
          </div>
        </Card>
      </div>
      <Card className="control-audit">
        <CardTitle
          title="Access activity"
          subtitle="Every simulated command is recorded"
        />
        <ActivityList category="access" limit={4} />
      </Card>
      {confirm && (
        <Modal
          title="Secure all access points?"
          subtitle="This applies to all 18 simulated doors across the campus."
          onClose={() => setConfirm(false)}
        >
          <div className="modal-body">
            <div className="info-strip">
              <LockKeyhole size={20} />
              <span>
                Active releases and holds will end. All door indicators will
                return to secured.
              </span>
            </div>
          </div>
          <div className="modal-actions">
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (!(await dispatch({ type: "secureAll" }))) return;
                notify("All 18 simulated doors secured");
                setConfirm(false);
              }}
            >
              Secure all doors
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function ScenarioModal({
  onClose,
  navigate,
}: {
  onClose: () => void;
  navigate: Navigate;
}) {
  const { state, dispatch, notify } = useSimulation();
  const [scenario, setScenario] = useState("fire");
  const [zone, setZone] = useState("EDU");
  const scenarios: {
    id: string;
    title: string;
    description: string;
    icon: typeof Flame;
  }[] = [
    {
      id: "fire",
      title: "Fire response drill",
      description:
        "Trigger a detector and practice acknowledge, silence, restore, and reset.",
      icon: Flame,
    },
    {
      id: "door",
      title: "Door held-open event",
      description:
        "Investigate an access exception and restore a secured state.",
      icon: DoorOpen,
    },
    {
      id: "welfare",
      title: "Resident count check",
      description: "Run a housing count and record a completed welfare check.",
      icon: Users,
    },
  ];
  const run = async () => {
    if (scenario === "fire") {
      if (
        state.alarms.some(
          (a) => a.zone === zone && a.kind === "Fire alarm" && a.active,
        )
      ) {
        notify("This zone already has an active fire scenario.", true);
        return;
      }
      if (!(await dispatch({ type: "alarm", zone, kind: "Fire alarm" })))
        return;
      navigate("fire");
    } else if (scenario === "door") {
      if (
        state.doors.some((d) => d.id === `${zone}-02` && d.status !== "Secured")
      ) {
        notify(
          "Secure the paired interior door before starting this scenario.",
          true,
        );
        return;
      }
      if (!(await dispatch({ type: "door", id: `${zone}-01`, mode: "hold" })))
        return;
      navigate("controls", zone);
    } else {
      const n = state.residents.filter((r) => r.unit === zone).length;
      if (
        !(await dispatch({
          type: "log",
          title: "Resident count verified",
          detail: `${zoneName(zone)} · ${n} of ${n} assigned residents accounted for · Training scenario`,
          category: "resident",
        }))
      )
        return;
      navigate("residents");
    }
    notify("Training scenario started");
    onClose();
  };
  return (
    <Modal
      title="Practice. Learn. Be ready."
      subtitle="Choose a scenario to introduce a realistic event into the workspace."
      onClose={onClose}
    >
      <div className="modal-body scenario-options">
        {scenarios.map((s) => (
          <button
            key={s.id}
            className={scenario === s.id ? "selected" : ""}
            onClick={() => {
              setScenario(s.id);
              if (s.id === "welfare") setZone("A1");
            }}
          >
            <s.icon size={23} />
            <span>
              <strong>{s.title}</strong>
              <small>{s.description}</small>
            </span>
            <span className="radio-circle">{scenario === s.id && <i />}</span>
          </button>
        ))}
        <Field label="Scenario zone">
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            {zones
              .filter((z) => scenario !== "welfare" || z.capacity > 0)
              .map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <div className="modal-actions">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={run}>
          <Play size={15} />
          Start scenario
        </Button>
      </div>
    </Modal>
  );
}

export function eventCsv(events: ActivityType[]) {
  csvDownload(
    "jailops-audit-log.csv",
    ["Timestamp", "Category", "Event", "Details"],
    events.map((e) => [e.time, e.type, e.title, e.detail]),
  );
}
