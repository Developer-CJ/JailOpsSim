# Preserved suite baseline

JailOpsSim v2 is the minimum functional baseline for subsequent releases. New features extend the suite; they must not remove existing modules, workflows, records, or deployment capabilities unless explicitly requested by the owner.

The original v2 source is preserved in the Git commit titled **Preserve complete JailOpsSim v2 suite as expansion baseline**. The original Windows v2.0.0 download remains on the `deployment-download` branch. Version 3 builds on those files and retains all 14 original modules. The complete version 3 feature set is also part of the baseline for future releases.

## Compatibility contract

- Existing resident, admission, discharge, program, care, incident, staff, door, camera, fire, maintenance, report, export, search, settings, authentication, backup, and audit workflows remain available.
- A v2 SQLite workspace gains an `extension` property on first v3 startup. The migration preserves its existing state, accounts, sessions, audit records, and settings, and advances the workspace revision once.
- Existing database files and `.env` must be retained during an upgrade. Use the backup script before replacing application files.
- Existing console modules now open in dedicated windows from the suite. Their complete workflows remain accessible using `?console=1#fire`, `?console=1#controls`, and `?console=1#cameras`.
- A browser preference stores only the selected visual theme. Operational records remain server-backed.
- Future releases must rerun the original regression workflows as well as tests for added features.
