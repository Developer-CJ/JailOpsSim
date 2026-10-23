# JailOps 4.1.1

JailOps now opens to a custody workflow desk with warm paper surfaces, an ink navigation rail, large serif headings, four distinct workflow colors, and light/dark themes. The JailOps product name replaces the previous simulator branding in the main shell. Generated building controls and feeds retain their demonstration labels because they have no physical connections.

## Guided encounters

Click a pathway to open a focused interview: one question, a selection or answer, then Continue. Each answer is saved on the server. Close the dialog and resume from your desk. Previous question clears downstream answers so a changed resident or order cannot inherit an old verification. Drafts belong to their starting staff account. Completed encounters are closed records with a final review and operator attestation.

- **Intake:** name, age, authority, arrival welfare screen, vacant room, identity check, coordinator, immediate plan. The server checks occupancy at the final commit and creates the resident and completed encounter atomically.
- **Medication pass:** select a resident and current authorized order, check identity, document administration checks, record Given/Refused/Held/Omitted, and explain the encounter. Administrators can transcribe and discontinue orders with prescriber, source reference, dates, dose, route, and schedule. These fields record existing instructions; the application does not prescribe, calculate doses, or perform interaction/allergy checking. An unresolved administration check prevents a Given result. A discontinued/expired order cannot be committed.
- **Custody handoff:** person, identity, receiving location, escort, receiving staff acknowledgment. Completion updates the existing movement history, recorded location, and resident status.
- **Release:** person, authority, hold check, identity, receiving custodian, property/transition reconciliation, witness attestation, release pathway. Unresolved holds/handover block completion. Release archives the resident, clears recorded location, cancels open movements and appointments, and removes program enrollments.

Court authority references and witness names are recorded attestations, not integrations with a court or second authenticated signatures. Existing v2/v3 forms remain available under Intake & transition and Care & scheduling for baseline compatibility; they do not acquire all v4 guided checks automatically. Use the new workflow desk for the guided pathways. This remains an evaluation build with seeded fictional records; the design has not been validated for real clinical or custodial deployment.

## Hardware and storage

- U.are.U 4500 retains its WBF driver. Included self-contained Windows bridge and source verify an enrolled Windows staff fingerprint; resident identity is separately attested. The bridge compiles and is cross-published for Windows x64; physical WBF validation requires Windows.
- MSR213U-12AUBNR supports the facility-card path when configured to emit keyboard identifiers. Administrator enrollment and revocation, keyed digests, identity-bound proofs, and mismatch rejection are implemented. Physical reader configuration remains to be checked.
- SQLite and existing accounts/records are preserved. A missing workflow extension is added once on upgrade. No CJIT-SHARED service is used.
- Release notation is `4.<build>.<storage>`: 0 no database, 1 SQLite, 9 CJIT-SHARED. Current release: **4.1.1**. See [versioning](VERSIONING.md) and [device setup](DEVICE_INTEGRATION.md).

## Design references

Useful product families to compare with the completed workflows include [Tyler Enterprise Corrections](https://www.tylertech.com/products/enterprise-corrections), [equivant Corrections](https://www.equivant-corrections.com/), and [Tyler Enterprise Justice](https://www.tylertech.com/products/enterprise-justice). Relevant patterns are person-centered records, custody chronology, authority checks, placement, care encounters, and accountable transfers. The one-question interaction is inspired by the Typeform pattern requested by the owner; it is independently implemented.

Reference documentation: [Windows Biometric Framework](https://learn.microsoft.com/en-us/windows/win32/secbiomet/biometric-service-api-portal), [WinBioVerify](https://learn.microsoft.com/en-us/windows/win32/api/winbio/nf-winbio-winbioverify), and [HID DigitalPersona devices](https://hidglobal.github.io/digitalpersona-devices/). Vendor web access was blocked by the execution environment, so the product pages and exact reader compatibility were not freshly reviewed or verified. No affiliation is claimed.

## Verified release checks

The release includes 30 authenticated browser workflows and 15 backend integration tests, plus formatting, Windows ZIP extraction/startup/persistence/backup checks on Linux, and WBF bridge compilation and HTTP smoke checks. Actual Windows startup tasks and physical USB verification still require the target machines.
