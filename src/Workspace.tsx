import { useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  FileText,
  HardDrive,
  RotateCcw,
  Save,
  ShieldCheck,
  Users,
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
  csvDownload,
  download,
} from "./components";
import { clockTime, zoneName, zones } from "./model";
import { useSimulation } from "./store";
import { eventCsv } from "./Operations";

export function Reports() {
  const { state, dispatch, notify } = useSimulation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(0);
  const [report, setReport] = useState<string | null>(null);
  const events = state.activity.filter(
    (e) =>
      (category === "all" || e.type === category) &&
      `${e.title} ${e.detail}`.toLowerCase().includes(query.toLowerCase()),
  );
  const pageCount = Math.max(1, Math.ceil(events.length / 10));
  const currentPage = Math.min(page, pageCount - 1);
  const exportReport = async () => {
    if (report === "Resident census")
      csvDownload(
        "resident-census.csv",
        ["ID", "Name", "Age", "House", "Room", "Status", "Case manager"],
        state.residents.map((r) => [
          r.id,
          r.name,
          r.age,
          zoneName(r.unit),
          r.room,
          r.status,
          r.caseManager,
        ]),
      );
    else if (report === "Incident summary")
      csvDownload(
        "incident-summary.csv",
        ["ID", "Title", "Category", "Priority", "Status", "Zone", "Reporter"],
        state.incidents.map((i) => [
          i.id,
          i.title,
          i.category,
          i.priority,
          i.status,
          zoneName(i.zone),
          i.reporter,
        ]),
      );
    else
      csvDownload(
        "shift-summary.csv",
        ["Metric", "Value"],
        [
          ["Facility", state.settings.facilityName],
          ["Generated", new Date().toISOString()],
          ["Operator", state.settings.operator],
          ["Residents", state.residents.length],
          [
            "Staff on duty",
            state.staff.filter((s) => s.status === "On duty").length,
          ],
          [
            "Secured doors",
            state.doors.filter((d) => d.status === "Secured").length,
          ],
          ["Panel events", state.alarms.length],
          [
            "Open incidents",
            state.incidents.filter((i) => i.status !== "Resolved").length,
          ],
          [
            "Completed programs",
            state.programs.filter((p) => p.status === "Completed").length,
          ],
        ],
      );
    if (
      !(await dispatch({
        type: "log",
        title: "Operational report exported",
        detail: `${report} · ${state.settings.operator}`,
        category: "system",
      }))
    )
      return;
    notify(`${report} exported`);
  };
  return (
    <>
      <PageHeading
        eyebrow="REPORTING & ACCOUNTABILITY"
        title="Turn activity into insight"
        description="Operational summaries and a transparent record of every action."
      >
        <DownloadButton
          onClick={() => {
            eventCsv(events);
            notify(`${events.length} audit events exported`);
          }}
        >
          Export audit log
        </DownloadButton>
      </PageHeading>
      <div className="report-templates">
        {[
          {
            name: "Shift summary",
            desc: "A concise operational handover.",
            icon: ClipboardList,
          },
          {
            name: "Resident census",
            desc: "Current placements and care status.",
            icon: Users,
          },
          {
            name: "Incident summary",
            desc: "Reports, priorities, and resolution.",
            icon: FileText,
          },
        ].map((r) => (
          <Card key={r.name}>
            <span className="template-icon">
              <r.icon size={22} />
            </span>
            <h2>{r.name}</h2>
            <p>{r.desc}</p>
            <button className="text-link" onClick={() => setReport(r.name)}>
              Generate report
              <ArrowRight size={15} />
            </button>
          </Card>
        ))}
      </div>
      <div className="report-charts">
        <Card>
          <CardTitle
            title="Housing occupancy"
            subtitle="Assigned residents by house"
          />
          <div className="bar-chart">
            {zones
              .filter((z) => z.capacity)
              .map((z) => {
                const count = state.residents.filter(
                  (r) => r.unit === z.id,
                ).length;
                return (
                  <div key={z.id}>
                    <div>
                      <span>{z.name}</span>
                      <strong>
                        {count}
                        <small> / {z.capacity}</small>
                      </strong>
                    </div>
                    <div className="progress-track">
                      <i style={{ width: `${(count / z.capacity) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
        <Card>
          <CardTitle
            title="Incident resolution"
            subtitle="Live status of the incident register"
          />
          <div className="incident-summary">
            {(["Open", "In review", "Resolved"] as const).map((s, i) => (
              <div key={s}>
                <span
                  className={`legend-dot ${["amber", "blue", "green"][i]}`}
                />
                <strong>
                  {state.incidents.filter((v) => v.status === s).length}
                </strong>
                <span>{s}</span>
                <div className="progress-track">
                  <i
                    style={{
                      width: `${state.incidents.length ? (state.incidents.filter((v) => v.status === s).length / state.incidents.length) * 100 : 0}%`,
                      background: [
                        "var(--amber)",
                        "var(--violet)",
                        "var(--accent)",
                      ][i],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <Card>
        <CardTitle
          title="Activity audit log"
          subtitle="Shared workspace feed · Most recent 250 events"
          action={<Badge>{events.length} events</Badge>}
        />
        <div className="table-toolbar">
          <SearchField
            value={query}
            onChange={(v) => {
              setQuery(v);
              setPage(0);
            }}
            placeholder="Search audit events…"
          />
          <select
            aria-label="Audit category"
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(0);
            }}
          >
            <option value="all">All categories</option>
            {[
              "system",
              "access",
              "safety",
              "resident",
              "incident",
              "program",
            ].map((c) => (
              <option key={c} value={c}>
                {c[0].toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Category</th>
                <th>Event</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {events
                .slice(currentPage * 10, currentPage * 10 + 10)
                .map((e) => (
                  <tr key={e.id}>
                    <td className="nowrap">
                      {clockTime(e.time)}
                      <small>{new Date(e.time).toLocaleDateString()}</small>
                    </td>
                    <td>
                      <Badge
                        tone={
                          e.type === "safety"
                            ? "amber"
                            : e.type === "access"
                              ? "green"
                              : "neutral"
                        }
                      >
                        {e.type}
                      </Badge>
                    </td>
                    <td>
                      <strong className="table-primary">{e.title}</strong>
                    </td>
                    <td>{e.detail}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!events.length && (
          <Empty
            title="No matching events"
            description="Try a different category or search term."
          />
        )}
        <div className="table-footer">
          <span>
            Showing {events.length ? currentPage * 10 + 1 : 0}–
            {Math.min((currentPage + 1) * 10, events.length)} of {events.length}
          </span>
          <div className="pagination">
            <button
              aria-label="Previous audit page"
              disabled={!currentPage}
              onClick={() => setPage(currentPage - 1)}
            >
              <ArrowLeft size={15} />
            </button>
            <span>
              {currentPage + 1} / {pageCount}
            </span>
            <button
              aria-label="Next audit page"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </Card>
      {report && (
        <Modal
          title={report}
          subtitle={`Generated ${new Date().toLocaleString()} · ${state.settings.facilityName}`}
          onClose={() => setReport(null)}
        >
          <div className="modal-body report-preview">
            <span className="report-label">JAILOPS / OPERATIONAL REPORT</span>
            <h3>{report}</h3>
            <p className="muted">
              {state.settings.shift} · Prepared by {state.settings.operator}
            </p>
            <dl className="detail-list">
              {report === "Resident census" ? (
                zones
                  .filter((z) => z.capacity)
                  .map((z) => (
                    <div key={z.id}>
                      <dt>{z.name}</dt>
                      <dd>
                        {state.residents.filter((r) => r.unit === z.id).length}{" "}
                        residents
                      </dd>
                    </div>
                  ))
              ) : report === "Incident summary" ? (
                ["Open", "In review", "Resolved"].map((s) => (
                  <div key={s}>
                    <dt>{s}</dt>
                    <dd>
                      {state.incidents.filter((i) => i.status === s).length}{" "}
                      reports
                    </dd>
                  </div>
                ))
              ) : (
                <>
                  <div>
                    <dt>Residents in care</dt>
                    <dd>{state.residents.length}</dd>
                  </div>
                  <div>
                    <dt>Staff on duty</dt>
                    <dd>
                      {state.staff.filter((s) => s.status === "On duty").length}
                    </dd>
                  </div>
                  <div>
                    <dt>Secured access points</dt>
                    <dd>
                      {state.doors.filter((d) => d.status === "Secured").length}{" "}
                      / 18
                    </dd>
                  </div>
                  <div>
                    <dt>Life safety events</dt>
                    <dd>{state.alarms.length}</dd>
                  </div>
                  <div>
                    <dt>Open incidents</dt>
                    <dd>
                      {
                        state.incidents.filter((i) => i.status !== "Resolved")
                          .length
                      }
                    </dd>
                  </div>
                </>
              )}
            </dl>
            <p className="report-disclaimer">
              SIMULATION DATA · Generated from the current server workspace.
            </p>
          </div>
          <div className="modal-actions">
            <Button onClick={() => setReport(null)}>Close</Button>
            <Button variant="primary" onClick={exportReport}>
              <ArrowDownToLine size={16} />
              Download CSV report
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Settings() {
  const { state, dispatch, notify, connectionError, user } = useSimulation();
  const [settings, setSettings] = useState(state.settings);
  const [reset, setReset] = useState(false);
  const [confirm, setConfirm] = useState("");
  const changed = JSON.stringify(settings) !== JSON.stringify(state.settings);
  return (
    <>
      <PageHeading
        eyebrow="WORKSPACE PREFERENCES"
        title="Make this space your own"
        description="Configure your fictional facility and shared training experience."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!settings.facilityName.trim() || !settings.operator.trim()) {
            notify("Facility and operator names are required.", true);
            return;
          }
          if (
            !(await dispatch({
              type: "settings",
              settings: {
                ...settings,
                facilityName: settings.facilityName.trim(),
                operator: settings.operator.trim(),
              },
            }))
          )
            return;
          notify("Workspace preferences saved");
        }}
      >
        <fieldset
          className="settings-fieldset"
          disabled={user.role !== "admin"}
        >
          <div className="settings-layout">
            <Card>
              <CardTitle
                title="Facility identity"
                subtitle="Names shown across the simulation workspace"
              />
              <div className="settings-fields">
                <Field label="Facility name">
                  <input
                    required
                    maxLength={60}
                    value={settings.facilityName}
                    onChange={(e) =>
                      setSettings({ ...settings, facilityName: e.target.value })
                    }
                  />
                </Field>
                <Field label="Operator name">
                  <input
                    required
                    maxLength={60}
                    value={settings.operator}
                    onChange={(e) =>
                      setSettings({ ...settings, operator: e.target.value })
                    }
                  />
                </Field>
                <Field label="Active shift">
                  <select
                    value={settings.shift}
                    onChange={(e) =>
                      setSettings({ ...settings, shift: e.target.value })
                    }
                  >
                    <option>Day shift · 07:00–19:00</option>
                    <option>Night shift · 19:00–07:00</option>
                    <option>Training shift · Flexible</option>
                  </select>
                </Field>
              </div>
            </Card>
            <Card>
              <CardTitle
                title="Simulation preferences"
                subtitle="Adjust the interface and training feedback"
              />
              <div className="preference-row">
                <div>
                  <strong>Compact tables</strong>
                  <p>Reduce row spacing in records and reports.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Compact tables"
                  aria-checked={settings.compact}
                  className={`toggle ${settings.compact ? "on" : ""}`}
                  onClick={() =>
                    setSettings({ ...settings, compact: !settings.compact })
                  }
                >
                  <i />
                </button>
              </div>
              <div className="preference-row">
                <div>
                  <strong>Panel alert tone</strong>
                  <p>Play a quiet tone for unacknowledged panel events.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-label="Panel alert tone"
                  aria-checked={settings.sounds}
                  className={`toggle ${settings.sounds ? "on" : ""}`}
                  onClick={() =>
                    setSettings({ ...settings, sounds: !settings.sounds })
                  }
                >
                  <i />
                </button>
              </div>
              <div className="settings-note">
                <ShieldCheck size={22} />
                <div>
                  <strong>Designed for simulation</strong>
                  <p>
                    Simulation commands and records are saved in your server
                    database. No real building systems are connected.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </fieldset>
        <div className="settings-save">
          <span>
            {changed
              ? "You have unsaved changes"
              : "Preferences are up to date"}
          </span>
          <Button
            type="submit"
            variant="primary"
            disabled={!changed || user.role !== "admin"}
          >
            <Save size={16} />
            Save preferences
          </Button>
        </div>
      </form>
      <Card className="data-settings">
        <CardTitle
          title="Workspace data"
          subtitle="Shared simulation data is stored in the server’s SQLite database"
          action={
            <Badge tone={connectionError ? "red" : "green"} dot>
              {connectionError
                ? "Server unavailable"
                : "Server persistence active"}
            </Badge>
          }
        />
        <div className="data-settings-row">
          <div>
            <HardDrive size={22} />
            <div>
              <strong>Export simulation backup</strong>
              <p>
                Download all fictional records, settings, and the current
                activity log as JSON.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              download(
                `jailops-backup-${new Date().toISOString().slice(0, 10)}.json`,
                JSON.stringify(state, null, 2),
              );
              notify("Simulation backup downloaded");
            }}
          >
            <ArrowDownToLine size={15} />
            Export backup
          </Button>
        </div>
        <div className="data-settings-row">
          <div>
            <RotateCcw size={22} />
            <div>
              <strong>Reset demo workspace</strong>
              <p>
                Replace the shared workspace with the original fictional sample
                data.
              </p>
            </div>
          </div>
          <Button
            variant="danger"
            disabled={user.role !== "admin"}
            onClick={() => setReset(true)}
          >
            Reset simulation
          </Button>
        </div>
      </Card>
      <div className="workspace-footnote">
        <span>JailOpsSim 3.0 · React + Node.js + SQLite</span>
        <span>
          Signed in as {user.username} · {user.role}
        </span>
      </div>
      {reset && (
        <Modal
          title="Reset this simulation?"
          subtitle="This resets shared training records, scenarios, and preferences for all users. Accounts and the server audit history remain."
          onClose={() => setReset(false)}
        >
          <div className="modal-body">
            <p className="muted">
              Export a backup first if you need to keep your current data. The
              original fictional sample records will be restored.
            </p>
            <Field label="Type RESET to confirm">
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                placeholder="RESET"
              />
            </Field>
          </div>
          <div className="modal-actions">
            <Button onClick={() => setReset(false)}>Cancel</Button>
            <Button
              variant="danger"
              disabled={confirm !== "RESET"}
              onClick={async () => {
                if (!(await dispatch({ type: "reset" }))) return;
                setReset(false);
                setConfirm("");
                setSettings({
                  facilityName: "Northwood Youth Center",
                  operator: "Alex Mitchell",
                  shift: "Day shift · 07:00–19:00",
                  compact: false,
                  sounds: false,
                });
                notify("Demo workspace restored");
              }}
            >
              Reset all demo data
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
