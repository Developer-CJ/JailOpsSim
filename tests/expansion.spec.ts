import { expect, test } from "@playwright/test";
import { testAdmin } from "./credentials.js";

test.beforeEach(async ({ page }) => {
  const session = await (
    await page.request.post("/api/login", { data: testAdmin })
  ).json();
  const snapshot = await (await page.request.get("/api/state")).json();
  expect(
    (
      await page.request.post("/api/actions", {
        headers: {
          "X-CSRF-Token": session.csrfToken,
          "If-Match": `"${snapshot.revision}"`,
        },
        data: { type: "reset" },
      })
    ).ok(),
  ).toBe(true);
});

test("blue themes persist and all expanded screens fit desktop and mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    for (const route of [
      "accountability",
      "movements",
      "rounds",
      "assets",
      "handover",
      "drills",
      "?console=1#facility-view",
      "?console=1#communications",
      "?console=1#environment",
      "?console=1#fire",
      "?console=1#cameras",
    ]) {
      await page.goto(route.startsWith("?") ? "/" + route : "/#" + route);
      await expect(page.locator("main h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBe(true);
    }
  }
  await page.goto("/#overview");
  await page.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("suite opens a detached fire console and supports immersive panel focus", async ({
  page,
}) => {
  await page.goto("/#overview");
  const popupPromise = page.waitForEvent("popup");
  await page
    .locator(".suite-console-dock")
    .getByRole("button", { name: /Fire panel/ })
    .click();
  const panel = await popupPromise;
  await expect(panel).toHaveURL(/console=1#fire/);
  await expect(panel.locator(".fire-panel")).toBeVisible();
  await panel.getByRole("button", { name: "Focus panel", exact: true }).click();
  await expect(panel.locator(".fire-rail")).toBeHidden();
  await expect(panel.locator(".fire-panel")).toBeVisible();
  await panel.getByRole("button", { name: "Show workspace" }).click();
  await expect(panel.locator(".fire-rail")).toBeVisible();
  await panel.getByRole("button", { name: "Full screen", exact: true }).click();
  await expect
    .poll(() => panel.evaluate(() => !!document.fullscreenElement))
    .toBe(true);
  await panel.getByRole("button", { name: "Exit full screen" }).click();
  await expect(page.locator(".sidebar")).toBeVisible();
  await panel.close();
});

test("facility map selects rooms and operates paired doors with live layers", async ({
  page,
}) => {
  await page.goto("/?console=1#facility-view");
  await page
    .getByRole("button", {
      name: "Cedar House room 01, Alex Morgan",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText("Alex Morgan");
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page
    .getByRole("button", { name: "Inspect door A1-01, Secured", exact: true })
    .click();
  await page.getByRole("button", { name: "Hold open", exact: true }).click();
  await expect(page.locator(".inspector-door-state")).toContainText(
    "Held open",
  );
  await page.getByLabel("Selected door").selectOption("A1-02");
  await expect(page.getByRole("button", { name: "Release 8s" })).toBeDisabled();
  await page.getByLabel("Selected door").selectOption("A1-01");
  await page.getByRole("button", { name: "Secure", exact: true }).click();
  await expect(page.locator(".inspector-door-state")).toContainText("Secured");
  await page.getByRole("button", { name: "Patrol", exact: true }).click();
  await expect(page.locator(".tactical-patrol")).toHaveCount(9);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(page.locator(".tactical-zoom")).toContainText("120%");
});

test("headcount records identities and a persistent discrepancy result", async ({
  page,
}) => {
  await page.goto("/#accountability");
  await page.getByRole("button", { name: "Start headcount" }).click();
  const first = page.locator(".identity-check").first();
  await first.getByRole("checkbox").click();
  await expect(first.getByRole("checkbox")).toBeChecked();
  await expect(page.locator(".count-progress")).toContainText(
    "1 / 12 verified",
  );
  await page.getByRole("button", { name: "Record count result" }).click();
  await page
    .getByRole("button", { name: "Confirm count", exact: true })
    .click();
  await expect(
    page.locator(".ops-list-row").filter({ hasText: "Cedar House" }),
  ).toContainText("11 discrepancies");
  await page.reload();
  await expect(page.locator(".count-progress")).toContainText("Completed");
  await expect(page.locator(".identity-check input:checked")).toHaveCount(1);
});

test("escorted movement progresses through arrival and updates the facility location", async ({
  page,
}) => {
  await page.goto("/#movements");
  await page.getByRole("button", { name: "Plan movement" }).click();
  await page
    .getByLabel("Escort", { exact: true })
    .selectOption({ label: "Alex Mitchell" });
  await page.getByRole("button", { name: "Queue movement" }).click();
  await page.getByRole("button", { name: "Begin escort" }).click();
  await expect(page.locator(".movement-ticket")).toContainText("Alex Morgan");
  await page.getByRole("button", { name: "Confirm arrival" }).click();
  await expect(
    page
      .locator(".movement-column")
      .filter({ has: page.getByRole("heading", { name: /Arrived/ }) }),
  ).toContainText("Alex Morgan");
  await page.goto("/?console=1#facility-view");
  await page
    .getByRole("button", { name: "Inspect Health services", exact: true })
    .click();
  await expect(page.locator(".inspector-metrics")).toContainText(
    "1Recorded here",
  );
});

test("patrol requires every checkpoint and preserves inspection notes", async ({
  page,
}) => {
  await page.goto("/#rounds");
  await page
    .getByLabel("Patrol officer")
    .selectOption({ label: "Alex Mitchell" });
  await page.getByRole("button", { name: "Begin patrol" }).click();
  await expect(
    page.getByRole("button", { name: "Complete round" }),
  ).toBeDisabled();
  for (let i = 0; i < 9; i++) {
    await page
      .getByRole("button", { name: "Inspect", exact: true })
      .first()
      .click();
    await page
      .getByLabel("Inspection note (optional)")
      .fill(i === 0 ? "Entry sensor inspected" : "No exceptions");
    await page.getByRole("button", { name: "Verify checkpoint" }).click();
    await expect(
      page.getByRole("button", { name: "Verified", exact: true }),
    ).toHaveCount(i + 1);
  }
  await page.getByRole("button", { name: "Complete round" }).click();
  await expect(page.locator(".ops-history-list")).toContainText("Completed");
  await page.reload();
  await expect(page.locator(".checkpoint-list")).toContainText(
    "Entry sensor inspected",
  );
});

test("intercom calls connect and end; PA dispatch records selected zones", async ({
  page,
}) => {
  await page.goto("/?console=1#communications");
  await page.getByRole("button", { name: "Simulate call" }).click();
  await page.getByRole("button", { name: "Answer", exact: true }).click();
  await expect(page.locator(".intercom-display")).toContainText("Cedar House");
  await page.getByRole("button", { name: "End call" }).click();
  await expect(page.locator(".intercom-display")).toContainText(
    "STATION STANDBY",
  );
  await page
    .getByLabel("Announcement message")
    .fill("Education session begins in ten minutes.");
  await page.getByRole("button", { name: "Dispatch announcement" }).click();
  await expect(page.locator(".announcement-history")).toContainText(
    "Education session begins in ten minutes.",
  );
  await page.reload();
  await expect(page.locator(".announcement-history")).toContainText(
    "Cedar House",
  );
});

test("environment controls, asset custody, and handover tasks persist", async ({
  page,
}) => {
  await page.goto("/?console=1#environment");
  await page.getByLabel("Increase temperature").click();
  await page.getByLabel("Lighting scene").selectOption("Night");
  await page.getByLabel("Ventilation", { exact: true }).selectOption("Boost");
  await page.getByRole("button", { name: "Apply environment" }).click();
  await expect(page.locator(".ops-card-footer")).toContainText(
    "Saved: 22°C · Night · Boost",
  );
  await page.reload();
  await expect(page.getByLabel("Lighting scene")).toHaveValue("Night");
  await page.goto("/#assets");
  const asset = page.locator(".asset-card").first();
  await asset.getByRole("button", { name: "Check out asset" }).click();
  await page.getByLabel("Custodian").selectOption({ label: "Alex Mitchell" });
  await page.getByRole("button", { name: "Confirm checkout" }).click();
  await expect(asset).toContainText("Alex Mitchell");
  await asset.getByRole("button", { name: "Return to storage" }).click();
  await expect(asset).toContainText("Available");
  await page.goto("/#handover");
  await page.getByRole("button", { name: "Add handover task" }).click();
  await page.getByLabel("Task title").fill("Review evening lighting");
  await page
    .getByLabel("Owner", { exact: true })
    .selectOption({ label: "Alex Mitchell" });
  await page
    .getByLabel("Shift note")
    .fill("Cedar House night scene verified during training.");
  await page.getByRole("button", { name: "Save handover" }).click();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await page.reload();
  await expect(page.locator(".handover-task")).toContainText(
    "Review evening lighting",
  );
});

test("guided fire exercise verifies actual panel actions and records a score", async ({
  page,
}) => {
  await page.goto("/#drills");
  await page.getByRole("button", { name: "Start guided drill" }).click();
  const steps = page.locator(".checkpoint");
  await steps
    .nth(0)
    .getByRole("button", { name: "Verify", exact: true })
    .click();
  await expect(steps.nth(0)).toContainText("Verified");
  const panel = await page.context().newPage();
  await panel.goto("http://127.0.0.1:4173/?console=1#fire");
  for (const [step, action] of [
    [1, "Acknowledge"],
    [2, "Signal silence"],
    [3, "Restore source"],
    [4, "System reset"],
  ] as const) {
    const revision = String(
      (await (await page.request.get("/api/state")).json()).revision,
    );
    await expect(panel.locator("html")).toHaveAttribute(
      "data-sync-revision",
      revision,
    );
    await panel.getByRole("button", { name: new RegExp(action, "i") }).click();
    // The main suite and panel receive committed state through cross-window sync and polling.
    await expect
      .poll(async () => {
        const state = (await (await page.request.get("/api/state")).json())
          .state;
        return action === "Acknowledge"
          ? state.alarms.every((a: { acknowledged: boolean }) => a.acknowledged)
          : action === "Signal silence"
            ? state.silenced
            : action === "Restore source"
              ? state.alarms.every((a: { active: boolean }) => !a.active)
              : state.alarms.length === 0;
      })
      .toBe(true);
    // Refresh the drill view to verify against the current server revision.
    await page.reload();
    await page
      .locator(".checkpoint")
      .nth(step)
      .getByRole("button", { name: "Verify", exact: true })
      .click();
    await expect(page.locator(".checkpoint").nth(step)).toContainText(
      "Verified",
    );
  }
  await page.getByRole("button", { name: "Complete exercise" }).click();
  await expect(page.locator(".drill-score")).toHaveText("100%");
  await panel.close();
});
