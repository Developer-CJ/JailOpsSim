# CJIT version sequence

Use `v<generation>.<build>.<storage>` in package metadata, application UI, health responses, deployment manifests, and release filenames.

| Component  | Meaning                                         | Current value |
| ---------- | ----------------------------------------------- | ------------- |
| Generation | Major product generation                        | 4             |
| Build      | Increasing release build within this generation | 2             |
| Storage    | Storage implementation code                     | 1             |

Storage codes: **0 = no database**, **1 = local SQLite**, **9 = CJIT-SHARED**. Codes 2–8 remain reserved. This is the owner's release notation; the final component indicates storage rather than a conventional semantic-version patch. Increase the build for a subsequent release, such as `4.3.1`. A future CJIT-SHARED build would be `4.<next build>.9` only after that connection is actually implemented.

The running release is **4.2.1**. `shared/workflows.ts` exports the UI/API/package release metadata; `package.json` and its lockfile must agree. Historical v2/v3 documents retain their original version identifiers. This repository establishes the convention for JailOps; it does not modify other repositories.
