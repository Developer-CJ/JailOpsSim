# JailOps 4.2.1 — an interactive custody desk

This build expands the v4 guided pathways into connected resident workspaces. Local SQLite, existing accounts, v2/v3 modules, dedicated facility/control windows, the WBF bridge, and card verification remain available.

## See the person, then choose the action

- The home screen opens with clickable shift counters, house occupancy links, resident search, and a resident card workbench. House selection stays synchronized between the facility pulse and workbench.
- A custody record opens with placement, immediate plan, case coordinator, current orders, and open pathway counts. Tabs show the connected custody timeline and medication orders. Launch medication, handoff, or release directly from the selected person.
- The existing resident editor also links into the custody workbench, preserving access to placement/care editing.
- A three-column pathway board separates paused, active, and recorded encounters. Filter by pathway and search for a person or encounter. Status changes follow the actual workflow; moving a card visually cannot complete custody or clinical checks.

## Work through the critical moments

- Intake placement uses an interactive house and room grid. Occupied rooms are disabled. The server still checks occupancy when an admission is committed; the grid does not assess placement suitability.
- Resident selection includes searchable cards, house filters, and a record selector.
- Medication rounds group current authorized orders by house. An order with no completed encounter today stays in the awaiting list. Refused, held, and omitted are distinct recorded outcomes; a recorded encounter is not proof that a dose was given. Date grouping uses the displayed UTC date and does not infer a dose is due.
- A round opens the correct resident and order directly at verification. Existing matching drafts belonging to the signed-in operator are resumed instead of duplicated. After recording an encounter, return to the round to select the next person.
- Medication and release checks have individual checkboxes with recorded evidence. A positive completion response requires every relevant item. A concern can still be recorded without asserting the positive checks.
- The interview shows a persistent person/placement header, selectable previous steps, keyboard selection letters, and an expanded focus view.
- Saving and closing preserves a half-written text, selected room, or partial checklist. Unsaved reader values and identity proofs are not stored as partial answers. Complete an identity step to record its verification.
- Review includes **Edit** on each answer. Revisiting removes downstream answers, confirmations, and any pending reader proofs/challenges. Changing the person requires verification again.
- Completed encounters provide a printable receipt and JSON export. New encounters retain the selected resident's name/placement snapshot so a later record edit does not rewrite the historical receipt.

## Compatibility and validation

New workflow fields are optional, preserving v4.1.1 drafts and completed records. Build 2 workflows enforce the new individual check evidence; existing build 1 records retain their recorded behavior. New commands still require an authenticated owner, CSRF token, and current workspace revision. Completed encounters cannot be edited or saved as drafts.

The U.are.U 4500 uses the same WBF staff-verification path and existing driver; it does not provide resident biometric matching. The MSR213U-12AUBNR facility-card integration still requires keyboard output. Physical devices and native Windows startup remain to be checked on the target machines. See [device setup](DEVICE_INTEGRATION.md).

Version **4.2.1** means generation 4, build 2, SQLite storage 1. The original v2, v3, and v4.1.1 downloads remain available. Building controls and generated feeds retain their demonstration labels.
