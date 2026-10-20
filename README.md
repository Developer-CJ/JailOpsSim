# JailOpsSim

A connected, fictional juvenile corrections operations suite. Explore a youth center, coordinate resident care, and practice realistic control-room workflows with generated sample data.

Concept & design by CJ. Version 2 uses a React/TypeScript frontend, a Node.js/Express JavaScript backend, SQLite persistence, and authenticated shared workspaces. Fonts and production assets are bundled locally.

For the self-contained Windows deployment ZIP, follow [Windows Server deployment](docs/WINDOWS_SERVER.md). It includes the Windows x64 Node runtime, production dependencies, setup/startup/backup scripts, built frontend assets, backend, and complete source. The destination server does not need npm installation or a separate database service.

## Run locally

Use Node **24** (the cloud environment uses **24.19.0**) and npm. If you use nvm, run `nvm use` first.

```bash
cd /workspace/JailOpsSim
npm ci --cache /workspace/.cache/npm --no-audit --no-fund
npm run user:create -- --role admin  # Interactive: choose your own credentials
npm run dev                        # Node API on 3000, React/Vite on 5173
```

Outside the cloud environment, use your own checkout directory and omit `--cache /workspace/.cache/npm`. For non-default ports or HTTPS cookie settings, copy `.env.example` to `.env` and edit it before creating accounts or starting the server. SQLite initializes automatically under `data/`. No third-party services or API keys are required. There are no default production accounts.

Sign in with the account you created. An administrator can update shared preferences and reset the workspace; operators can use the simulation modules. Mutations are validated and committed on the server. Other connected browsers refresh committed state automatically. Timed door releases expire on the server even when all browsers close.

Each cloud task already has an isolated workspace. Use the existing checkout; do not create a Git worktree unless explicitly requested.

## Explore the suite

| Module              | Working features                                                                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview            | Live operational metrics, interactive campus map, shift summary, program schedule, activity filters, CSV snapshot                           |
| Facilities          | Nine campus zones, housing occupancy, zone inspections, links into access controls                                                          |
| Residents           | Search/filter 48 fictional profiles, edit care pathways, case assignments, room placement, and recorded location                            |
| Intake & transition | Required intake checklists, available room assignment, admissions, supported discharges, preserved discharge archive                        |
| Programs            | Education, wellbeing, recreation, life skills, capacity limits, roster enrollment/removal, session start/completion                         |
| Care & scheduling   | Health checks, family visits, court hearings, case reviews, transition planning, appointment status and booking conflict checks             |
| Incidents           | Report creation, category/priority/location, search, open/review/resolved workflow, CSV export                                              |
| Staff & shifts      | Day/night rosters, duty/break/off-duty states, post reassignment                                                                            |
| Central control     | 18 simulated doors, interactive floor plan, eight-second releases, held-open states, paired-door interlocks, secure-all confirmation        |
| Camera workspace    | Nine generated SVG scenes, 4/9-feed layouts, zone filters, day/night views, pause, expanded feeds, signal-loss scenarios                    |
| Fire & life safety  | Fictional SENTINEL FACP–4000 panel, fire/supervisory/trouble events, acknowledgement, silence, source restoration, latched reset, lamp test |
| Maintenance         | Work order creation, priority, location, assignee, status workflow and filters                                                              |
| Reports & audit     | Shift summary, resident census, incident reports, CSV downloads, searchable/filterable audit log with pagination                            |
| Settings            | Facility/operator names, shift preferences, compact tables, optional panel tone, JSON backup, confirmed demo reset                          |

Use **Ctrl/Cmd + K** for workspace search. Search module names, resident names/IDs, or incident reports. The notification bell shows current items needing attention. All dialogs support Escape and keyboard focus management.

## Try a connected workflow

1. Open **Overview → Run a training scenario**, select a fire drill and a zone, then start.
2. In **Fire & life safety**, acknowledge the event. Silence becomes available after acknowledgement.
3. Restore the initiating source in the event queue. Acknowledged, restored events remain latched until **System reset**.
4. Return to Overview to see the updated system status. Open **Reports & audit** to inspect the recorded operations.

For access training, release a housing entry door. Its paired interior door stays interlocked until the entry secures after eight seconds. A held-open door persists until a secure command is issued.

