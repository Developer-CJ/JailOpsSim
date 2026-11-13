import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { testAdmin } from "./credentials.js";

test.beforeEach(async ({ page }) => {
  const session = await (
    await page.request.post("/api/login", { data: testAdmin })
  ).json();
  const snapshot = await (await page.request.get("/api/state")).json();
  const result = await page.request.post("/api/actions", {
    headers: {
      "X-CSRF-Token": session.csrfToken,
      "If-Match": `"${snapshot.revision}"`,
    },
    data: { type: "reset" },
  });
  expect(result.ok()).toBe(true);
});
async function readState(page: Page) {
  await page.waitForFunction(
    () => document.documentElement.dataset.syncPending === "0",
  );
  return (await (await page.request.get("/api/state")).json()).state;
}

test("all modules render and map navigation opens the selected zone", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const routes = [
    "overview",
    "facilities",
    "residents",
    "admissions",
    "programs",
    "services",
    "incidents",
    "staff",
    "controls",
    "cameras",
    "fire",
    "maintenance",
    "reports",
    "settings",
  ];
  for (const route of routes) {
    await page.goto(
      `${["controls", "fire", "cameras"].includes(route) ? "/?console=1" : "/"}#${route}`,
    );
    await expect(page.locator("main h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.goto("/#overview");
  await page
    .getByRole("button", { name: "Select Maple House", exact: true })
    .click();
  const consolePromise = page.waitForEvent("popup");
  await page.getByRole("button", { name: "Open Maple House controls" }).click();
  const consolePage = await consolePromise;
  await expect(page).toHaveURL(/#controls\/A2$/);
  await expect(consolePage.locator(".door-panel h2")).toHaveText("Maple House");
  await consolePage.close();
  expect(errors).toEqual([]);
});

test("door interlocks, timed release, held-open state and secure-all", async ({
  page,
}) => {
  await page.goto("/?console=1#controls");
  const entry = page
    .locator(".door-item")
    .filter({ hasText: "Cedar House entry" });
  const interior = page
    .locator(".door-item")
    .filter({ hasText: "Cedar House interior" });
  await entry.getByRole("button", { name: "Release 8s" }).click();
  await expect(entry.getByText("Released", { exact: true })).toBeVisible();
  await expect(
    interior.getByRole("button", { name: "Release 8s" }),
  ).toBeDisabled();
  await expect(entry.getByText("Secured", { exact: true })).toBeVisible({
    timeout: 11_000,
  });
  await expect(
    interior.getByRole("button", { name: "Release 8s" }),
  ).toBeEnabled();
  await interior.getByRole("button", { name: "Hold open" }).click();
  await expect(interior.getByText("Held open", { exact: true })).toBeVisible();
  await page.reload();
  await expect(interior.getByText("Held open", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Secure all doors", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Secure all doors", exact: true })
    .click();
  await expect(interior.getByText("Secured", { exact: true })).toBeVisible();
  expect(
    (await readState(page)).doors.every(
      (d: { status: string }) => d.status === "Secured",
    ),
  ).toBe(true);
});

test("fire events latch until acknowledged and restored; new events require acknowledgement", async ({
  page,
}) => {
  await page.goto("/?console=1#fire");
  const ack = page.getByRole("button", { name: /ACKNOWLEDGE Accept/ });
  const silence = page.getByRole("button", { name: /SIGNAL SILENCE/ });
  const reset = page.getByRole("button", { name: /SYSTEM RESET/ });
  await expect(reset).toBeDisabled();
  await page.getByRole("button", { name: "Inject simulated event" }).click();
  await expect(page.locator(".lcd-status")).toHaveText("** FIRE ALARM **");
  await expect(silence).toBeDisabled();
  await expect(reset).toBeDisabled();
  await ack.click();
  await silence.click();
  expect((await readState(page)).silenced).toBe(true);
  await expect(reset).toBeDisabled();
  await page.getByLabel("Event type", { exact: true }).selectOption("Trouble");
  await page.getByRole("button", { name: "Inject simulated event" }).click();
  expect((await readState(page)).silenced).toBe(false);
  await expect(silence).toBeDisabled();
  await ack.click();
  const eventRows = page.locator(".panel-events tbody tr");
  for (let i = 0; i < (await eventRows.count()); i++) {
    const row = eventRows.nth(i);
    await row.getByRole("button", { name: "Restore source" }).click();
    await expect(row.getByText("Restored · Latched")).toBeVisible();
  }
  await expect(page.getByText("Restored · Latched")).toHaveCount(2);
  await expect(reset).toBeEnabled();
  await reset.click();
  await expect(page.locator(".lcd-main strong")).toHaveText("SYSTEM NORMAL");
  expect((await readState(page)).alarms).toHaveLength(0);
  await page.reload();
  await expect(page.locator(".lcd-main strong")).toHaveText("SYSTEM NORMAL");
  await page.getByLabel("Event type", { exact: true }).selectOption("Trouble");
  await page.getByLabel("Initiating zone").selectOption("A1");
  await page.getByRole("button", { name: "Inject simulated event" }).click();
  await page
    .getByLabel("Event type", { exact: true })
    .selectOption("Fire alarm");
  await page.getByLabel("Initiating zone").selectOption("B2");
  await page.getByRole("button", { name: "Inject simulated event" }).click();
  await expect(page.locator(".lcd-main strong")).toHaveText("WILLOW HOUSE");
});

test("incident report, review, resolution and audit persist after reload", async ({
  page,
}) => {
  await page.goto("/#incidents");
  await page.getByRole("button", { name: "New incident" }).click();
  await page
    .getByLabel("Incident title", { exact: true })
    .fill("Training equipment inspection");
  await page
    .getByLabel("Incident details", { exact: false })
    .fill(
      "A fictional training sensor was inspected and maintenance follow-up was requested.",
    );
  await page.getByLabel("Priority", { exact: true }).selectOption("Medium");
  await page.getByRole("button", { name: "Submit incident" }).click();
  await page
    .getByRole("button", { name: /Training equipment inspection/ })
    .click();
  await page.getByLabel("Workflow status").selectOption("In review");
  await page.getByLabel("Workflow status").selectOption("Resolved");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  const row = page
    .getByRole("row")
    .filter({ hasText: "Training equipment inspection" });
  await expect(row.getByText("Resolved", { exact: true })).toBeVisible();
  const state = await readState(page);
  expect(
    state.activity.some(
      (e: { title: string }) => e.title === "Incident resolved",
    ),
  ).toBe(true);
});

test("resident placement prevents occupied rooms and updates occupancy", async ({
  page,
}) => {
  await page.goto("/#residents/R-1001");
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", { name: "Alex Morgan" }),
  ).toBeVisible();
  await dialog.getByLabel("Residential house").selectOption("A2");
  await expect(dialog.getByLabel("Assigned room")).toHaveValue("13");
  expect(
    await dialog
      .getByLabel("Assigned room")
      .locator('option[value="01"]')
      .isDisabled(),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Save resident record" }).click();
  await page.reload();
  expect(
    (await readState(page)).residents.find(
      (r: { id: string }) => r.id === "R-1001",
    ),
  ).toMatchObject({ unit: "A2", room: "13" });
  await page.goto("/#facilities");
  const maple = page
    .locator(".housing-card")
    .filter({ hasText: "Maple House" });
  await expect(maple.locator(".housing-count")).toContainText("13");
});

test("program enrollment and session completion update resident attendance", async ({
  page,
}) => {
  await page.goto("/#programs/PR-2");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Resident to enroll").selectOption("R-1048");
  await dialog.getByRole("button", { name: "Enroll", exact: true }).click();
  await expect(dialog.getByText("Zion Clarke", { exact: true })).toBeVisible();
  await dialog.getByRole("button", { name: "Start session" }).click();
  expect(
    (await readState(page)).residents.find(
      (r: { id: string }) => r.id === "R-1048",
    ).status,
  ).toBe("In program");
  await dialog.getByRole("button", { name: "Complete session" }).click();
  expect(
    (await readState(page)).residents.find(
      (r: { id: string }) => r.id === "R-1048",
    ).status,
  ).toBe("In unit");
  await expect(dialog.getByText("Completed", { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Enroll", exact: true }),
  ).toHaveCount(0);
});

test("care appointments schedule and check in with conflict protection", async ({
  page,
}) => {
  await page.goto("/#services");
  await page
    .getByRole("button", { name: "Schedule appointment", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Resident", { exact: true }).selectOption("R-1048");
  await dialog
    .getByLabel("Service", { exact: true })
    .selectOption("Family visit");
  await dialog
    .getByLabel("Planning notes", { exact: false })
    .fill("Fictional family connection session.");
  await dialog.getByRole("button", { name: "Schedule appointment" }).click();
  await page.getByRole("button", { name: "View appointment AP-106" }).click();
  await page.getByLabel("Appointment status").selectOption("Checked in");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.reload();
  expect(
    (await readState(page)).appointments.find(
      (a: { id: string }) => a.id === "AP-106",
    ).status,
  ).toBe("Checked in");
  await page
    .getByRole("button", { name: "Schedule appointment", exact: true })
    .click();
  await dialog.getByLabel("Resident", { exact: true }).selectOption("R-1048");
  await dialog.getByRole("button", { name: "Schedule appointment" }).click();
  await expect(page.getByRole("status")).toContainText(
    "already has an appointment",
  );
  expect((await readState(page)).appointments).toHaveLength(6);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});

test("intake checks gate admission and discharge archives the record", async ({
  page,
}) => {
  await page.goto("/#admissions");
  await page.getByRole("button", { name: "New admission" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Fictional resident name")
    .fill("Demo Fictional Resident");
  await expect(
    dialog.getByRole("button", { name: "Complete admission" }),
  ).toBeDisabled();
  for (const check of await dialog.getByRole("checkbox").all())
    await check.check();
  await dialog.getByRole("button", { name: "Complete admission" }).click();
  expect((await readState(page)).residents).toHaveLength(49);
  await page.goto("/#services");
  await page
    .getByRole("button", { name: "Schedule appointment", exact: true })
    .click();
  await page.getByLabel("Resident", { exact: true }).selectOption("R-1049");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Schedule appointment" })
    .click();
  await page.goto("/#admissions");
  await page.getByRole("button", { name: "Record discharge" }).click();
  await page.getByLabel("Resident to discharge").selectOption("R-1049");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Complete discharge" }).click();
  await page
    .getByRole("button", { name: "Discharge archive", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: /Demo Fictional Resident/ }),
  ).toBeVisible();
  const state = await readState(page);
  expect(state.residents).toHaveLength(48);
  expect(state.discharged[0]).toMatchObject({
    name: "Demo Fictional Resident",
    room: "13",
    reason: "Community transition",
  });
  expect(
    state.appointments.find(
      (a: { residentId: string }) => a.residentId === "R-1049",
    ).status,
  ).toBe("Cancelled");
});

test("staff assignment and maintenance lifecycle are editable", async ({
  page,
}) => {
  await page.goto("/#staff");
  await page.getByRole("button", { name: /Lee Thompson Youth care/ }).click();
  await page.getByLabel("Duty status").selectOption("On duty");
  await page.getByLabel("Assigned post").selectOption("Central control");
  await page.getByRole("button", { name: "Save assignment" }).click();
  expect(
    (await readState(page)).staff.find((s: { id: string }) => s.id === "ST-5"),
  ).toMatchObject({ status: "On duty", post: "Central control" });
  await page.goto("/#maintenance");
  await page.getByRole("button", { name: "New work order" }).click();
  await page.getByLabel("Work description").fill("Inspect training equipment");
  await page.getByRole("button", { name: "Create work order" }).click();
  await page.getByLabel("Status for WO-204").selectOption("Completed");
  await page.reload();
  await expect(page.getByLabel("Status for WO-204")).toHaveValue("Completed");
});

test("synthetic camera signal loss, restore and feed pause", async ({
  page,
}) => {
  await page.goto("/?console=1#cameras");
  await page.getByRole("button", { name: "Pause feeds" }).click();
  await expect(
    page.getByRole("button", { name: "Resume feeds" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Expand Main reception", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Simulate signal loss" }).click();
  await expect(dialog.getByText("VIDEO SIGNAL LOST")).toBeVisible();
  await dialog.getByRole("button", { name: "Restore signal" }).click();
  await expect(dialog.getByText("VIDEO SIGNAL LOST")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close view" }).click();
  await page.getByRole("button", { name: "Nine camera layout" }).click();
  await expect(page.locator(".camera-card")).toHaveCount(9);
});

test("CSV reports and JSON backup contain current simulation data", async ({
  page,
}) => {
  await page.goto("/#reports");
  await page
    .locator(".report-templates .card")
    .filter({ hasText: "Resident census" })
    .getByRole("button")
    .click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV report" }).click();
  const file = await downloadEvent;
  expect(file.suggestedFilename()).toBe("resident-census.csv");
  const stream = await file.createReadStream();
  let contents = "";
  for await (const chunk of stream!) contents += chunk;
  expect(contents).toContain("Alex Morgan");
  expect(contents.split("\r\n")).toHaveLength(49);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.goto("/#settings");
  const backupEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  const backup = await backupEvent;
  const backupStream = await backup.createReadStream();
  let json = "";
  for await (const chunk of backupStream!) json += chunk;
  expect(JSON.parse(json).residents).toHaveLength(48);
});

test("preferences persist and reset requires an explicit confirmation", async ({
  page,
}) => {
  await page.goto("/#settings");
  await page.getByLabel("Facility name").fill("Fictional Training Campus");
  await page.getByRole("switch", { name: "Compact tables" }).click();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await page.reload();
  await expect(page.getByLabel("Facility name")).toHaveValue(
    "Fictional Training Campus",
  );
  await expect(page.locator(".app")).toHaveClass(/compact/);
  await page.getByRole("button", { name: "Reset simulation" }).click();
  await expect(
    page.getByRole("button", { name: "Reset all demo data" }),
  ).toBeDisabled();
  await page.getByLabel("Type RESET to confirm").fill("RESET");
  await page.getByRole("button", { name: "Reset all demo data" }).click();
  await expect(page.getByLabel("Facility name")).toHaveValue(
    "Northwood Youth Center",
  );
  await expect(page.locator(".app")).not.toHaveClass(/compact/);
});

test("workspace search opens a resident and keyboard escape closes dialogs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("main h1")).toHaveText("Facility overview.");
  await page.keyboard.press("Control+k");
  await expect(
    page.getByRole("textbox", { name: "Search workspace…", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Search workspace…", exact: true })
    .fill("Zion Clarke");
  await page.getByRole("button", { name: /Zion Clarke R-1048/ }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { name: "Zion Clarke" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("mobile navigation, floor plan and service pages fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Fire & life safety" }).click();
  const popup = await popupPromise;
  await expect(popup.locator("main h1")).toHaveText(
    "Ready for the unexpected.",
  );
  await popup.close();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const route of [
    "controls",
    "programs",
    "residents",
    "services",
    "settings",
  ]) {
    await page.goto(
      `${["controls", "fire", "cameras"].includes(route) ? "/?console=1" : "/"}#${route}`,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
