import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  Flame,
  Grid2X2,
  Grid3X3,
  Maximize2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  Signal,
  Video,
  WifiOff,
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
} from "./components";
import { clockTime, zoneName, zones } from "./model";
import type { Alarm } from "./model";
import { useSimulation } from "./store";
import { ActivityList } from "./Operations";

export function FireSafety({ initialZone }: { initialZone?: string }) {
  const { state, dispatch, notify } = useSimulation();
  const [zone, setZone] = useState(
    initialZone && zones.some((z) => z.id === initialZone)
      ? initialZone
      : "EDU",
  );
  const [kind, setKind] = useState<Alarm["kind"]>("Fire alarm");
  const [lampTest, setLampTest] = useState(false);
  const [guide, setGuide] = useState(false);
  const [displayTime, setDisplayTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setDisplayTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (!lampTest) return;
    const t = setTimeout(() => setLampTest(false), 3000);
    return () => clearTimeout(t);
  }, [lampTest]);
  const counts = {
    fire: state.alarms.filter((a) => a.kind === "Fire alarm").length,
    trouble: state.alarms.filter((a) => a.kind === "Trouble").length,
    supervisory: state.alarms.filter((a) => a.kind === "Supervisory").length,
  };
  const unack = state.alarms.some((a) => !a.acknowledged);
  const resettable =
    state.alarms.length > 0 &&
    !state.alarms.some((a) => a.active || !a.acknowledged);
  const displayEvent =
    state.alarms.find((a) => a.kind === "Fire alarm") ?? state.alarms[0];
  const inject = async () => {
    if (
      state.alarms.some((a) => a.zone === zone && a.kind === kind && a.active)
    ) {
      notify("An identical event is already active in this zone.", true);
      return;
    }
    if (!(await dispatch({ type: "alarm", zone, kind }))) return;
    notify(`${kind} injected at ${zoneName(zone)}`);
  };
  return (
    <>
      <PageHeading
        eyebrow="LIFE SAFETY SIMULATION"
        title="Ready for the unexpected"
        description="A realistic addressable fire panel, built for hands-on practice."
      >
        <Button onClick={() => setGuide(true)}>
          <ShieldCheck size={16} />
          Response guide
        </Button>
        <Badge tone={state.alarms.length ? "red" : "green"} dot>
          {state.alarms.length ? "Panel events active" : "System normal"}
        </Badge>
      </PageHeading>
      <div className="fire-layout">
        <section
          className={`fire-panel ${counts.fire ? "in-alarm" : ""}`}
          aria-label="Sentinel simulated fire alarm control panel"
        >
          <div className="panel-brand">
            <div>
              <span className="panel-logomark">S</span>
              <strong>
                SENTINEL<span>LIFE SAFETY SYSTEMS</span>
              </strong>
            </div>
            <span>
              FACP–4000<small>TRAINING SIMULATOR</small>
            </span>
          </div>
          <div className="panel-main">
            <div className="panel-leds">
              {[
                { label: "AC POWER", on: true, color: "green" },
                { label: "FIRE ALARM", on: counts.fire > 0, color: "red" },
                {
                  label: "SUPERVISORY",
                  on: counts.supervisory > 0,
                  color: "amber",
                },
                {
                  label: "SYSTEM TROUBLE",
                  on: counts.trouble > 0,
                  color: "amber",
                },
                {
                  label: "SIGNALS SILENCED",
                  on: state.silenced,
                  color: "amber",
                },
              ].map((l) => (
                <div key={l.label}>
                  <i
                    className={`panel-led ${l.color} ${l.on || lampTest ? "on" : ""} ${l.on && unack && l.color !== "green" ? "flashing" : ""}`}
                  />
                  <span>{l.label}</span>
                </div>
              ))}
            </div>
            <div className={`lcd-screen ${counts.fire ? "alarm-screen" : ""}`}>
              <div className="lcd-top">
                <span>NORTHWOOD / MAIN CAMPUS</span>
                <span>
                  {displayTime.toLocaleTimeString([], { hour12: false })}
                </span>
              </div>
              <div className="lcd-main">
                {displayEvent ? (
                  <>
                    <span className="lcd-status">
                      {counts.fire ? "** FIRE ALARM **" : "** SYSTEM EVENT **"}
                    </span>
                    <strong>{zoneName(displayEvent.zone).toUpperCase()}</strong>
                    <span>{displayEvent.device.toUpperCase()}</span>
                    <span>
                      {unack
                        ? "ACKNOWLEDGEMENT REQUIRED"
                        : state.alarms.some((a) => a.active)
                          ? "RESTORE SOURCE BEFORE RESET"
                          : "ALL SOURCES RESTORED / RESET READY"}
                    </span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={31} strokeWidth={1.4} />
                    <strong>SYSTEM NORMAL</strong>
                    <span>ALL MONITORED POINTS NORMAL</span>
                    <span>
                      {displayTime.toLocaleDateString().toUpperCase()} · LOCAL
                      SIMULATION
                    </span>
                  </>
                )}
              </div>
              <div className="lcd-counts">
                <span>ALARM: {String(counts.fire).padStart(3, "0")}</span>
                <span>SUPV: {String(counts.supervisory).padStart(3, "0")}</span>
                <span>TRBL: {String(counts.trouble).padStart(3, "0")}</span>
              </div>
            </div>
            <div className="panel-buttons">
              <button
                disabled={!unack}
                onClick={async () => {
                  if (!(await dispatch({ type: "acknowledge" }))) return;
                  notify("All panel events acknowledged");
                }}
              >
                <span className="hardware-button blue">
                  <CheckCheck size={23} />
                </span>
                <strong>ACKNOWLEDGE</strong>
                <small>Accept panel events</small>
              </button>
              <button
                disabled={!state.alarms.length || unack || state.silenced}
                onClick={async () => {
                  if (!(await dispatch({ type: "silence" }))) return;
                  notify("Simulated notification outputs silenced");
                }}
              >
                <span className="hardware-button amber">
                  <BellOff size={23} />
                </span>
                <strong>SIGNAL SILENCE</strong>
                <small>Mute notification outputs</small>
              </button>
              <button
                disabled={!resettable}
                onClick={async () => {
                  if (!(await dispatch({ type: "resetPanel" }))) return;
                  notify("Fire panel reset · System normal");
                }}
              >
                <span className="hardware-button green">
                  <RotateCcw size={23} />
                </span>
                <strong>SYSTEM RESET</strong>
                <small>Restore normal state</small>
              </button>
              <button
                disabled={lampTest}
                onClick={async () => {
                  setLampTest(true);
                  if (
                    !(await dispatch({
                      type: "log",
                      title: "Panel lamp test completed",
                      detail: "Sentinel FACP-4000 · All indicators tested",
                      category: "safety",
                    }))
                  )
                    return;
                  notify("Panel lamp test running for 3 seconds");
                }}
              >
                <span className="hardware-button neutral">
                  <Signal size={23} />
                </span>
                <strong>LAMP TEST</strong>
                <small>Test panel indicators</small>
              </button>
            </div>
            <div className="panel-hardware-footer">
              <span>
                <i />
                CONTROL ENABLED
              </span>
              <span>SIMULATION • NO HARDWARE CONNECTION</span>
            </div>
          </div>
          <div className="panel-bottom-vents">
            {Array.from({ length: 24 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </section>
        <div className="fire-rail">
          <Card>
            <CardTitle
              title="Scenario injector"
              subtitle="Create a condition to practice your response"
            />
            <div className="injector-form">
              <Field label="Initiating zone">
                <select value={zone} onChange={(e) => setZone(e.target.value)}>
                  {zones.map((z) => (
                    <option value={z.id} key={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Event type">
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as Alarm["kind"])}
                >
                  <option>Fire alarm</option>
                  <option>Supervisory</option>
                  <option>Trouble</option>
                </select>
              </Field>
              <p className="muted">
                {kind === "Fire alarm"
                  ? "Activates a simulated smoke detector and notification outputs."
                  : kind === "Trouble"
                    ? "Simulates an open circuit on the signaling line."
                    : "Simulates a sprinkler control valve supervisory condition."}
              </p>
              <Button variant="primary" onClick={inject}>
                <Flame size={16} />
                Inject simulated event
              </Button>
            </div>
          </Card>
          <Card className="training-note">
            <span className="eyebrow">THE RESPONSE SEQUENCE</span>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <strong>Acknowledge</strong>
                  <p>Accept the event at the panel.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Silence</strong>
                  <p>Silence simulated notification outputs.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Restore & reset</strong>
                  <p>Clear the initiating source below, then reset.</p>
                </div>
              </li>
            </ol>
          </Card>
        </div>
      </div>
      <Card className="panel-events">
        <CardTitle
          title="Panel event queue"
          subtitle="Events remain latched until acknowledged, restored, and reset"
          action={
            <Badge tone={state.alarms.length ? "amber" : "green"}>
              {state.alarms.length} events
            </Badge>
          }
        />
        {state.alarms.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Zone / initiating device</th>
                  <th>Time</th>
                  <th>Acknowledgement</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {state.alarms.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Badge
                        tone={a.kind === "Fire alarm" ? "red" : "amber"}
                        dot
                      >
                        {a.kind}
                      </Badge>
                    </td>
                    <td>
                      <strong className="table-primary">
                        {zoneName(a.zone)}
                      </strong>
                      <small>{a.device}</small>
                    </td>
                    <td>{clockTime(a.time)}</td>
                    <td>
                      {a.acknowledged ? (
                        <span className="status-text green">
                          <CheckCheck size={15} />
                          Acknowledged
                        </span>
                      ) : (
                        <span className="status-text amber">
                          <Bell size={15} />
                          Unacknowledged
                        </span>
                      )}
                    </td>
                    <td>
                      {a.active ? (
                        <Button
                          onClick={async () => {
                            if (
                              !(await dispatch({
                                type: "clearSource",
                                id: a.id,
                              }))
                            )
                              return;
                            notify(
                              "Source restored. Acknowledge and reset the panel to clear the event.",
                            );
                          }}
                        >
                          Restore source
                        </Button>
                      ) : (
                        <Badge tone="green">Restored · Latched</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="All clear. All connected."
            description="No fire, supervisory, or trouble events. Use the scenario injector to begin training."
          />
        )}
      </Card>
      <Card className="control-audit">
        <CardTitle
          title="Life safety activity"
          subtitle="Panel operations and training events"
        />
        <ActivityList category="safety" limit={4} />
      </Card>
      {guide && (
        <Modal
          title="Fire panel response guide"
          subtitle="A fictional training workflow for this simulator."
          onClose={() => setGuide(false)}
        >
          <div className="modal-body guide-copy">
            <p>
              <strong>1. Inject a condition.</strong> Choose a zone and event
              type. The panel displays the event and the corresponding indicator
              lights.
            </p>
            <p>
              <strong>2. Acknowledge.</strong> Accept all current events. New
              conditions require a new acknowledgement.
            </p>
            <p>
              <strong>3. Signal silence.</strong> After acknowledgement, silence
              the simulated notification outputs. The event remains active.
            </p>
            <p>
              <strong>4. Restore the source.</strong> In the event queue,
              restore each initiating condition. Events remain latched at the
              panel.
            </p>
            <p>
              <strong>5. Reset.</strong> When every source is restored and every
              event acknowledged, reset the panel to normal.
            </p>
            <div className="info-strip">
              <CircleAlert size={19} />
              <span>
                This is a fictional interface with no connection to fire systems
                or emergency services. Follow your organization’s procedures for
                real incidents.
              </span>
            </div>
          </div>
          <div className="modal-actions">
            <Button variant="primary" onClick={() => setGuide(false)}>
              Start practicing
              <ChevronRight size={15} />
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

const cameras = [
  { id: "CAM-01", name: "Main reception", zone: "INT", scene: "hall" },
  { id: "CAM-02", name: "Cedar House corridor", zone: "A1", scene: "hall" },
  { id: "CAM-03", name: "Central courtyard", zone: "YARD", scene: "yard" },
  { id: "CAM-04", name: "Learning center entry", zone: "EDU", scene: "hall" },
  { id: "CAM-05", name: "Maple House corridor", zone: "A2", scene: "hall" },
  { id: "CAM-06", name: "Oak House corridor", zone: "B1", scene: "hall" },
  { id: "CAM-07", name: "Willow House corridor", zone: "B2", scene: "hall" },
  { id: "CAM-08", name: "Health services lobby", zone: "MED", scene: "hall" },
  { id: "CAM-09", name: "Control room entry", zone: "OPS", scene: "hall" },
];
type Camera = (typeof cameras)[number];
export function Cameras({ initialZone }: { initialZone?: string }) {
  const { dispatch, notify } = useSimulation();
  const [layout, setLayout] = useState(4);
  const [filter, setFilter] = useState(
    initialZone && zones.some((z) => z.id === initialZone)
      ? initialZone
      : "all",
  );
  const [offline, setOffline] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [night, setNight] = useState(false);
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, [paused]);
  const visible = cameras
    .filter((c) => filter === "all" || c.zone === filter)
    .slice(0, layout);
  const camera = cameras.find((c) => c.id === selected);
  const signal = async (id: string) => {
    const lost = !offline.includes(id);
    setOffline((v) => (lost ? [...v, id] : v.filter((x) => x !== id)));
    if (
      !(await dispatch({
        type: "log",
        title: lost ? "Camera signal loss simulated" : "Camera signal restored",
        detail: `${id} · Generated training feed`,
        category: "system",
      }))
    )
      return;
    notify(lost ? `${id} signal loss simulated` : `${id} signal restored`);
  };
  return (
    <>
      <PageHeading
        eyebrow="VIDEO SIMULATION WORKSPACE"
        title="A wider perspective"
        description="Generated camera scenes for control-room familiarization."
      >
        <Badge tone="blue">
          <Video size={13} />
          Synthetic video only
        </Badge>
        <Button onClick={() => setPaused((v) => !v)}>
          {paused ? <Play size={15} /> : <Pause size={15} />}
          {paused ? "Resume feeds" : "Pause feeds"}
        </Button>
      </PageHeading>
      <div className="camera-toolbar">
        <div>
          <span className="live-dot" />
          <strong>
            {cameras.length - offline.length} / {cameras.length} simulated feeds
            online
          </strong>
          <span className="muted">
            {paused ? "Playback paused" : "Training scene generator active"}
          </span>
        </div>
        <div className="filter-group">
          <select
            aria-label="Camera zone"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name}
              </option>
            ))}
          </select>
          <Button onClick={() => setNight((v) => !v)}>
            {night ? "Day view" : "Night view"}
          </Button>
          <div className="segmented icon-segments">
            <button
              aria-label="Four camera layout"
              className={layout === 4 ? "active" : ""}
              onClick={() => setLayout(4)}
            >
              <Grid2X2 size={18} />
            </button>
            <button
              aria-label="Nine camera layout"
              className={layout === 9 ? "active" : ""}
              onClick={() => setLayout(9)}
            >
              <Grid3X3 size={18} />
            </button>
          </div>
        </div>
      </div>
      <div className={`camera-grid ${layout === 9 ? "nine" : ""}`}>
        {visible.map((c) => (
          <Card className="camera-card" key={c.id}>
            <CameraFeed
              camera={c}
              time={time}
              offline={offline.includes(c.id)}
              night={night}
              paused={paused}
              onExpand={() => setSelected(c.id)}
            />
            <div className="camera-caption">
              <div>
                <strong>{c.name}</strong>
                <span>
                  {c.id} · {zoneName(c.zone)}
                </span>
              </div>
              <button
                className="icon-button"
                aria-label={`Expand ${c.name}`}
                onClick={() => setSelected(c.id)}
              >
                <Maximize2 size={17} />
              </button>
            </div>
          </Card>
        ))}
      </div>
      <div className="info-strip camera-notice">
        <Radio size={18} />
        <span>
          Every view is a generated illustration. No cameras, recordings,
          residents, or external video sources are connected.
        </span>
      </div>
      {camera && (
        <Modal
          title={camera.name}
          subtitle={`${camera.id} · ${zoneName(camera.zone)} · Synthetic training scene`}
          onClose={() => setSelected(null)}
          wide
        >
          <div className="modal-body">
            <CameraFeed
              camera={camera}
              time={time}
              offline={offline.includes(camera.id)}
              paused={paused}
              night={night}
            />
            <div className="camera-modal-meta">
              <Badge tone={offline.includes(camera.id) ? "amber" : "green"} dot>
                {offline.includes(camera.id) ? "Signal lost" : "Online"}
              </Badge>
              <span>1920 × 1080 simulated · No recording</span>
            </div>
          </div>
          <div className="modal-actions split">
            <Button onClick={() => signal(camera.id)}>
              <WifiOff size={15} />
              {offline.includes(camera.id)
                ? "Restore signal"
                : "Simulate signal loss"}
            </Button>
            <Button variant="primary" onClick={() => setSelected(null)}>
              Close view
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function CameraFeed({
  camera: c,
  time,
  offline,
  night,
  paused,
  onExpand,
}: {
  camera: Camera;
  time: Date;
  offline: boolean;
  night: boolean;
  paused: boolean;
  onExpand?: () => void;
}) {
  const seed = Number(c.id.slice(-2));
  return (
    <div
      className={`camera-feed ${night ? "night" : ""} ${paused ? "paused" : ""} ${offline ? "offline" : ""}`}
    >
      {offline ? (
        <div className="signal-lost">
          <WifiOff size={35} strokeWidth={1} />
          <strong>VIDEO SIGNAL LOST</strong>
          <span>{c.id} · Simulated connection fault</span>
        </div>
      ) : (
        <svg
          viewBox="0 0 640 350"
          preserveAspectRatio="xMidYMid slice"
          aria-label={`Generated scene of ${c.name}`}
          role="img"
        >
          <defs>
            <linearGradient id={`floor-${seed}`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#83958b" />
              <stop offset="1" stopColor="#b5bdb1" />
            </linearGradient>
          </defs>
          {c.scene === "yard" ? (
            <>
              <rect width="640" height="350" fill="#afbbaa" />
              <path d="M0 0h640v85H0" fill="#c6d0c2" />
              <path d="M0 70h640v80H0" fill="#859786" />
              <path d="M80 350l150-215h180l160 215" fill="#bdc0b0" />
              <rect
                x="255"
                y="160"
                width="128"
                height="110"
                fill="#839d7c"
                stroke="#d9dfcd"
              />
              <ellipse
                cx="319"
                cy="211"
                rx="28"
                ry="18"
                fill="none"
                stroke="#d6ddca"
              />
              <path d="M255 212h128" stroke="#d6ddca" />
              {[40, 170, 470, 605].map((x, i) => (
                <g key={x}>
                  <path d={`M${x} 170V80`} stroke="#697860" strokeWidth="5" />
                  <circle cx={x} cy={76 + (i % 2) * 15} r="33" fill="#6a8567" />
                  <circle
                    cx={x - 15}
                    cy={90 + (i % 2) * 15}
                    r="22"
                    fill="#75916c"
                  />
                </g>
              ))}
              <path d="M0 310h640M0 320h640" stroke="#697766" strokeWidth="3" />
            </>
          ) : (
            <>
              <rect width="640" height="350" fill="#a4afa4" />
              <path
                d="M0 0l250 105v125L0 350Z"
                fill={seed % 2 ? "#a8b3a6" : "#acb6aa"}
              />
              <path d="M640 0L390 105v125l250 120Z" fill="#87998d" />
              <path
                d="M0 350l250-120h140l250 120Z"
                fill={`url(#floor-${seed})`}
              />
              <path d="M0 0h640L390 105H250Z" fill="#c0c6b9" />
              <path d="M250 105h140v125H250Z" fill="#7f9488" />
              <rect
                x="288"
                y="135"
                width="65"
                height="95"
                fill="#576e64"
                stroke="#b3c0af"
                strokeWidth="4"
              />
              <rect x="300" y="150" width="39" height="43" fill="#879c8d" />
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <path
                    d={`M${30 + i * 73} ${60 + i * 24}l${49 - i * 10} ${18 - i * 2}v${177 - i * 45}l-${49 - i * 10} ${19 - i * 3}Z`}
                    fill="#6b8275"
                    stroke="#c1cbbc"
                    strokeWidth="2"
                  />
                  <path
                    d={`M${580 - i * 74} ${65 + i * 23}l-${43 - i * 9} ${16 - i * 2}v${165 - i * 43}l${43 - i * 9} ${20 - i * 3}Z`}
                    fill="#627d6d"
                    stroke="#aabaac"
                    strokeWidth="2"
                  />
                </g>
              ))}
              <path
                d="M0 290l250-75m390 75-250-75"
                stroke="#687f70"
                strokeWidth="4"
              />
              <path
                d="M100 350l180-120m260 120L360 230m-190 40h300m-255-26h210M110 310h420"
                fill="none"
                stroke="#99a697"
                strokeWidth="1"
              />
              <path
                d="M283 10h75l-15 12h-45ZM299 61h41l-8 8h-25Z"
                fill="#e0e5d6"
              />
              <rect x="291" y="112" width="58" height="9" fill="#8eb29a" />
              <text
                x="320"
                y="119"
                textAnchor="middle"
                fontSize="6"
                fill="#ecf4e9"
              >
                EXIT
              </text>
            </>
          )}
          {Array.from({ length: 55 }, (_, i) => (
            <path
              key={i}
              d={`M0 ${i * 7}h640`}
              stroke="#fff"
              strokeOpacity=".035"
            />
          ))}
        </svg>
      )}
      <div className="camera-overlay-top">
        <span>
          <i className={offline ? "offline-dot" : "live-dot"} />
          {offline ? "OFFLINE" : paused ? "PAUSED" : "SIM LIVE"}
        </span>
        <span>
          {time.toLocaleDateString()}{" "}
          {time.toLocaleTimeString([], { hour12: false })}
        </span>
      </div>
      <div className="camera-overlay-bottom">
        <span>
          {c.id} / {c.name.toUpperCase()}
        </span>
        <span>SIMULATED VIDEO</span>
      </div>
      {!offline && <div className="scanline" />}
      {onExpand && (
        <button
          className="feed-expand"
          aria-label={`Open ${c.name} feed`}
          onClick={onExpand}
        >
          <Maximize2 size={18} />
        </button>
      )}
    </div>
  );
}
