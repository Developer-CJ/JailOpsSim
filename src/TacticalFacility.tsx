import { useState } from "react";
import {
  ArrowUpRight,
  Camera,
  DoorClosed,
  Flame,
  Layers,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Badge, Button, Card, Field, Modal, PageHeading } from "./components";
import { useSimulation } from "./store";
import { zones, zoneName } from "./model";
import type { Page, Resident } from "./model";
import { openConsole } from "./console";

const layerNames = ["Doors", "Cameras", "Residents", "Fire", "Patrol"] as const;
type Layer = (typeof layerNames)[number];
export function TacticalFacility({
  navigate,
}: {
  navigate: (page: Page, id?: string) => void;
}) {
  const { state, dispatch, pending } = useSimulation();
  const [zone, setZone] = useState("A1"),
    [layers, setLayers] = useState<Layer[]>([
      "Doors",
      "Cameras",
      "Residents",
      "Fire",
    ]),
    [zoom, setZoom] = useState(1),
    [doorId, setDoor] = useState("A1-01"),
    [resident, setResident] = useState<Resident | null>(null),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [drag, setDrag] = useState<{
      x: number;
      y: number;
      px: number;
      py: number;
    } | null>(null);
  const z = zones.find((z) => z.id === zone)!,
    selectedDoor = state.doors.find((d) => d.id === doorId),
    here = state.residents.filter(
      (r) => (state.extension.locations[r.id] ?? r.unit) === zone,
    ),
    home = state.residents.filter((r) => r.unit === zone),
    alarms = state.alarms.filter((a) => a.zone === zone),
    utility = state.extension.utilities[zone];
  const choose = (id: string) => {
    setZone(id);
    setDoor(`${id}-01`);
  };
  return (
    <>
      <PageHeading
        eyebrow="LIVE FACILITY VIEW / LEVEL 01"
        title="The whole campus, connected"
        description="Explore rooms, live door states, camera stations, life safety events, and patrol checkpoints."
      >
        <Button
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <RotateCcw size={15} />
          Reset view
        </Button>
        <Button
          onClick={() =>
            void document.documentElement
              .requestFullscreen()
              .catch(() => undefined)
          }
        >
          <Maximize2 size={15} />
          Full screen
        </Button>
      </PageHeading>
      <div className="tactical-status">
        <span>
          <i />
          FACILITY ONLINE
        </span>
        <span>
          <Users size={15} />
          {state.residents.length} residents
        </span>
        <span>
          <DoorClosed size={15} />
          {state.doors.filter((d) => d.status === "Secured").length} /{" "}
          {state.doors.length} doors secured
        </span>
        <span className={state.alarms.length ? "alert" : ""}>
          <Flame size={15} />
          {state.alarms.length} panel events
        </span>
        <span>
          <ShieldCheck size={15} />
          {
            state.extension.patrols.filter((p) => p.status === "On patrol")
              .length
          }{" "}
          active rounds
        </span>
      </div>
      <div className="tactical-layout">
        <Card className="tactical-map-card">
          <div className="tactical-map-toolbar">
            <div>
              <Layers size={17} />
              <strong>MAP LAYERS</strong>
            </div>
            <div>
              {layerNames.map((layer) => (
                <button
                  key={layer}
                  aria-pressed={layers.includes(layer)}
                  onClick={() =>
                    setLayers(
                      layers.includes(layer)
                        ? layers.filter((l) => l !== layer)
                        : [...layers, layer],
                    )
                  }
                >
                  {layer}
                </button>
              ))}
            </div>
          </div>
          <div className="tactical-canvas">
            <svg
              viewBox="0 0 800 540"
              role="img"
              aria-label="Detailed interactive facility map"
              onPointerDown={(e) => {
                if (
                  e.target === e.currentTarget ||
                  (e.target as SVGElement).dataset.pan === "true"
                ) {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDrag({ x: e.clientX, y: e.clientY, px: pan.x, py: pan.y });
                }
              }}
              onPointerMove={(e) => {
                if (drag) {
                  const factor =
                    800 / e.currentTarget.getBoundingClientRect().width;
                  setPan({
                    x: drag.px + (e.clientX - drag.x) * factor,
                    y: drag.py + (e.clientY - drag.y) * factor,
                  });
                }
              }}
              onPointerUp={() => setDrag(null)}
              onPointerCancel={() => setDrag(null)}
            >
              <defs>
                <pattern
                  id="tactical-grid"
                  width="20"
                  height="20"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M20 0H0V20"
                    fill="none"
                    stroke="var(--map-grid)"
                    strokeWidth=".55"
                  />
                </pattern>
                <pattern
                  id="tactical-stripes"
                  width="6"
                  height="6"
                  patternUnits="userSpaceOnUse"
                  patternTransform="rotate(45)"
                >
                  <path d="M0 0V6" stroke="#e8ad4740" strokeWidth="2" />
                </pattern>
                <filter id="marker-glow">
                  <feGaussianBlur stdDeviation="1.2" />
                </filter>
              </defs>
              <rect
                width="800"
                height="540"
                fill="url(#tactical-grid)"
                data-pan="true"
              />
              <g
                transform={`translate(${pan.x + 30} ${pan.y + 24}) translate(370 245) scale(${zoom}) translate(-370 -245)`}
              >
                <rect
                  x="31"
                  y="30"
                  width="685"
                  height="438"
                  rx="4"
                  className="tactical-perimeter"
                />
                <path
                  d="M43 42H704V456H43Z"
                  fill="none"
                  stroke="var(--map-edge)"
                  strokeDasharray="4 4"
                />
                <path
                  d="M270 58V448M465 58V448M52 207H689M52 359H689"
                  className="tactical-corridor"
                />
                <path
                  d="M270 58V448M465 58V448M52 207H689M52 359H689"
                  fill="none"
                  stroke="var(--map-edge)"
                  strokeWidth=".8"
                  strokeDasharray="3 7"
                />
                <text
                  x="366"
                  y="46"
                  textAnchor="middle"
                  className="tactical-zone-caption"
                >
                  NORTHWOOD YOUTH CENTER / LEVEL 01
                </text>
                {zones.map((v) => {
                  const picked = zone === v.id,
                    alarm = state.alarms.some((a) => a.zone === v.id),
                    color = v.capacity
                      ? "blue"
                      : v.id === "EDU"
                        ? "violet"
                        : v.id === "YARD"
                          ? "cyan"
                          : v.id === "MED"
                            ? "rose"
                            : "blue";
                  const residents = state.residents.filter(
                      (r) => r.unit === v.id,
                    ),
                    checked = state.extension.patrols.some(
                      (p) =>
                        p.status === "On patrol" &&
                        p.checkpoints.some(
                          (c) => c.zone === v.id && c.checkedAt,
                        ),
                    );
                  return (
                    <g
                      key={v.id}
                      className={`tactical-zone ${color} ${picked ? "selected" : ""} ${alarm && layers.includes("Fire") ? "zone-alarm" : ""}`}
                    >
                      <rect
                        role="button"
                        tabIndex={0}
                        aria-label={`Inspect ${v.name}`}
                        aria-pressed={picked}
                        x={v.x}
                        y={v.y}
                        width={v.w}
                        height={v.h}
                        rx="2"
                        onClick={() => choose(v.id)}
                        onKeyDown={(e) => {
                          if (["Enter", " "].includes(e.key)) {
                            e.preventDefault();
                            choose(v.id);
                          }
                        }}
                      />
                      {v.capacity > 0 &&
                        Array.from({ length: 16 }, (_, i) => {
                          const room = String(i + 1).padStart(2, "0"),
                            r = residents.find((r) => r.room === room),
                            x = v.x + 8 + (i % 8) * 22.4,
                            y = v.y + (i < 8 ? 6 : v.h - 28);
                          return (
                            <g
                              key={i}
                              className={`tactical-room ${r ? "occupied" : ""}`}
                              role="button"
                              tabIndex={0}
                              aria-label={`${v.name} room ${room}${r ? `, ${r.name}` : ", available"}`}
                              onClick={() => {
                                choose(v.id);
                                if (r) setResident(r);
                              }}
                              onKeyDown={(e) => {
                                if (["Enter", " "].includes(e.key)) {
                                  e.preventDefault();
                                  choose(v.id);
                                  if (r) setResident(r);
                                }
                              }}
                            >
                              <rect x={x} y={y} width="20.4" height="22" />
                              <path
                                d={`M${x + 3} ${y + 3}h10v6h-10z`}
                                fill="none"
                                stroke="var(--map-edge)"
                                strokeWidth=".6"
                              />
                              <path
                                d={`M${x + 5} ${y + 22}h7`}
                                stroke="var(--accent)"
                                strokeWidth="1.5"
                              />
                              <text x={x + 10} y={y + 17} textAnchor="middle">
                                {room}
                              </text>
                              {r && layers.includes("Residents") && (
                                <circle
                                  cx={x + 17}
                                  cy={y + 4}
                                  r="1.5"
                                  fill="var(--cyan)"
                                />
                              )}
                            </g>
                          );
                        })}
                      {v.id === "EDU" &&
                        Array.from({ length: 8 }, (_, i) => (
                          <g key={i} className="map-furniture">
                            <rect
                              x={v.x + 16 + (i % 4) * 35}
                              y={v.y + 9 + Math.floor(i / 4) * 48}
                              width="19"
                              height="8"
                              rx="1"
                            />
                            <path
                              d={`M${v.x + 18 + (i % 4) * 35} ${v.y + 20 + Math.floor(i / 4) * 48}h15`}
                            />
                          </g>
                        ))}
                      {v.id === "YARD" && (
                        <g className="map-furniture">
                          <rect
                            x={v.x + 11}
                            y={v.y + 10}
                            width={v.w - 22}
                            height={v.h - 20}
                            rx="2"
                          />
                          <path
                            d={`M${v.x + v.w / 2} ${v.y + 10}v${v.h - 20}`}
                          />
                          <circle
                            cx={v.x + v.w / 2}
                            cy={v.y + v.h / 2}
                            r="17"
                          />
                          <path
                            d={`M${v.x + 11} ${v.y + 30}h22v40h-22m${v.w - 22} -40h-22v40h22`}
                          />
                        </g>
                      )}
                      {v.id === "MED" &&
                        Array.from({ length: 3 }, (_, i) => (
                          <g className="map-furniture" key={i}>
                            <rect
                              x={v.x + 8 + i * 55}
                              y={v.y + 5}
                              width="25"
                              height="12"
                              rx="2"
                            />
                            <path d={`M${v.x + 13 + i * 55} ${v.y + 5}v12`} />
                          </g>
                        ))}
                      {v.id === "OPS" &&
                        Array.from({ length: 4 }, (_, i) => (
                          <g className="map-furniture" key={i}>
                            <rect
                              x={v.x + 12 + i * 44}
                              y={v.y + 7}
                              width="30"
                              height="11"
                            />
                            <path d={`M${v.x + 23 + i * 44} ${v.y + 20}h8`} />
                          </g>
                        ))}
                      <text
                        x={v.x + v.w / 2}
                        y={v.y + v.h / 2 + (v.capacity ? 0 : 5)}
                        textAnchor="middle"
                        className="tactical-zone-title"
                        pointerEvents="none"
                      >
                        {v.name.toUpperCase()}
                      </text>
                      <text
                        x={v.x + v.w / 2}
                        y={v.y + v.h / 2 + (v.capacity ? 14 : 18)}
                        textAnchor="middle"
                        className="tactical-zone-caption"
                        pointerEvents="none"
                      >
                        {v.capacity
                          ? `${residents.length} / 16 HOME PLACEMENTS`
                          : v.label.toUpperCase()}
                      </text>
                      {layers.includes("Doors") &&
                        state.doors
                          .filter((d) => d.zone === v.id)
                          .map((d, i) => (
                            <g
                              key={d.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`Inspect door ${d.id}, ${d.status}`}
                              className={`tactical-door ${d.status === "Secured" ? "secured" : "released"} ${d.id === doorId ? "selected" : ""}`}
                              onClick={() => {
                                setZone(v.id);
                                setDoor(d.id);
                              }}
                              onKeyDown={(e) => {
                                if (["Enter", " "].includes(e.key)) {
                                  e.preventDefault();
                                  setZone(v.id);
                                  setDoor(d.id);
                                }
                              }}
                            >
                              <rect
                                x={v.x + v.w / 2 - 26 + i * 35}
                                y={v.y + v.h - 4}
                                width="21"
                                height="8"
                                rx="1"
                              />
                              <text
                                x={v.x + v.w / 2 - 16 + i * 35}
                                y={v.y + v.h + 13}
                                textAnchor="middle"
                              >
                                {String(i + 1).padStart(2, "0")}
                              </text>
                              <rect
                                className="tactical-hit-target"
                                x={v.x + v.w / 2 - 28 + i * 35}
                                y={v.y + v.h - 7}
                                width="25"
                                height="23"
                              />
                            </g>
                          ))}
                      {layers.includes("Cameras") && (
                        <g
                          className="tactical-camera"
                          role="button"
                          tabIndex={0}
                          aria-label={`Open camera ${v.name}`}
                          onClick={() => openConsole("cameras", v.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") openConsole("cameras", v.id);
                          }}
                          transform={`translate(${v.x + v.w - 11} ${v.y - 10})`}
                        >
                          <circle r="7" />
                          <path d="M-3-2h4v4h-4zM1-1l3-1v4L1 1" />
                        </g>
                      )}
                      {alarm && layers.includes("Fire") && (
                        <g
                          transform={`translate(${v.x + 12} ${v.y - 10})`}
                          className="tactical-alarm"
                        >
                          <circle r="8" />
                          <text y="3" textAnchor="middle">
                            !
                          </text>
                        </g>
                      )}
                      {layers.includes("Patrol") && (
                        <g
                          transform={`translate(${v.x + v.w - 13} ${v.y + v.h / 2})`}
                          className={`tactical-patrol ${checked ? "verified" : ""}`}
                        >
                          <circle r="7" />
                          <text y="3" textAnchor="middle">
                            {checked ? "✓" : "P"}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
                <path
                  d="M355 461v20h35v-20"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                />
                <text
                  x="372"
                  y="496"
                  textAnchor="middle"
                  className="tactical-zone-caption"
                >
                  MAIN ENTRANCE / RECEPTION
                </text>
              </g>
              <g transform="translate(759 25)" className="tactical-compass">
                <text y="-6" textAnchor="middle">
                  N
                </text>
                <path d="M0 0l-6 18 6-5 6 5z" />
              </g>
            </svg>
            <div className="tactical-zoom">
              <button
                aria-label="Zoom out"
                disabled={zoom <= 0.8}
                onClick={() => setZoom(Math.max(0.8, zoom - 0.2))}
              >
                <Minus size={16} />
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                aria-label="Zoom in"
                disabled={zoom >= 2}
                onClick={() => setZoom(Math.min(2, zoom + 0.2))}
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="map-pan-hint">
              Drag background to pan · Select a room or device
            </div>
          </div>
          <div className="tactical-legend">
            <span>
              <i className="blue" />
              Housing
            </span>
            <span>
              <i className="violet" />
              Education
            </span>
            <span>
              <i className="cyan" />
              Recreation
            </span>
            <span>
              <i className="rose" />
              Health
            </span>
            <span>
              <i className="amber" />
              Released door
            </span>
            <span>
              <i className="red" />
              Panel event
            </span>
          </div>
        </Card>
        <Card className="zone-inspector">
          <div className="inspector-heading">
            <span className="eyebrow">ZONE {z.id} / INSPECTOR</span>
            <h2>{z.name}</h2>
            <Badge tone={alarms.length ? "red" : "blue"} dot>
              {alarms.length ? "Panel event" : "Zone online"}
            </Badge>
          </div>
          <div className="inspector-metrics">
            <div>
              <strong>{home.length}</strong>
              <small>Home roster</small>
            </div>
            <div>
              <strong>{here.length}</strong>
              <small>Recorded here</small>
            </div>
            <div>
              <strong>{utility.temperature}°</strong>
              <small>Setpoint</small>
            </div>
          </div>
          <div className="inspector-section">
            <h3>
              <DoorClosed size={16} />
              Door controls
            </h3>
            <Field label="Selected door">
              <select value={doorId} onChange={(e) => setDoor(e.target.value)}>
                {state.doors
                  .filter((d) => d.zone === zone)
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
              </select>
            </Field>
            {selectedDoor && (
              <>
                <div className="inspector-door-state">
                  <strong>{selectedDoor.id}</strong>
                  <Badge
                    tone={selectedDoor.status === "Secured" ? "blue" : "amber"}
                  >
                    {selectedDoor.status}
                  </Badge>
                </div>
                <p>
                  Paired door {selectedDoor.pair} ·{" "}
                  {state.doors.find((d) => d.id === selectedDoor.pair)?.status}
                </p>
                <div className="inspector-door-actions">
                  {(["release", "hold", "secure"] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={mode === "secure" ? "secondary" : "primary"}
                      disabled={
                        pending ||
                        (mode !== "secure" &&
                          (selectedDoor.status !== "Secured" ||
                            state.doors.some(
                              (d) =>
                                d.id === selectedDoor.pair &&
                                d.status !== "Secured",
                            )))
                      }
                      onClick={() =>
                        void dispatch({ type: "door", id: doorId, mode })
                      }
                    >
                      {mode === "release"
                        ? "Release 8s"
                        : mode === "hold"
                          ? "Hold open"
                          : "Secure"}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="inspector-section">
            <h3>
              <Layers size={16} />
              Environment
            </h3>
            <div className="inspector-summary">
              <span>
                Lighting<strong>{utility.lighting}</strong>
              </span>
              <span>
                Ventilation<strong>{utility.ventilation}</strong>
              </span>
            </div>
          </div>
          <div className="inspector-section">
            <h3>
              <Flame size={16} />
              Life safety
            </h3>
            {alarms.length ? (
              alarms.map((a) => (
                <p key={a.id} className="alert">
                  {a.kind} ·{" "}
                  {a.acknowledged ? "Acknowledged" : "Unacknowledged"}
                </p>
              ))
            ) : (
              <p>No panel events in this zone</p>
            )}
          </div>
          <div className="inspector-links">
            <Button onClick={() => openConsole("cameras", zone)}>
              <Camera size={16} />
              Camera console
              <ArrowUpRight size={14} />
            </Button>
            <Button onClick={() => navigate("residents", home[0]?.id)}>
              <Users size={16} />
              Resident directory
              <ArrowUpRight size={14} />
            </Button>
            <Button onClick={() => navigate("rounds")}>
              <ShieldCheck size={16} />
              Patrol rounds
              <ArrowUpRight size={14} />
            </Button>
          </div>
        </Card>
      </div>
      {resident && (
        <Modal
          title={`${zoneName(resident.unit)} / Room ${resident.room}`}
          subtitle="Current home placement"
          onClose={() => setResident(null)}
        >
          <div className="modal-body room-profile">
            <span className="avatar">
              {resident.name
                .split(" ")
                .map((v) => v[0])
                .join("")}
            </span>
            <h3>{resident.name}</h3>
            <p>
              {resident.id} · {resident.status}
            </p>
            <p>
              Recorded location:{" "}
              {zoneName(
                state.extension.locations[resident.id] ?? resident.unit,
              )}
            </p>
          </div>
          <div className="modal-actions">
            <Button onClick={() => setResident(null)}>Close</Button>
            <Button
              variant="primary"
              onClick={() => navigate("residents", resident.id)}
            >
              Open resident profile
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
