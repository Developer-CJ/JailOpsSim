import { useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock3,
  Flag,
  KeyRound,
  Lightbulb,
  Megaphone,
  Package,
  Phone,
  Play,
  Plus,
  Radio,
  Route,
  ShieldCheck,
  Thermometer,
  Users,
  Volume2,
} from "lucide-react";
import type { ReactNode } from "react";
import {
  Badge,
  Button,
  Card,
  CardTitle,
  Empty,
  Field,
  Modal,
  PageHeading,
  download,
} from "./components";
import { useSimulation } from "./store";
import { clockTime, zoneName, zones } from "./model";
import { drillTemplates } from "../shared/expansion";
import type { DrillKind, ExpansionAction } from "../shared/expansion";
import { openConsole } from "./console";

function ZoneSelect({
  value,
  onChange,
  housing = false,
  id,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  housing?: boolean;
}) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
      {zones
        .filter((z) => !housing || z.capacity)
        .map((z) => (
          <option key={z.id} value={z.id}>
            {z.name}
          </option>
        ))}
    </select>
  );
}
function StaffSelect({
  value,
  onChange,
  all = false,
  id,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  all?: boolean;
}) {
  const { state } = useSimulation();
  return (
    <select
      id={id}
      required
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Select staff member
      </option>
      {state.staff
        .filter((s) => all || s.status === "On duty")
        .map((s) => (
          <option key={s.id}>{s.name}</option>
        ))}
    </select>
  );
}
function MetricStrip({
  items,
}: {
  items: {
    label: string;
    value: string | number;
    icon: ReactNode;
    color?: string;
  }[];
}) {
  return (
    <div className="ops-metrics">
      {items.map((i) => (
        <div key={i.label} className={`ops-metric ${i.color ?? ""}`}>
          <span>{i.icon}</span>
          <div>
            <strong>{i.value}</strong>
            <small>{i.label}</small>
          </div>
        </div>
      ))}
    </div>
  );
}
function HistoryTime({ time }: { time: string }) {
  return (
    <time dateTime={time} title={new Date(time).toLocaleString()}>
      {new Date(time).toLocaleDateString([], {
        month: "short",
        day: "numeric",
      })}{" "}
      · {clockTime(time)}
    </time>
  );
}
function useCommand() {
  const { dispatch, notify } = useSimulation();
  return async (a: ExpansionAction, message?: string) => {
    const ok = await dispatch(a);
    if (ok && message) notify(message);
    return ok;
  };
}

