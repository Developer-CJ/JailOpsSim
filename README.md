# JailOpsSim — Windows Server downloads

## Latest: version 3.0.0

[**Download JailOpsSim v3.0.0 for Windows Server x64 (52.7 MB)**](https://github.com/Developer-CJ/JailOpsSim/raw/refs/heads/deployment-download/JailOpsSim-Windows-x64-v3.0.0.zip)

A complete suite with the original 14 modules preserved, plus 12 new features:

1. Detailed tactical facility view with 64 selectable rooms and live system layers.
2. Dedicated full-screen console windows and focused fire-panel operation.
3. Blue dark and light themes.
4. Resident identity headcounts and discrepancy records.
5. Escorted movement planning and arrival tracking.
6. Nine-zone patrol rounds with inspection notes.
7. Intercom station calls and history.
8. Zone-selectable public address dispatch.
9. Lighting scenes, temperature, and ventilation controls.
10. Key, radio, and equipment custody.
11. Shift handovers and assigned follow-ups.
12. Guided drills with verified actions and checklist scores.

[Feature guide and screenshots](WHATS_NEW_V3.md) · [Full application source](https://github.com/Developer-CJ/JailOpsSim/tree/main) · [Windows deployment instructions](DEPLOY-WINDOWS.md)

Extract the complete ZIP, run **Install.cmd** to create your own administrator account, then **Start.cmd**. The package includes the React assets, JavaScript/Express backend, SQLite engine, official Windows x64 Node runtime, production dependencies, all application source, and Windows deployment/backup scripts. No npm install is needed on the target server.

For an upgrade, back up your database, stop the application, and retain your `.env` and complete data directory when replacing application files. The v2 database migration preserves existing records, accounts, sessions, audit history, and settings.

**Validation:** 25 browser workflows and 10 backend tests pass. The extracted deployment package passed sign-in, dark mode, the detailed facility map, access controls, headcounts, SQLite persistence after restart, and consistent backup checks. Native Windows startup and Task Scheduler execution still require verification on the target server. No live accounts, environment secrets, or database files are bundled.

SHA-256: `a24a6561c4e39bfe9b7c5dc57391780ec7c770c2a1ab8e2c775f382cec302118`

![Detailed facility console](screenshots/facility-dark.png)

## Preserved version 2 baseline

[Download the original Windows Server v2.0.0 package](https://github.com/Developer-CJ/JailOpsSim/raw/refs/heads/deployment-download/JailOpsSim-Windows-x64-v2.0.0.zip)

The original package remains available. Its complete source is preserved at [v2.0.0-baseline](https://github.com/Developer-CJ/JailOpsSim/tree/v2.0.0-baseline). Version 3 is tagged [v3.0.0](https://github.com/Developer-CJ/JailOpsSim/tree/v3.0.0). [Baseline preservation rules](BASELINE.md) apply to future work.