Program attendance updates resident status when a session starts or completes. Changing a resident’s house updates campus occupancy. Intake prevents occupied room assignments. A discharge releases the placement, removes program enrollments, cancels pending care bookings, and archives the resident record.

## Validation

```bash
npm run build          # Strict TypeScript check and production bundle
npm test               # Build, backend tests, and authenticated browser workflows
npm run format:check   # Formatting checks
```

The 16 Playwright workflows cover sign-in/logout, independent sessions, shared changes between two browsers, every module, door timing/interlocks, fire-panel response, incidents, placement, programs, bookings, intake/discharge, staffing, maintenance, cameras, exports, preferences, search, reset confirmation, and mobile layouts. Four backend tests additionally verify authorization, CSRF/origin checks, validation, revision conflicts, SQLite/account persistence across restart, server timers without connected browsers, and server-side business rules. Tests use a separate temporary database and fixture-only accounts; deployment startup never creates test accounts.

Chromium is already available at `/usr/bin/chromium` in this cloud environment. Playwright uses it automatically. On another machine, run `npx playwright install chromium` or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an existing Chromium binary. No browser download is needed in the prepared cloud environment.

To inspect the production build interactively, run:

```bash
npm run build
npm start
```

## State and architecture

- `server/*.js`: Express API, authentication, request validation, SQLite persistence, server timers, and account/backup CLI.
- `shared/model.ts`: types, campus geometry, and sample data.
- `shared/simulation.ts`: shared domain actions and simulation rules. Node 24 executes these TypeScript modules using built-in type stripping.
- `src/model.ts`: frontend re-export of the shared model.
- `src/store.tsx`: authenticated API session, shared-state refresh, confirmed mutations, and optional alert tone.
- `src/auth.tsx`: sign-in interface.
- `windows/*.ps1`: installation, account creation, startup task, and consistent backups.
- `scripts/package-windows.mjs`: reproducible ZIP packaging with official Windows Node runtime checksum verification.
- `src/App.tsx`: navigation, hash routes, notifications, search, and application shell.
- `src/Operations.tsx`: overview, facilities, door controls, and scenario launcher.
- `src/Records.tsx`: residents, programs, incidents, staff, and maintenance.
- `src/Services.tsx`: intake/discharge and coordinated care appointments.
- `src/Safety.tsx`: fire panel and generated camera scenes.
- `src/Workspace.tsx`: reports, exports, backup, preferences, and reset.
- `src/components.tsx`: shared UI, accessible forms/dialogs, floor plan, and export helpers.
- `tests/workflows.spec.ts`: end-to-end workflows against the production build.

Shared records, preferences, accounts, sessions, and audit history are stored in `data/jailops.sqlite`. Passwords use salted scrypt hashes; session cookies are HTTP-only. State changes use revision checks and transactional writes. The application feed shows the latest 250 activity events; the server retains complete audit records with the signed-in actor, available through authenticated `GET /api/audit`. Administrators can reset the simulation without deleting accounts or the server audit.

CSV and JSON exports are available in the application. JSON import is not implemented. For a complete, consistent database backup including accounts and audit, use `windows/Backup.ps1` or `node server/manage.js backup <destination.sqlite>`. Camera playback preferences and signal-loss illustrations remain temporary view state. Version 1 browser-local records are not automatically imported.

API endpoints include `GET /api/health`, `GET /api/session`, `POST /api/login`, `POST /api/logout`, `GET /api/state`, `POST /api/actions`, and `GET /api/audit`. Mutations require an authenticated session, a CSRF token, and an `If-Match` workspace revision. Production serves both the API and compiled React application from the Node server.

Create a fresh deployment archive with `npm run package:windows`. This downloads the official Node 24.19.0 Windows x64 archive, verifies its SHA-256 using the official HTTPS manifest, installs only portable production dependencies into a temporary staging folder, and writes a ZIP and checksum under `releases/`. Live databases, `.env`, caches, and existing accounts are excluded.

The control-room concept is inspired by integrated correctional control products, including the [reference supplied for this project](https://eccoinc.com/imperium-correctional-control-system/). SENTINEL is an independently designed fictional training panel, rather than a reproduction of a specific Siemens product. JailOpsSim is not affiliated with Siemens, ECCO, or IMPERIUM. There are no hardware protocols, real camera streams, or emergency dispatch integrations. Use fictional information only.
