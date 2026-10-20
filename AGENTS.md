# JailOpsSim working rules

The owner has explicitly designated the current suite as the permanent functional baseline. Extend it without removing existing features, modules, workflows, records, or deployment support unless the owner explicitly requests removal. Read `docs/BASELINE.md` before changing architecture or storage.

Preserve v2/v3 SQLite data and existing accounts during upgrades. Keep production credentials and databases out of source and release packages. Keep the original Windows downloads available when publishing a new version.

Use the full regression suite (`npm test`) for functional changes, plus `npm run format:check`. If a change affects the deployment, rebuild the Windows ZIP and run `npm run verify:package -- <zip>`. The physical control panels and detailed facility view must retain dedicated-window and full-screen operation, while all operational modules remain connected through the main suite.

All building controls and records are fictional training features; do not connect them to real hardware or represent generated camera/intercom/PA activity as live signals.