export function Accountability({ initialZone }: { initialZone?: string }) {
  const { state, pending } = useSimulation(),
    send = useCommand();
  const [zone, setZone] = useState(
    initialZone && ["A1", "A2", "B1", "B2"].includes(initialZone)
      ? initialZone
      : "A1",
  );
  const counts = state.extension.headcounts,
    active = counts.find((c) => c.zone === zone && c.status === "In progress"),
    latest = counts.find((c) => c.zone === zone && c.status === "Completed");
  const [finish, setFinish] = useState(false);
  const shown = active ?? latest;
  return (
    <>
      <PageHeading
        eyebrow="RESIDENT ACCOUNTABILITY"
        title="Every resident accounted for"
        description="Verify each identity against a roster captured at the start of the count."
      >
        <Button
          variant="primary"
          disabled={!!active || pending}
          onClick={() =>
            void send({ type: "headcountStart", zone }, "Headcount started")
          }
        >
          <Plus size={16} />
          Start headcount
        </Button>
      </PageHeading>
      <MetricStrip
        items={[
          {
            label: "Residents on campus",
            value: state.residents.length,
            icon: <Users />,
          },
          {
            label: "Counts in progress",
            value: counts.filter((c) => c.status === "In progress").length,
            icon: <ClipboardCheck />,
            color: "violet",
          },
          {
            label: "Completed counts",
            value: counts.filter((c) => c.status === "Completed").length,
            icon: <CheckCheck />,
            color: "cyan",
          },
          {
            label: "Latest discrepancies",
            value: latest
              ? latest.expected.length - latest.present.length
              : "—",
            icon: <Flag />,
            color: "amber",
          },
        ]}
      />
      <div className="ops-two-column">
        <Card>
          <CardTitle
            title="Identity verification"
            subtitle="Select a house to start or continue its count"
            action={
              <Field label="Housing zone">
                <ZoneSelect value={zone} onChange={setZone} housing />
              </Field>
            }
          />
          {shown ? (
            <>
              <div className="count-progress">
                <strong>
                  {shown.present.length}
                  <small> / {shown.expected.length} verified</small>
                </strong>
                <Badge tone={shown.status === "Completed" ? "blue" : "amber"}>
                  {shown.status}
                </Badge>
                <div>
                  <i
                    style={{
                      width: `${(shown.present.length / Math.max(1, shown.expected.length)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="identity-grid">
                {shown.expected.map((r) => (
                  <label
                    key={r.id}
                    className={`identity-check ${shown.present.includes(r.id) ? "checked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={shown.present.includes(r.id)}
                      disabled={!active || pending}
                      onChange={(e) =>
                        void send({
                          type: "headcountMark",
                          id: shown.id,
                          residentId: r.id,
                          present: e.target.checked,
                        })
                      }
                    />
                    <span>
                      <strong>{r.name}</strong>
                      <small>
                        {r.id} · Room {r.room}
                      </small>
                    </span>
                    <Check size={16} />
                  </label>
                ))}
              </div>
              {active && (
                <div className="ops-card-footer">
                  <span>Unchecked identities become discrepancies.</span>
                  <Button
                    variant="primary"
                    disabled={pending}
                    onClick={() => setFinish(true)}
                  >
                    Record count result
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Empty
              title="Ready for a count"
              description="Start a headcount to capture this house’s current roster."
            />
          )}
        </Card>
        <Card>
          <CardTitle
            title="Count history"
            subtitle="Completed results are preserved"
          />
          {counts.filter((c) => c.status === "Completed").length ? (
            counts
              .filter((c) => c.status === "Completed")
              .map((c) => (
                <div className="ops-list-row" key={c.id}>
                  <span className="ops-row-icon">
                    <ClipboardCheck size={20} />
                  </span>
                  <div>
                    <strong>{zoneName(c.zone)}</strong>
                    <small>
                      {c.present.length} / {c.expected.length} verified ·{" "}
                      {c.expected.length - c.present.length} discrepancies
                    </small>
                    <HistoryTime time={c.completed!} />
                  </div>
                  <Button
                    onClick={() =>
                      download(
                        `headcount-${c.id}.json`,
                        JSON.stringify(c, null, 2),
                        "application/json",
                      )
                    }
                  >
                    Export
                  </Button>
                </div>
              ))
          ) : (
            <Empty
              title="No completed counts"
              description="Each result will include its original roster and verification time."
            />
          )}
        </Card>
      </div>
      {finish && active && (
        <Modal title="Record this headcount?" onClose={() => setFinish(false)}>
          <div className="modal-body">
            <p>
              {active.present.length} of {active.expected.length} identities
              verified. {active.expected.length - active.present.length}{" "}
              discrepancies will be recorded.
            </p>
          </div>
          <div className="modal-actions">
            <Button onClick={() => setFinish(false)}>Continue counting</Button>
            <Button
              variant="primary"
              onClick={async () => {
                if (
                  await send(
                    { type: "headcountFinish", id: active.id },
                    "Count result recorded",
                  )
                )
                  setFinish(false);
              }}
            >
              Confirm count
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Movements() {
  const { state, pending } = useSimulation(),
    send = useCommand();
  const [form, setForm] = useState(false),
    [residentId, setResident] = useState(state.residents[0]?.id ?? ""),
    [destination, setDestination] = useState("MED"),
    [escort, setEscort] = useState(""),
    [purpose, setPurpose] = useState("Health appointment");
  const moves = state.extension.movements;
  return (
    <>
      <PageHeading
        eyebrow="COORDINATED MOVEMENT"
        title="A clear path, every time"
        description="Queue escorted movements and record arrivals without changing home placements."
      >
        <Button variant="primary" onClick={() => setForm(true)}>
          <Plus size={16} />
          Plan movement
        </Button>
      </PageHeading>
      <MetricStrip
        items={[
          {
            label: "Awaiting escort",
            value: moves.filter((m) => m.status === "Queued").length,
            icon: <Clock3 />,
          },
          {
            label: "Currently moving",
            value: moves.filter((m) => m.status === "En route").length,
            icon: <Route />,
            color: "amber",
          },
          {
            label: "Confirmed arrivals",
            value: moves.filter((m) => m.status === "Arrived").length,
            icon: <CheckCheck />,
            color: "cyan",
          },
        ]}
      />
      <Card>
        <CardTitle
          title="Movement board"
          subtitle="Queue → escort → confirmed arrival"
        />
        {moves.length ? (
          <div className="movement-board">
            {(["Queued", "En route", "Arrived", "Cancelled"] as const).map(
              (status) => (
                <section className="movement-column" key={status}>
                  <h3>
                    <i className={status === "En route" ? "amber" : ""} />
                    {status}
                    <span>
                      {moves.filter((m) => m.status === status).length}
                    </span>
                  </h3>
                  {moves
                    .filter((m) => m.status === status)
                    .map((m) => (
                      <article className="movement-ticket" key={m.id}>
                        <strong>{m.residentName}</strong>
                        <small>{m.residentId}</small>
                        <div className="movement-path">
                          <span>{zoneName(m.origin)}</span>
                          <ArrowRight size={15} />
                          <span>{zoneName(m.destination)}</span>
                        </div>
                        <p>{m.purpose}</p>
                        <div className="ticket-meta">
                          <ShieldCheck size={14} />
                          {m.escort}
                        </div>
                        <HistoryTime time={m.updated} />
                        <div className="ticket-actions">
                          {status === "Queued" && (
                            <Button
                              variant="primary"
                              disabled={pending}
                              onClick={() =>
                                void send(
                                  {
                                    type: "movementStatus",
                                    id: m.id,
                                    status: "En route",
                                  },
                                  "Movement started",
                                )
                              }
                            >
                              Begin escort
                            </Button>
                          )}
                          {status === "En route" && (
                            <Button
                              variant="primary"
                              disabled={pending}
                              onClick={() =>
                                void send(
                                  {
                                    type: "movementStatus",
                                    id: m.id,
                                    status: "Arrived",
                                  },
                                  "Arrival confirmed",
                                )
                              }
                            >
                              Confirm arrival
                            </Button>
                          )}
                          {["Queued", "En route"].includes(status) && (
                            <Button
                              disabled={pending}
                              onClick={() =>
                                void send({
                                  type: "movementStatus",
                                  id: m.id,
                                  status: "Cancelled",
                                })
                              }
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </article>
                    ))}
                </section>
              ),
            )}
          </div>
        ) : (
          <Empty
            title="No movements planned"
            description="Plan an escorted movement to health, education, recreation, or another zone."
          />
        )}
      </Card>
      {form && (
        <Modal
          title="Plan an escorted movement"
          subtitle="Choose a resident, destination, and on-duty escort"
          onClose={() => setForm(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await send(
                  {
                    type: "movementCreate",
                    residentId,
                    destination,
                    escort,
                    purpose,
                  },
                  "Movement queued",
                )
              )
                setForm(false);
            }}
          >
            <div className="modal-body form-grid">
              <Field label="Resident">
                <select
                  value={residentId}
                  onChange={(e) => setResident(e.target.value)}
                  required
                >
                  {state.residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} · {r.id}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Destination">
                <ZoneSelect value={destination} onChange={setDestination} />
              </Field>
              <Field label="Escort">
                <StaffSelect value={escort} onChange={setEscort} />
              </Field>
              <Field label="Purpose">
                <input
                  required
                  maxLength={300}
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setForm(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={pending}>
                Queue movement
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Rounds() {
  const { state, pending } = useSimulation(),
    send = useCommand();
  const [officer, setOfficer] = useState(""),
    [selected, setSelected] = useState(""),
    [note, setNote] = useState(""),
    [checkpoint, setCheckpoint] = useState<string | null>(null);
  const patrols = state.extension.patrols,
    patrol = patrols.find((p) => p.id === selected) ?? patrols[0];
  return (
    <>
      <PageHeading
        eyebrow="PATROL & WELFARE ROUNDS"
        title="A complete picture of the round"
        description="Time-stamped checkpoint inspections across all nine campus zones."
      />
      <div className="ops-two-column">
        <Card>
          <CardTitle
            title="Start a patrol"
            subtitle="One active round per officer"
          />
          <form
            className="ops-inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await send({ type: "patrolStart", officer }, "Patrol started")
              )
                setSelected("");
            }}
          >
            <Field label="Patrol officer">
              <StaffSelect value={officer} onChange={setOfficer} />
            </Field>
            <Button variant="primary" type="submit" disabled={pending}>
              <Play size={16} />
              Begin patrol
            </Button>
          </form>
          <div className="ops-history-list">
            {patrols.map((p) => (
              <button
                key={p.id}
                className={`ops-list-row ${patrol?.id === p.id ? "selected" : ""}`}
                onClick={() => setSelected(p.id)}
              >
                <ShieldCheck size={20} />
                <span>
                  <strong>{p.officer}</strong>
                  <small>
                    {p.checkpoints.filter((c) => c.checkedAt).length} / 9
                    checkpoints · {p.status}
                  </small>
                  <HistoryTime time={p.started} />
                </span>
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle
            title={
              patrol ? `${patrol.officer} · Campus round` : "Checkpoint route"
            }
            subtitle="Inspect the zone, record exceptions, then verify"
            action={
              patrol && (
                <Badge tone={patrol.status === "Completed" ? "blue" : "amber"}>
                  {patrol.status}
                </Badge>
              )
            }
          />
          {patrol ? (
            <>
              <div className="checkpoint-list">
                {patrol.checkpoints.map((c, i) => (
                  <div
                    className={`checkpoint ${c.checkedAt ? "complete" : ""}`}
                    key={c.zone}
                  >
                    <span className="checkpoint-number">
                      {c.checkedAt ? (
                        <Check size={16} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <strong>{zoneName(c.zone)}</strong>
                      <small>
                        {c.checkedAt
                          ? `${clockTime(c.checkedAt)} · ${c.note || "No exceptions recorded"}`
                          : "Awaiting inspection"}
                      </small>
                    </div>
                    <Button
                      disabled={
                        !!c.checkedAt ||
                        pending ||
                        patrol.status === "Completed"
                      }
                      onClick={() => {
                        setCheckpoint(c.zone);
                        setNote("");
                      }}
                    >
                      {c.checkedAt ? "Verified" : "Inspect"}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="ops-card-footer">
                <span>
                  {patrol.checkpoints.filter((c) => c.checkedAt).length} / 9
                  checkpoints verified
                </span>
                <Button
                  variant="primary"
                  disabled={
                    pending ||
                    patrol.status === "Completed" ||
                    patrol.checkpoints.some((c) => !c.checkedAt)
                  }
                  onClick={() =>
                    void send(
                      { type: "patrolFinish", id: patrol.id },
                      "Patrol completed",
                    )
                  }
                >
                  Complete round
                </Button>
              </div>
            </>
          ) : (
            <Empty
              title="No patrol selected"
              description="Begin a round to open its nine-zone checkpoint route."
            />
          )}
        </Card>
      </div>
      {checkpoint && patrol && (
        <Modal
          title={`Inspect ${zoneName(checkpoint)}`}
          onClose={() => setCheckpoint(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await send(
                  {
                    type: "patrolCheck",
                    id: patrol.id,
                    zone: checkpoint,
                    note,
                  },
                  "Checkpoint verified",
                )
              )
                setCheckpoint(null);
            }}
          >
            <div className="modal-body">
              <Field label="Inspection note (optional)">
                <textarea
                  maxLength={500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Record observations or exceptions"
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setCheckpoint(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={pending}>
                Verify checkpoint
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Communications() {
  const { state, pending } = useSimulation(),
    send = useCommand();
  const [zone, setZone] = useState("A1"),
    [reason, setReason] = useState("Routine assistance requested"),
    [message, setMessage] = useState(""),
    [targets, setTargets] = useState<string[]>(["A1"]),
    [priority, setPriority] = useState<"Routine" | "Urgent">("Routine");
  const x = state.extension,
    connected = x.calls.find((c) => c.status === "Connected");
  return (
    <>
      <PageHeading
        eyebrow="COMMUNICATIONS CONSOLE"
        title="Connect across the campus"
        description="Simulated intercom stations and zone-selectable public address dispatch."
      />
      <MetricStrip
        items={[
          { label: "Stations online", value: 9, icon: <Radio /> },
          {
            label: "Calls waiting",
            value: x.calls.filter((c) => c.status === "Waiting").length,
            icon: <Phone />,
            color: "amber",
          },
          {
            label: "Announcements logged",
            value: x.announcements.length,
            icon: <Megaphone />,
            color: "violet",
          },
        ]}
      />
      <div className="ops-two-column">
        <Card className="intercom-console">
          <CardTitle
            title="INTERCOM / CALL CONTROL"
            subtitle="One connected station at a time"
          />
          <div className={`intercom-display ${connected ? "connected" : ""}`}>
            <span className="intercom-wave">
              {Array.from({ length: 24 }, (_, i) => (
                <i
                  key={i}
                  style={{
                    height: connected ? `${12 + ((i * 17) % 44)}px` : "4px",
                  }}
                />
              ))}
            </span>
            <strong>
              {connected ? zoneName(connected.zone) : "STATION STANDBY"}
            </strong>
            <span>{connected ? connected.reason : "No active connection"}</span>
            <small>SIMULATED AUDIO PATH · NO MICROPHONE CONNECTION</small>
          </div>
          <div className="intercom-stations">
            {zones.map((z) => (
              <button
                key={z.id}
                className={
                  x.calls.some((c) => c.zone === z.id && c.status !== "Ended")
                    ? "calling"
                    : ""
                }
                onClick={() => setZone(z.id)}
                aria-pressed={zone === z.id}
              >
                <Radio size={17} />
                <strong>{z.id}</strong>
                <small>{z.name}</small>
              </button>
            ))}
          </div>
          <form
            className="ops-inline-form"
            onSubmit={async (e) => {
              e.preventDefault();
              await send(
                { type: "intercomCreate", zone, reason },
                "Station call simulated",
              );
            }}
          >
            <Field label="Station">
              <ZoneSelect value={zone} onChange={setZone} />
            </Field>
            <Field label="Call reason">
              <input
                required
                maxLength={300}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
            <Button type="submit" variant="primary" disabled={pending}>
              Simulate call
            </Button>
          </form>
          <div>
            {x.calls
              .filter((c) => c.status !== "Ended")
              .map((c) => (
                <div className="ops-list-row" key={c.id}>
                  <Phone size={19} />
                  <div>
                    <strong>{zoneName(c.zone)}</strong>
                    <small>{c.reason}</small>
                    <Badge tone={c.status === "Connected" ? "blue" : "amber"}>
                      {c.status}
                    </Badge>
                  </div>
                  {c.status === "Waiting" && (
                    <Button
                      variant="primary"
                      disabled={pending || !!connected}
                      onClick={() =>
                        void send({
                          type: "intercomStatus",
                          id: c.id,
                          status: "Connected",
                        })
                      }
                    >
                      Answer
                    </Button>
                  )}
                  <Button
                    disabled={pending}
                    onClick={() =>
                      void send({
                        type: "intercomStatus",
                        id: c.id,
                        status: "Ended",
                      })
                    }
                  >
                    End call
                  </Button>
                </div>
              ))}
          </div>
        </Card>
        <Card>
          <CardTitle
            title="PUBLIC ADDRESS / ZONE DISPATCH"
            subtitle="Compose once, select the destination zones"
          />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await send(
                  { type: "announcement", zones: targets, message, priority },
                  "Announcement logged for selected zones",
                )
              )
                setMessage("");
            }}
          >
            <div className="pa-zone-grid">
              {zones.map((z) => (
                <label key={z.id}>
                  <input
                    type="checkbox"
                    checked={targets.includes(z.id)}
                    onChange={(e) =>
                      setTargets(
                        e.target.checked
                          ? [...targets, z.id]
                          : targets.filter((v) => v !== z.id),
                      )
                    }
                  />
                  <span>
                    <strong>{z.id}</strong>
                    <small>{z.name}</small>
                  </span>
                </label>
              ))}
            </div>
            <div className="ops-form-body">
              <Button onClick={() => setTargets(zones.map((z) => z.id))}>
                Select all zones
              </Button>
              <Field label="Priority">
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as "Routine" | "Urgent")
                  }
                >
                  <option>Routine</option>
                  <option>Urgent</option>
                </select>
              </Field>
              <Field label="Announcement message">
                <textarea
                  required
                  value={message}
                  maxLength={1000}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Enter the message to record for these zones…"
                />
              </Field>
              <Button
                type="submit"
                variant="primary"
                disabled={pending || !targets.length}
              >
                <Volume2 size={17} />
                Dispatch announcement
              </Button>
              <p className="ops-note">
                Dispatch records the message and destinations for training. No
                speakers are connected.
              </p>
            </div>
          </form>
          <div className="announcement-history">
            {x.announcements.map((a) => (
              <article key={a.id}>
                <div>
                  <Badge tone={a.priority === "Urgent" ? "amber" : "blue"}>
                    {a.priority}
                  </Badge>
                  <HistoryTime time={a.time} />
                </div>
                <p>{a.message}</p>
                <small>{a.zones.map(zoneName).join(" · ")}</small>
              </article>
            ))}
          </div>
          <details className="ops-details">
            <summary>
              Call history ({x.calls.filter((c) => c.status === "Ended").length}
              )
            </summary>
            {x.calls
              .filter((c) => c.status === "Ended")
              .map((c) => (
                <div className="ops-list-row" key={c.id}>
                  <div>
                    <strong>{zoneName(c.zone)}</strong>
                    <small>{c.reason}</small>
                    <HistoryTime time={c.ended!} />
                  </div>
                  <Badge>Ended</Badge>
                </div>
              ))}
          </details>
        </Card>
      </div>
    </>
  );
}

export function Environment() {
  const { state, pending } = useSimulation(),
    send = useCommand();
  const [zone, setZone] = useState("A1");
  const current = state.extension.utilities[zone];
  const [draft, setDraft] = useState(current);
  const changeZone = (v: string) => {
    setZone(v);
    setDraft(state.extension.utilities[v]);
  };
  return (
    <>
      <PageHeading
        eyebrow="BUILDING ENVIRONMENT"
        title="Set the campus atmosphere"
        description="Shared lighting schedules, temperature setpoints, and ventilation modes."
      />
      <div className="environment-layout">
        <Card>
          <CardTitle
            title="Campus zones"
            subtitle="Select an environment controller"
          />
          <div className="environment-zones">
            {zones.map((z) => (
              <button
                key={z.id}
                className={z.id === zone ? "active" : ""}
                onClick={() => changeZone(z.id)}
              >
                <span className="ops-row-icon">
                  <Lightbulb size={19} />
                </span>
                <span>
                  <strong>{z.name}</strong>
                  <small>
                    {state.extension.utilities[z.id].lighting} lighting
                  </small>
                </span>
                <b>{state.extension.utilities[z.id].temperature}°</b>
              </button>
            ))}
          </div>
        </Card>
        <Card className="environment-panel">
          <CardTitle
            title={zoneName(zone)}
            subtitle={`BMS-${zone} / TRAINING CONTROLLER`}
            action={
              <Badge tone="blue" dot>
                Online
              </Badge>
            }
          />
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await send(
                { type: "utility", zone, ...draft },
                "Zone environment saved",
              );
            }}
          >
            <div className="thermostat">
              <div>
                <Thermometer size={24} />
                <span>SETPOINT</span>
                <strong>
                  {draft.temperature}
                  <small>°C</small>
                </strong>
                <span>Comfort range 16–28°C</span>
              </div>
            </div>
            <div className="temperature-controls">
              <Button
                aria-label="Decrease temperature"
                disabled={draft.temperature <= 16}
                onClick={() =>
                  setDraft({ ...draft, temperature: draft.temperature - 1 })
                }
              >
                −
              </Button>
              <input
                aria-label="Temperature setpoint"
                type="range"
                min={16}
                max={28}
                value={draft.temperature}
                onChange={(e) =>
                  setDraft({ ...draft, temperature: Number(e.target.value) })
                }
              />
              <Button
                aria-label="Increase temperature"
                disabled={draft.temperature >= 28}
                onClick={() =>
                  setDraft({ ...draft, temperature: draft.temperature + 1 })
                }
              >
                +
              </Button>
            </div>
            <div className="environment-settings">
              <Field label="Lighting scene">
                <select
                  value={draft.lighting}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      lighting: e.target.value as typeof draft.lighting,
                    })
                  }
                >
                  <option>Day</option>
                  <option>Evening</option>
                  <option>Night</option>
                </select>
              </Field>
              <Field label="Ventilation">
                <select
                  value={draft.ventilation}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      ventilation: e.target.value as typeof draft.ventilation,
                    })
                  }
                >
                  <option>Auto</option>
                  <option>Boost</option>
                </select>
              </Field>
            </div>
            <div className="ops-card-footer">
              <span>
                Saved: {current.temperature}°C · {current.lighting} ·{" "}
                {current.ventilation}
              </span>
              <Button
                variant="primary"
                type="submit"
                disabled={
                  pending || JSON.stringify(current) === JSON.stringify(draft)
                }
              >
                Apply environment
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

export function Assets() {
  const { state, pending } = useSimulation(),
    send = useCommand();
  const [holder, setHolder] = useState(""),
    [selected, setSelected] = useState<string | null>(null);
  const assets = state.extension.assets;
  return (
    <>
      <PageHeading
        eyebrow="KEYS & EQUIPMENT"
        title="Know who holds what"
        description="Accountable checkout and return of training keys, radios, and equipment."
      />
      <MetricStrip
        items={[
          {
            label: "Registered assets",
            value: assets.length,
            icon: <Package />,
          },
          {
            label: "Available",
            value: assets.filter((a) => !a.holder).length,
            icon: <KeyRound />,
            color: "cyan",
          },
          {
            label: "Checked out",
            value: assets.filter((a) => a.holder).length,
            icon: <Users />,
            color: "amber",
          },
        ]}
      />
      <div className="asset-grid">
        {assets.map((a) => (
          <Card className="asset-card" key={a.id}>
            <div
              className={`asset-icon ${a.category === "Radio" ? "violet" : a.category === "Equipment" ? "cyan" : ""}`}
            >
              {a.category === "Radio" ? (
                <Radio size={25} />
              ) : a.category === "Key set" ? (
                <KeyRound size={25} />
              ) : (
                <Package size={25} />
              )}
            </div>
            <div className="eyebrow">
              {a.id} / {a.category}
            </div>
            <h2>{a.name}</h2>
            <Badge tone={a.holder ? "amber" : "blue"} dot>
              {a.holder ? "Checked out" : "Available"}
            </Badge>
            <div className="asset-custody">
              <small>CURRENT CUSTODIAN</small>
              <strong>{a.holder ?? "Secure storage"}</strong>
              {a.checkedOut && a.holder && <HistoryTime time={a.checkedOut} />}
            </div>
            <Button
              variant={a.holder ? "secondary" : "primary"}
              disabled={pending}
              onClick={() => {
                if (a.holder)
                  void send(
                    { type: "assetReturn", id: a.id },
                    "Asset returned",
                  );
                else {
                  setSelected(a.id);
                  setHolder("");
                }
              }}
            >
              {a.holder ? "Return to storage" : "Check out asset"}
            </Button>
          </Card>
        ))}
      </div>
      {selected && (
        <Modal
          title="Check out asset"
          subtitle={assets.find((a) => a.id === selected)?.name}
          onClose={() => setSelected(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await send(
                  { type: "assetCheckout", id: selected, holder },
                  "Asset checked out",
                )
              )
                setSelected(null);
            }}
          >
            <div className="modal-body">
              <Field label="Custodian">
                <StaffSelect value={holder} onChange={setHolder} />
              </Field>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setSelected(null)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={pending}>
                Confirm checkout
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Handover() {
  const { state, pending } = useSimulation(),
    send = useCommand();
  const [form, setForm] = useState(false),
    [title, setTitle] = useState(""),
    [note, setNote] = useState(""),
    [owner, setOwner] = useState(""),
    [priority, setPriority] = useState<"Routine" | "Important">("Routine");
  const tasks = state.extension.handovers;
  return (
    <>
      <PageHeading
        eyebrow="SHIFT CONTINUITY"
        title="Carry the context forward"
        description="Assign follow-ups, preserve shift notes, and track their completion."
      >
        <Button variant="primary" onClick={() => setForm(true)}>
          <Plus size={16} />
          Add handover task
        </Button>
        <Button
          onClick={() =>
            download(
              "shift-handover.json",
              JSON.stringify(
                { exported: new Date().toISOString(), tasks },
                null,
                2,
              ),
              "application/json",
            )
          }
        >
          Export handover
        </Button>
      </PageHeading>
      <MetricStrip
        items={[
          {
            label: "Open follow-ups",
            value: tasks.filter((t) => t.status === "Open").length,
            icon: <Flag />,
          },
          {
            label: "Important items",
            value: tasks.filter(
              (t) => t.status === "Open" && t.priority === "Important",
            ).length,
            icon: <Clock3 />,
            color: "amber",
          },
          {
            label: "Completed",
            value: tasks.filter((t) => t.status === "Completed").length,
            icon: <CheckCheck />,
            color: "cyan",
          },
        ]}
      />
      <div className="handover-board">
        {(["Open", "Completed"] as const).map((status) => (
          <Card key={status}>
            <CardTitle
              title={
                status === "Open"
                  ? "Incoming shift / follow-ups"
                  : "Completed handovers"
              }
              subtitle={
                status === "Open"
                  ? "Items requiring attention"
                  : "Recorded resolution history"
              }
            />
            {tasks.filter((t) => t.status === status).length ? (
              tasks
                .filter((t) => t.status === status)
                .map((t) => (
                  <article className="handover-task" key={t.id}>
                    <div>
                      <Badge
                        tone={t.priority === "Important" ? "amber" : "blue"}
                      >
                        {t.priority}
                      </Badge>
                      <HistoryTime time={t.created} />
                    </div>
                    <h3>{t.title}</h3>
                    <p>{t.note}</p>
                    <footer>
                      <span>
                        <Users size={14} />
                        {t.owner}
                      </span>
                      {status === "Open" ? (
                        <Button
                          disabled={pending}
                          onClick={() =>
                            void send(
                              { type: "handoverFinish", id: t.id },
                              "Handover task completed",
                            )
                          }
                        >
                          Mark complete
                        </Button>
                      ) : (
                        <CheckCheck size={18} />
                      )}
                    </footer>
                  </article>
                ))
            ) : (
              <Empty
                title={
                  status === "Open"
                    ? "No open follow-ups"
                    : "No completed tasks"
                }
                description="Add a note for the next shift to build a clear handover record."
              />
            )}
          </Card>
        ))}
      </div>
      {form && (
        <Modal title="Add a shift handover" onClose={() => setForm(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await send(
                  { type: "handoverCreate", title, note, owner, priority },
                  "Handover task added",
                )
              ) {
                setForm(false);
                setTitle("");
                setNote("");
              }
            }}
          >
            <div className="modal-body form-grid">
              <Field label="Task title">
                <input
                  required
                  maxLength={120}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field label="Owner">
                <StaffSelect value={owner} onChange={setOwner} all />
              </Field>
              <Field label="Priority">
                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value as typeof priority)
                  }
                >
                  <option>Routine</option>
                  <option>Important</option>
                </select>
              </Field>
              <Field label="Shift note">
                <textarea
                  required
                  maxLength={1500}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            </div>
            <div className="modal-actions">
              <Button onClick={() => setForm(false)}>Cancel</Button>
              <Button variant="primary" type="submit" disabled={pending}>
                Save handover
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}

export function Drills() {
  const { state, pending } = useSimulation(),
    send = useCommand();
  const [kind, setKind] = useState<DrillKind>("Fire response"),
    [zone, setZone] = useState("EDU");
  const drills = state.extension.drills,
    active = drills.find((d) => d.status === "Running");
  return (
    <>
      <PageHeading
        eyebrow="GUIDED TRAINING"
        title="Practice with a purpose"
        description="Five-step exercises verify real simulator actions and save completion scores."
      />
      <div className="ops-two-column">
        <Card>
          <CardTitle
            title="Exercise library"
            subtitle="Each drill works with your connected suite"
          />
          <div className="drill-library">
            {(Object.keys(drillTemplates) as DrillKind[]).map((k, i) => (
              <button
                className={kind === k ? "selected" : ""}
                key={k}
                onClick={() => {
                  setKind(k);
                  if (k === "Resident accountability") setZone("A1");
                }}
              >
                <span
                  className={`ops-row-icon ${i === 1 ? "violet" : i === 2 ? "cyan" : ""}`}
                >
                  {i === 0 ? (
                    <Flag size={22} />
                  ) : i === 1 ? (
                    <KeyRound size={22} />
                  ) : (
                    <Users size={22} />
                  )}
                </span>
                <span>
                  <strong>{k}</strong>
                  <small>5 checkpoints · Connected module verification</small>
                </span>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
          <div className="ops-form-body">
            <Field label="Exercise zone">
              <ZoneSelect
                value={zone}
                onChange={setZone}
                housing={kind === "Resident accountability"}
              />
            </Field>
            <p className="ops-note">
              Fire response starts a simulated fire event in the selected zone.
              Other drills guide you through existing controls.
            </p>
            <Button
              variant="primary"
              disabled={pending || !!active}
              onClick={() =>
                void send(
                  { type: "drillStart", kind, zone },
                  "Guided drill started",
                )
              }
            >
              <Play size={16} />
              Start guided drill
            </Button>
          </div>
        </Card>
        <Card>
          <CardTitle
            title={active ? active.kind : "Exercise console"}
            subtitle={
              active
                ? `${zoneName(active.zone)} · Started ${clockTime(active.started)}`
                : "Select a drill to begin"
            }
          />
          {active ? (
            <>
              <div className="drill-links">
                <Button
                  onClick={() => {
                    const p =
                      active.kind === "Fire response"
                        ? "fire"
                        : active.kind === "Access interlock"
                          ? "controls"
                          : "accountability";
                    if (!openConsole(p, active.zone)) window.location.hash = p;
                  }}
                >
                  Open training workspace <ArrowRight size={15} />
                </Button>
                {active.kind === "Resident accountability" && (
                  <a href="#handover">Open shift handover</a>
                )}
              </div>
              <div className="checkpoint-list">
                {drillTemplates[active.kind].map((step, i) => (
                  <div
                    className={`checkpoint ${active.steps[i] ? "complete" : ""}`}
                    key={step}
                  >
                    <span className="checkpoint-number">
                      {active.steps[i] ? <Check size={16} /> : i + 1}
                    </span>
                    <div>
                      <strong>{step}</strong>
                      <small>
                        {active.steps[i]
                          ? "Verified"
                          : i === 0 || active.steps[i - 1]
                            ? "Complete the action, then verify"
                            : "Complete the previous step first"}
                      </small>
                    </div>
                    <Button
                      disabled={
                        pending ||
                        active.steps[i] ||
                        (i > 0 && !active.steps[i - 1])
                      }
                      onClick={() =>
                        void send({ type: "drillStep", id: active.id, step: i })
                      }
                    >
                      {active.steps[i] ? "Done" : "Verify"}
                    </Button>
                  </div>
                ))}
              </div>
              <div className="ops-card-footer">
                <span>{active.steps.filter(Boolean).length} / 5 verified</span>
                <Button
                  variant="primary"
                  disabled={pending || active.steps.some((v) => !v)}
                  onClick={() =>
                    void send(
                      { type: "drillFinish", id: active.id },
                      "Drill completed — score recorded",
                    )
                  }
                >
                  Complete exercise
                </Button>
              </div>
            </>
          ) : (
            <Empty
              title="Ready when you are"
              description="Start an exercise to open its guided response checklist."
            />
          )}
        </Card>
      </div>
      <Card className="ops-section-gap">
        <CardTitle
          title="Training record"
          subtitle="Completed exercises and verified scores"
        />
        {drills.some((d) => d.status === "Completed") ? (
          drills
            .filter((d) => d.status === "Completed")
            .map((d) => (
              <div className="ops-list-row" key={d.id}>
                <ShieldCheck size={22} />
                <div>
                  <strong>{d.kind}</strong>
                  <small>{zoneName(d.zone)}</small>
                  <HistoryTime time={d.completed!} />
                </div>
                <span className="drill-score">{d.score}%</span>
                <Button
                  onClick={() =>
                    download(
                      `drill-${d.id}.json`,
                      JSON.stringify(d, null, 2),
                      "application/json",
                    )
                  }
                >
                  Export
                </Button>
              </div>
            ))
        ) : (
          <Empty
            title="No completed exercises"
            description="Verified exercise results will appear here."
          />
        )}
      </Card>
    </>
  );
}
