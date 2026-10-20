import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ButtonHTMLAttributes, ReactNode, ReactElement } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  Minus,
  Plus,
  Search,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Tone } from "./model";
import { zones } from "./model";
import { useSimulation } from "./store";

export function Button({
  children,
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={`button ${variant} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Badge({
  children,
  tone = "neutral",
  dot = false,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <i />}
      {children}
    </span>
  );
}
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function CardTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow = "OPERATIONS WORKSPACE",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          {title}
          <span className="title-dot">.</span>
        </h1>
        <p>{description}</p>
      </div>
      {children && <div className="heading-actions">{children}</div>}
    </div>
  );
}
export function Stat({
  label,
  value,
  unit,
  icon: Icon,
  note,
  tone = "green",
  trend,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  note: string;
  tone?: Tone;
  trend?: number[];
}) {
  return (
    <Card className="stat-card">
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={17} />
      </div>
      <div className="stat-value">
        {value}
        {unit && <span>{unit}</span>}
      </div>
      <div className="stat-bottom">
        <span className={`stat-note ${tone}`}>
          <i />
          {note}
        </span>
        {trend && (
          <svg
            viewBox="0 0 80 26"
            className={`sparkline ${tone}`}
            aria-hidden="true"
          >
            <polyline
              points={trend.map((n, i) => `${i * 10},${26 - n}`).join(" ")}
            />
          </svg>
        )}
      </div>
    </Card>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search records…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Search size={16} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <X size={14} />
        </button>
      )}
    </label>
  );
}
export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <span>
        <Check size={24} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const firstControl =
      ref.current?.querySelector<HTMLElement>(
        "input:not([disabled]), select:not([disabled]), textarea:not([disabled])",
      ) ?? ref.current?.querySelector<HTMLElement>("button:not([disabled])");
    firstControl?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const focusable = ref.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        );
        if (!focusable?.length) return;
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  return createPortal(
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close.current();
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-header">
          <div>
            <div className="eyebrow">JAILOPS SIMULATION</div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const control = isValidElement(children)
    ? cloneElement(
        children as ReactElement<{ id?: string; "aria-describedby"?: string }>,
        {
          id,
          ...(hint ? { "aria-describedby": `${id}-hint` } : {}),
        },
      )
    : children;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {control}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function DownloadButton({
  onClick,
  children = "Export CSV",
}: {
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <Button onClick={onClick}>
      <ArrowDownToLine size={16} />
      {children}
    </Button>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
export function csvDownload(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
) {
  const escape = (v: string | number) =>
    `"${String(v)
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""')}"`;
  const content =
    "\uFEFF" +
    [headers, ...rows].map((r) => r.map(escape).join(",")).join("\r\n");
  download(filename, content, "text/csv;charset=utf-8");
}
export function download(
  filename: string,
  content: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function FacilityMap({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { state } = useSimulation();
  const [zoom, setZoom] = useState(1);
  return (
    <div className="map-wrap">
      <div className="map-topline">
        <span>
          <i className="live-dot" /> LIVE FACILITY STATUS
        </span>
        <span>
          LEVEL 01 <ChevronRight size={12} /> ALL ZONES
        </span>
      </div>
      <div className="map-canvas">
        <svg
          viewBox="0 0 740 490"
          role="img"
          aria-label="Interactive Northwood facility floor plan"
        >
          <defs>
            <pattern
              id="grid"
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="0.65" fill="var(--map-edge)" />
            </pattern>
            <pattern
              id="grass"
              width="8"
              height="8"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M2 6l2-4 2 4"
                stroke="var(--map-edge)"
                fill="none"
                strokeWidth="0.55"
              />
            </pattern>
          </defs>
          <rect width="740" height="490" fill="url(#grid)" />
          <g
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "370px 245px",
              transition: "transform .2s",
            }}
          >
            <path
              d="M47 54H694V462H47Z"
              fill="var(--map-bg)"
              stroke="var(--map-edge)"
              strokeWidth="2"
            />
            <path
              d="M271 56v392M466 56v392M50 207h641M50 358h641"
              stroke="var(--surface-3)"
              strokeWidth="18"
            />
            <path
              d="M271 56v392M466 56v392M50 207h641M50 358h641"
              stroke="var(--map-bg)"
              strokeWidth="13"
            />
            {zones.map((z) => {
              const activeAlarms = state.alarms.some((a) => a.zone === z.id);
              const unsecured = state.doors.some(
                (d) => d.zone === z.id && d.status !== "Secured",
              );
              const residents = state.residents.filter(
                (r) => r.unit === z.id,
              ).length;
              const picked = selected === z.id;
              return (
                <g
                  key={z.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${z.name}`}
                  aria-pressed={picked}
                  onClick={() => onSelect(z.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(z.id);
                    }
                  }}
                  className={`map-zone ${picked ? "selected" : ""}`}
                >
                  <rect
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx="4"
                    fill={activeAlarms ? "#f0657c25" : "var(--map-floor)"}
                    stroke={
                      picked
                        ? "var(--accent)"
                        : activeAlarms
                          ? "#c05c4b"
                          : "var(--map-edge)"
                    }
                    strokeWidth={picked ? 2.3 : 1.2}
                  />
                  {z.capacity > 0 && (
                    <>
                      {Array.from({ length: 6 }, (_, i) => (
                        <rect
                          key={i}
                          x={z.x + 8 + i * 30}
                          y={z.y + 7}
                          width="27"
                          height="19"
                          rx="1"
                          fill="var(--map-room)"
                          stroke="var(--map-edge)"
                          strokeWidth=".6"
                        />
                      ))}
                      <path
                        d={`M${z.x + 10} ${z.y + 94}h175`}
                        stroke="var(--map-edge)"
                      />
                      <text x={z.x + 14} y={z.y + 83} className="map-small">
                        {residents} / {z.capacity} RESIDENTS
                      </text>
                      <circle
                        cx={z.x + 175}
                        cy={z.y + 80}
                        r="3"
                        fill={unsecured ? "#c28c37" : "var(--accent)"}
                      />
                    </>
                  )}
                  {z.id === "YARD" && (
                    <rect
                      x={z.x + 7}
                      y={z.y + 7}
                      width={z.w - 14}
                      height={z.h - 14}
                      fill="url(#grass)"
                      opacity=".7"
                    />
                  )}
                  <text
                    x={z.x + (z.capacity ? 14 : z.w / 2)}
                    y={z.y + (z.capacity ? 48 : z.h / 2 - 2)}
                    textAnchor={z.capacity ? "start" : "middle"}
                    className="map-label"
                  >
                    {z.name}
                  </text>
                  <text
                    x={z.x + (z.capacity ? 14 : z.w / 2)}
                    y={z.y + (z.capacity ? 63 : z.h / 2 + 13)}
                    textAnchor={z.capacity ? "start" : "middle"}
                    className="map-sublabel"
                  >
                    {z.label}
                  </text>
                  <rect
                    x={z.x + z.w / 2 - 10}
                    y={z.y + z.h - 3}
                    width="20"
                    height="6"
                    rx="2"
                    fill={unsecured ? "#d3a34b" : "var(--accent)"}
                    stroke="var(--map-bg)"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
            <path
              d="M348 444h46v18h-46"
              fill="var(--map-bg)"
              stroke="var(--map-edge)"
            />
            <path
              d="M354 453h34m-5-4 5 4-5 4"
              fill="none"
              stroke="var(--accent)"
            />
            <text x="370" y="480" textAnchor="middle" className="map-small">
              MAIN ENTRANCE
            </text>
          </g>
          <g transform="translate(705 21)">
            <path
              d="M0 23V0m-5 8 5-8 5 8"
              fill="none"
              stroke="#728374"
              strokeWidth="1.2"
            />
            <text x="0" y="36" textAnchor="middle" className="map-small">
              N
            </text>
          </g>
        </svg>
        <div className="map-zoom">
          <button
            aria-label="Zoom in map"
            onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
            disabled={zoom >= 1.5}
          >
            <Plus size={15} />
          </button>
          <button
            aria-label="Zoom out map"
            onClick={() => setZoom((z) => Math.max(0.85, z - 0.15))}
            disabled={zoom <= 0.85}
          >
            <Minus size={15} />
          </button>
        </div>
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-dot green" />
          Secured
        </span>
        <span>
          <i className="legend-dot amber" />
          Access active
        </span>
        <span>
          <i className="legend-dot red" />
          Safety event
        </span>
        <span className="map-hint">Select a zone to inspect</span>
      </div>
    </div>
  );
}
