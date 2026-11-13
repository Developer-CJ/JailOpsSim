import { useEffect, useState } from "react";
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  BookOpen,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Command,
  DoorClosed,
  FileChartColumn,
  Flame,
  LayoutDashboard,
  Menu,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  UsersRound,
  Video,
  Wrench,
  Map,
  ClipboardCheck,
  Route,
  Footprints,
  Phone,
  Thermometer,
  KeyRound,
  ClipboardList,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge, Button, Modal, SearchField } from "./components";
import type { Page } from "./model";
import { useSimulation } from "./store";
import {
  ActivityList,
  Controls,
  Facilities,
  Overview,
  ScenarioModal,
} from "./Operations";
import {
  IncidentForm,
  Incidents,
  Maintenance,
  Programs,
  Residents,
  Staffing,
} from "./Records";
import { Cameras, FireSafety } from "./Safety";
import { Reports, Settings } from "./Workspace";
import { Admissions, CareServices } from "./Services";

import {
  Accountability,
  Movements,
  Rounds,
  Communications,
  Environment,
  Assets,
  Handover,
  Drills,
} from "./Expansion";
import { TacticalFacility } from "./TacticalFacility";
import {
  ConsoleFrame,
  ConsoleLauncher,
  ThemeToggle,
  consolePages,
  openConsole,
} from "./console";

