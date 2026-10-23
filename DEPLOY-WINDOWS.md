# Deploy JailOpsSim on Windows Server

Version **4.1.1** retains the complete v2/v3 suite and adds the guided custody workflow desk. See [what’s new](WHATS_NEW_V4.md) and the [baseline contract](BASELINE.md). Existing databases are upgraded in place without resetting records.

This package contains a React frontend, a Node.js JavaScript backend, a SQLite database engine, production dependencies, the complete source, and a verified Node.js 24.19.0 **Windows x64** runtime. The server serves the React assets and authenticated `/api` endpoints together. It is not a standalone HTML file. No npm install, database server, compilation, or internet connection is needed to run the main application on the destination server. The optional WBF workstation bridge has separate Windows setup requirements in [device integration](DEVICE_INTEGRATION.md).

Target a supported **Windows Server 2019, 2022, or 2025 x64** system. The deployment has been built and functionally tested in Linux; native Windows startup and Task Scheduler registration must be verified on the target Windows server.

## First installation

1. Extract the entire ZIP to a short local path, for example `C:\Apps\JailOpsSim`. The extracted application folder must contain `runtime`, `node_modules`, `dist`, `server`, and `windows` alongside `package.json`.
2. Open Windows PowerShell and change to that folder. If Windows marked the downloaded files as blocked, review the package and use `Get-ChildItem -Recurse -File | Unblock-File`. Follow your organization’s PowerShell policy; the scripts do not change execution policy.
3. Run:

   ```powershell
   Set-Location C:\Apps\JailOpsSim
   .\windows\Install.ps1
   .\windows\Start.ps1
   ```

4. Installation asks for your administrator username and password. Use a password of at least 12 characters. There is **no default account or password**. Passwords are passed through a private stdin pipe and stored as salted scrypt hashes in SQLite.
5. For a server-local check, use a browser on the server to open port **3000** at the loopback address. Sign in, open Central control, issue a simulated door command, and reload to verify it persists. Stop a manually launched server with Ctrl+C.

The initial configuration binds to `127.0.0.1:3000`. To serve authenticated clients directly on your LAN, install with:

```powershell
.\windows\Install.ps1 -BindAddress 0.0.0.0 -Port 3000
```

If `.env` already exists, the installer preserves it. Edit `HOST` and `PORT` there instead. Allow the chosen port through your Windows firewall only for the intended client networks. Use HTTPS for browser sign-in across a network, as described below.

You may also double-click `Install.cmd` and `Start.cmd` for the default configuration.

## Keep the server running after logout or reboot

Stop any manually running instance first. From an **elevated PowerShell** in the application folder:

```powershell
.\windows\Register-StartupTask.ps1
```

This registers and starts the `JailOpsSim` startup task under **LOCAL SERVICE**. It grants that identity read/execute access to this application folder and modify access to the configured data folder. The task starts at boot and retries on failure. It does not create a Windows service or change firewall rules.

```powershell
Get-ScheduledTaskInfo -TaskName JailOpsSim
Stop-ScheduledTask -TaskName JailOpsSim
Start-ScheduledTask -TaskName JailOpsSim
```

The registration helper reads the actual database location from the application configuration, including a custom `DATA_DIR`. Use a dedicated data directory. The helper refuses to grant modify permission to an entire drive root.

Server logs are in `data\logs\server-YYYY-MM-DD.log`. The database is `data\jailops.sqlite`; its WAL/SHM files are managed by SQLite.

## HTTPS with IIS or another reverse proxy

Keep Node bound to `127.0.0.1:3000`. Configure your existing IIS HTTPS site with URL Rewrite and Application Request Routing to proxy **all paths**, including `/api`, to the Node process. Preserve the original `Host` header and forward the client protocol. Do not configure IIS to serve only `dist\index.html`; both the API and compiled React asset requests must reach the Node server.

Example settings after the HTTPS proxy is working:

```dotenv
HOST=127.0.0.1
PORT=3000
DATA_DIR=./data
COOKIE_SECURE=true
TRUST_PROXY=loopback
```

Restart the Node process after changing `.env`. `COOKIE_SECURE=true` requires HTTPS in the browser. `TRUST_PROXY=loopback` trusts only a proxy on the same host. IIS installation, certificate issuance, DNS, and proxy rules depend on your server and are not applied by this package.

## Accounts and roles

Create additional accounts from a PowerShell session with write access to the database:

```powershell
.\windows\New-User.ps1 -Role operator
.\windows\New-User.ps1 -Role admin
```

Operators can use the simulation modules. Administrators can also change shared workspace preferences and reset the simulation. All sessions use HTTP-only cookies and expire after eight hours. Mutating API calls require a CSRF token and the current workspace revision. The full database audit records the signed-in actor; the workspace shows the most recent 250 activity events.

## Backups and upgrades

Create a consistent database backup, including accounts and server audit history:

```powershell
.\windows\Backup.ps1 -Destination C:\Backups\JailOpsSim-2026-10-19.sqlite
```

The backup helper uses SQLite `VACUUM INTO`, so it can run while the application is active. Pick a new filename for each backup. The helper also saves a `.reader-key` companion when the facility-card digest key exists. Preserve it with the database backup. Treat both files as private server data. The JSON export in Settings is a simulation-data export; it does not contain accounts or the complete server audit.

For an upgrade, take a backup, stop the scheduled task, and replace the application files while retaining `.env` and the complete `data` directory. Run Install again to verify the deployment, then restart the task. Do not copy a running database file alone without its WAL; use the backup helper.

To restore a backup, stop the server first, preserve the current complete data folder, replace `data\jailops.sqlite` with the consistent backup, and remove stale `jailops.sqlite-wal`/`jailops.sqlite-shm` files only after the server is stopped and the old data is preserved. Restore the `.reader-key` companion to `data\reader-key` when present. Start the server and verify sign-in, records, and facility-card lookups.

## What runs where

| Component                            | Location                                                        |
| ------------------------------------ | --------------------------------------------------------------- |
| React application                    | `dist\index.html` and `dist\assets\*.js`, fonts, and CSS        |
| Node.js API and static server        | `server\*.js`                                                   |
| Shared simulation rules and fixtures | `shared\*.ts`, executed using Node 24’s built-in type stripping |
| SQLite database                      | `data\jailops.sqlite`, created at installation                  |
| Windows Node runtime and npm         | `runtime\`                                                      |
| Production JavaScript dependencies   | `node_modules\`                                                 |
| Frontend source                      | `src\`                                                          |
| Deployment scripts                   | `windows\*.ps1`, `Install.cmd`, and `Start.cmd`                 |

`DEPLOYMENT-MANIFEST.json` records the bundled runtime and its verified official SHA-256. A separate `.sha256` file verifies the deployment ZIP.

All building controls, fire events, camera scenes, and resident records remain fictional training features. This package has no connection to real corrections, fire, security, or surveillance systems.