const navigation: {
  id: Page;
  label: string;
  icon: LucideIcon;
  group: string;
  description: string;
}[] = [
  {
    id: "facility-view",
    label: "Facility view",
    icon: Map,
    group: "BUILDING SYSTEMS",
    description:
      "Detailed interactive facility with rooms, doors, cameras and live layers",
  },
  {
    id: "accountability",
    label: "Headcounts",
    icon: ClipboardCheck,
    group: "OPERATIONS",
    description:
      "Resident accountability, identity verification and count history",
  },
  {
    id: "movements",
    label: "Escorted movements",
    icon: Route,
    group: "OPERATIONS",
    description: "Plan escorted movements and confirm arrivals",
  },
  {
    id: "rounds",
    label: "Patrol rounds",
    icon: Footprints,
    group: "OPERATIONS",
    description: "Nine-zone patrol checkpoints and inspection notes",
  },
  {
    id: "communications",
    label: "Communications",
    icon: Phone,
    group: "BUILDING SYSTEMS",
    description: "Intercom station calls and public address announcements",
  },
  {
    id: "environment",
    label: "Lighting & HVAC",
    icon: Thermometer,
    group: "BUILDING SYSTEMS",
    description: "Zone lighting scenes, temperature and ventilation controls",
  },
  {
    id: "assets",
    label: "Keys & equipment",
    icon: KeyRound,
    group: "OPERATIONS",
    description: "Asset custody, checkout and return",
  },
  {
    id: "handover",
    label: "Shift handover",
    icon: ClipboardList,
    group: "OPERATIONS",
    description: "Shift notes, assigned follow-ups and completion history",
  },
  {
    id: "drills",
    label: "Guided training",
    icon: GraduationCap,
    group: "INSIGHTS",
    description: "Guided drills with verified actions and completion scores",
  },
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    group: "WORKSPACE",
    description: "Facility dashboard and live activity",
  },
  {
    id: "facilities",
    label: "Facilities",
    icon: Building2,
    group: "WORKSPACE",
    description: "Campus floor plan, zones and housing",
  },
  {
    id: "residents",
    label: "Residents",
    icon: Users,
    group: "WORKSPACE",
    description: "Resident directory, placement and care",
  },
  {
    id: "admissions",
    label: "Intake & transition",
    icon: ArrowDownLeft,
    group: "WORKSPACE",
    description: "Admission, placement and discharge archive",
  },
  {
    id: "programs",
    label: "Programs",
    icon: BookOpen,
    group: "WORKSPACE",
    description: "Education, wellbeing and attendance",
  },
  {
    id: "services",
    label: "Care & scheduling",
    icon: ShieldCheck,
    group: "WORKSPACE",
    description: "Health, family visits, court hearings and case reviews",
  },
  {
    id: "incidents",
    label: "Incidents",
    icon: Activity,
    group: "WORKSPACE",
    description: "Incident reporting and review",
  },
  {
    id: "staff",
    label: "Staff & shifts",
    icon: UsersRound,
    group: "WORKSPACE",
    description: "Staff roster and post assignments",
  },
  {
    id: "controls",
    label: "Central control",
    icon: DoorClosed,
    group: "BUILDING SYSTEMS",
    description: "Simulated doors, interlocks and access",
  },
  {
    id: "cameras",
    label: "Camera workspace",
    icon: Video,
    group: "BUILDING SYSTEMS",
    description: "Generated surveillance training scenes",
  },
  {
    id: "fire",
    label: "Fire & life safety",
    icon: Flame,
    group: "BUILDING SYSTEMS",
    description: "Addressable fire panel simulator",
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: Wrench,
    group: "BUILDING SYSTEMS",
    description: "Work orders and preventative maintenance",
  },
  {
    id: "reports",
    label: "Reports & audit",
    icon: FileChartColumn,
    group: "INSIGHTS",
    description: "Operational reports and event history",
  },
];
function readRoute(): { page: Page; recordId?: string } {
  try {
    const [page, id] = window.location.hash.slice(1).split("/");
    return {
      page:
        navigation.some((n) => n.id === page) || page === "settings"
          ? (page as Page)
          : "overview",
      recordId: id ? decodeURIComponent(id) : undefined,
    };
  } catch {
    return { page: "overview" };
  }
}
function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="header-clock">
      <strong>
        {now.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </strong>
      <span>
        {now.toLocaleDateString([], { month: "short", day: "numeric" })}
      </span>
    </div>
  );
}
export default function App() {
  const { state, connectionError, pending, user, logout } = useSimulation();
  const [route, setRoute] = useState(readRoute);
  const isConsole = new URLSearchParams(window.location.search).has("console");
  const [mobile, setMobile] = useState(false);
  const [scenario, setScenario] = useState(false);
  const [incident, setIncident] = useState(false);
  const [search, setSearch] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [help, setHelp] = useState(false);
  const [facilityMenu, setFacilityMenu] = useState(false);
  useEffect(() => {
    const handler = () => {
      setRoute(readRoute());
      window.scrollTo(0, 0);
      setMobile(false);
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((v) => !v);
      }
      if (e.key === "Escape") {
        setMobile(false);
        setFacilityMenu(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  useEffect(() => {
    document.title = `${navigation.find((n) => n.id === route.page)?.label ?? "Settings"} — JailOpsSim`;
  }, [route.page]);
  const navigate = (page: Page, recordId?: string) => {
    if (!isConsole && consolePages.includes(page)) openConsole(page, recordId);
    window.location.hash =
      page + (recordId ? `/${encodeURIComponent(recordId)}` : "");
    setSearch(false);
    setFacilityMenu(false);
    setMobile(false);
  };
  const attention =
    state.alarms.filter((a) => !a.acknowledged).length +
    state.incidents.filter((i) => i.status === "Open").length;
  let content;
  switch (route.page) {
    case "facility-view":
      content = <TacticalFacility navigate={navigate} />;
      break;
    case "accountability":
      content = <Accountability initialZone={route.recordId} />;
      break;
    case "movements":
      content = <Movements />;
      break;
    case "rounds":
      content = <Rounds />;
      break;
    case "communications":
      content = <Communications />;
      break;
    case "environment":
      content = <Environment />;
      break;
    case "assets":
      content = <Assets />;
      break;
    case "handover":
      content = <Handover />;
      break;
    case "drills":
      content = <Drills />;
      break;
    case "facilities":
      content = <Facilities navigate={navigate} />;
      break;
    case "controls":
      content = (
        <Controls
          initialZone={
            route.recordId &&
            [
              "A1",
              "A2",
              "B1",
              "B2",
              "EDU",
              "YARD",
              "MED",
              "INT",
              "OPS",
            ].includes(route.recordId)
              ? route.recordId
              : undefined
          }
        />
      );
      break;
    case "residents":
      content = <Residents initialId={route.recordId} />;
      break;
    case "admissions":
      content = <Admissions navigate={navigate} />;
      break;
    case "services":
      content = <CareServices />;
      break;
    case "incidents":
      content = (
        <Incidents initialId={route.recordId} onNew={() => setIncident(true)} />
      );
      break;
    case "programs":
      content = <Programs initialId={route.recordId} />;
      break;
    case "staff":
      content = <Staffing />;
      break;
    case "fire":
      content = <FireSafety initialZone={route.recordId} />;
      break;
    case "cameras":
      content = <Cameras initialZone={route.recordId} />;
      break;
    case "maintenance":
      content = <Maintenance />;
      break;
    case "reports":
      content = <Reports />;
      break;
    case "settings":
      content = <Settings />;
      break;
    default:
      content = (
        <Overview
          navigate={navigate}
          onScenario={() => setScenario(true)}
          onIncident={() => setIncident(true)}
        />
      );
  }
  const module = navigation.find((n) => n.id === route.page);
  if (isConsole)
    return (
      <ConsoleFrame page={route.page} title={module?.label ?? "Workspace"}>
        {content}
      </ConsoleFrame>
    );
  if (consolePages.includes(route.page))
    content = (
      <ConsoleLauncher
        page={route.page}
        title={module!.label}
        description={module!.description}
      >
        <Badge tone="blue" dot>
          Server connected
        </Badge>
        <Badge>{state.alarms.length} panel events</Badge>
        <Badge>
          {state.doors.filter((d) => d.status === "Secured").length} / 18 doors
          secured
        </Badge>
      </ConsoleLauncher>
    );
  return (
    <div className={`app ${state.settings.compact ? "compact" : ""}`}>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {mobile && (
        <div className="sidebar-scrim" onClick={() => setMobile(false)} />
      )}
      <aside
        className={`sidebar ${mobile ? "open" : ""}`}
        aria-label="Main navigation"
      >
        <button
          className="brand"
          aria-label="JailOpsSim home"
          onClick={() => navigate("overview")}
        >
          <span className="brand-icon">
            <i />
            <i />
            <i />
          </span>
          <span>
            JailOps<span className="brand-light">Sim</span>
            <small>CONNECTED CORRECTIONS</small>
          </span>
        </button>
        <div className="facility-switch">
          <button
            aria-expanded={facilityMenu}
            onClick={() => setFacilityMenu((v) => !v)}
          >
            <span className="facility-switch-icon">
              <Building2 size={18} />
            </span>
            <span>
              <strong>{state.settings.facilityName}</strong>
              <small>
                <i className="live-dot" />
                Training environment
              </small>
            </span>
            <ChevronDown size={14} />
          </button>
          {facilityMenu && (
            <div className="facility-dropdown">
              <button onClick={() => navigate("facilities")}>
                <Building2 size={15} />
                Explore campus
              </button>
              <button onClick={() => navigate("settings")}>
                <Settings2 size={15} />
                Facility settings
              </button>
            </div>
          )}
        </div>
        <nav>
          {["WORKSPACE", "OPERATIONS", "BUILDING SYSTEMS", "INSIGHTS"].map(
            (group) => (
              <div className="nav-group" key={group}>
                <div className="nav-label">{group}</div>
                {navigation
                  .filter((n) => n.group === group)
                  .map((n) => (
                    <a
                      key={n.id}
                      href={`#${n.id}`}
                      className={`nav-item ${route.page === n.id ? "active" : ""}`}
                      aria-current={route.page === n.id ? "page" : undefined}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate(n.id);
                      }}
                    >
                      <n.icon size={18} />
                      <span>{n.label}</span>
                      {consolePages.includes(n.id) && (
                        <ExternalLink size={12} className="nav-external" />
                      )}
                      {n.id === "incidents" && (
                        <span className="nav-count">
                          {
                            state.incidents.filter(
                              (i) => i.status !== "Resolved",
                            ).length
                          }
                        </span>
                      )}
                      {n.id === "fire" && state.alarms.length > 0 && (
                        <span className="nav-alarm-dot" />
                      )}
                    </a>
                  ))}
              </div>
            ),
          )}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${route.page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={18} />
            <span>Settings</span>
          </button>
          <button className="nav-item" onClick={() => setHelp(true)}>
            <CircleHelp size={18} />
            <span>Help & getting started</span>
            <ArrowUpRight size={14} />
          </button>
          <div className="sandbox-card">
            <div>
              <span className="sandbox-icon">
                <Sparkles size={16} />
              </span>
              <strong>Safe to explore.</strong>
              <Badge>SIM</Badge>
            </div>
            <p>
              Realistic operations.
              <br />
              Entirely fictional.
            </p>
            <button onClick={() => setScenario(true)}>
              Start a training scenario
              <ArrowUpRight size={14} />
            </button>
          </div>
          <button className="operator" onClick={() => navigate("settings")}>
            <span className="avatar">
              {state.settings.operator
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <span>
              <strong>{state.settings.operator}</strong>
              <small>
                {user.role === "admin"
                  ? "Workspace administrator"
                  : "Operations specialist"}
              </small>
            </span>
            <ChevronDown size={14} />
          </button>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMobile((v) => !v)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <strong>
                {navigation.find((n) => n.id === route.page)?.label ??
                  "Settings"}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="header-search"
              aria-label="Search workspace"
              onClick={() => setSearch(true)}
            >
              <Search size={17} />
              <span>Search anything…</span>
              <kbd>
                <Command size={10} /> K
              </kbd>
            </button>
            <div className="header-divider" />
            <span className="sandbox-status">
              <i className="live-dot" />
              {pending
                ? "Saving command…"
                : connectionError
                  ? "Reconnecting…"
                  : "Server connected"}
            </span>
            <button
              className="notification-button icon-button"
              aria-label={`Notifications, ${attention} items need attention`}
              onClick={() => setNotifications(true)}
            >
              <Bell size={19} />
              {attention > 0 && <i />}
            </button>
            <button
              className="icon-button signout-button"
              aria-label={`Sign out ${user.username}`}
              title={`Signed in as ${user.username} (${user.role})`}
              onClick={() => {
                void logout();
              }}
            >
              ↪
            </button>
            <ThemeToggle />
            <Clock />
          </div>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          key={`${route.page}/${route.recordId ?? ""}`}
        >
          {connectionError && (
            <div className="info-strip storage-warning">
              Server connection interrupted. Commands require server
              confirmation. The workspace will reconnect automatically.
            </div>
          )}
          {content}
        </main>
      </div>
      {scenario && (
        <ScenarioModal onClose={() => setScenario(false)} navigate={navigate} />
      )}
      {incident && <IncidentForm onClose={() => setIncident(false)} />}
      {search && (
        <SearchModal onClose={() => setSearch(false)} navigate={navigate} />
      )}
      {notifications && (
        <Modal
          title="Activity & attention"
          subtitle={`${attention} items currently need attention`}
          onClose={() => setNotifications(false)}
        >
          <div className="modal-body notification-items">
            {state.alarms.length > 0 && (
              <button
                onClick={() => {
                  navigate("fire");
                  setNotifications(false);
                }}
              >
                <span className="event-icon safety">
                  <Flame size={20} />
                </span>
                <span>
                  <strong>
                    {state.alarms.length} life safety panel events
                  </strong>
                  <small>Open the panel to review and respond.</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            )}
            {state.incidents
              .filter((i) => i.status === "Open")
              .map((i) => (
                <button
                  key={i.id}
                  onClick={() => {
                    navigate("incidents", i.id);
                    setNotifications(false);
                  }}
                >
                  <span className="event-icon incident">
                    <Activity size={20} />
                  </span>
                  <span>
                    <strong>{i.title}</strong>
                    <small>{i.id} · Awaiting review</small>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              ))}
          </div>
          <ActivityList limit={5} />
          <div className="modal-actions">
            <Button
              onClick={() => {
                navigate("reports");
                setNotifications(false);
              }}
            >
              View all activity
              <ArrowUpRight size={15} />
            </Button>
            <Button variant="primary" onClick={() => setNotifications(false)}>
              Close
            </Button>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="Welcome to your workspace"
          subtitle="One connected simulation. Plenty of room to explore."
          onClose={() => setHelp(false)}
        >
          <div className="modal-body help-copy">
            <div className="help-intro">
              <ShieldCheck size={36} />
              <p>
                JailOpsSim models a fictional youth center. Explore operational
                workflows, introduce training events, and see how every action
                connects.
              </p>
            </div>
            <div>
              <strong>Explore your campus</strong>
              <p>
                Select zones on the facility map. Open Central control to
                operate paired doors with timed release and interlock
                protection.
              </p>
            </div>
            <div>
              <strong>Practice a response</strong>
              <p>
                Run a fire or access scenario. Use the fire panel’s response
                guide to work through a full event cycle.
              </p>
            </div>
            <div>
              <strong>Coordinate care & operations</strong>
              <p>
                Edit resident placements, enroll residents in programs, document
                incidents, and assign staff or maintenance work.
              </p>
            </div>
            <div>
              <strong>Follow the record</strong>
              <p>
                Reports & audit contains the activity log and downloadable CSV
                reports. Settings offers a JSON backup and demo reset.
              </p>
            </div>
            <div className="info-strip">
              <Radio size={20} />
              <span>
                Data is shared through your server. This simulator has no real
                facility, security, fire alarm, or video connections.
              </span>
            </div>
          </div>
          <div className="modal-actions">
            <Button
              variant="primary"
              onClick={() => {
                setHelp(false);
                setScenario(true);
              }}
            >
              Try a training scenario
              <ArrowUpRight size={15} />
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
function SearchModal({
  onClose,
  navigate,
}: {
  onClose: () => void;
  navigate: (page: Page, id?: string) => void;
}) {
  const { state } = useSimulation();
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = [
    ...navigation.map((n) => ({
      id: n.id,
      title: n.label,
      description: n.description,
      icon: n.icon,
      page: n.id,
      record: undefined as string | undefined,
    })),
    {
      id: "settings",
      title: "Settings",
      description: "Preferences, backup and reset",
      icon: Settings2,
      page: "settings" as Page,
      record: undefined,
    },
    ...(q
      ? state.residents.map((r) => ({
          id: r.id,
          title: r.name,
          description: `${r.id} · Resident profile`,
          icon: Users,
          page: "residents" as Page,
          record: r.id,
        }))
      : []),
    ...(q
      ? state.incidents.map((i) => ({
          id: i.id,
          title: i.title,
          description: `${i.id} · ${i.status}`,
          icon: Activity,
          page: "incidents" as Page,
          record: i.id,
        }))
      : []),
  ]
    .filter((r) => `${r.title} ${r.description}`.toLowerCase().includes(q))
    .slice(0, 12);
  return (
    <Modal
      title="Find your next step"
      subtitle="Search modules, fictional residents, or incident reports."
      onClose={onClose}
    >
      <div className="modal-body command-search">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search workspace…"
        />
        <div className="command-results">
          {results.map((r) => (
            <button key={r.id} onClick={() => navigate(r.page, r.record)}>
              <r.icon size={19} />
              <span>
                <strong>{r.title}</strong>
                <small>{r.description}</small>
              </span>
              <ArrowDownLeft size={15} />
            </button>
          ))}
          {!results.length && (
            <p className="empty-search">
              No matches. Try a module name, resident name, or incident ID.
            </p>
          )}
        </div>
      </div>
      <div className="command-footer">
        <span>
          <kbd>esc</kbd> to close
        </span>
        <span>JailOpsSim workspace search</span>
      </div>
    </Modal>
  );
}
