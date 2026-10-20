import { test, expect } from "@playwright/test";
import { testAdmin } from "./credentials.js";

test("sign-in errors, authenticated application and logout", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await page.getByLabel("Username", { exact: true }).fill(testAdmin.username);
  await page
    .getByLabel("Password", { exact: true })
    .fill("incorrect-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("incorrect");
  await page.getByLabel("Password", { exact: true }).fill(testAdmin.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.locator("main h1")).toHaveText("Facility overview.");
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "jailops_session")?.httpOnly).toBe(
    true,
  );
  await page
    .getByRole("button", { name: `Sign out ${testAdmin.username}` })
    .click();
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  expect((await page.request.get("/api/state")).status()).toBe(401);
});

test("two browsers share committed door state and retain independent sessions", async ({
  page,
  browser,
}) => {
  const session = await (
    await page.request.post("/api/login", { data: testAdmin })
  ).json();
  const snapshot = await (await page.request.get("/api/state")).json();
  await page.request.post("/api/actions", {
    headers: {
      "X-CSRF-Token": session.csrfToken,
      "If-Match": `"${snapshot.revision}"`,
    },
    data: { type: "reset" },
  });
  const second = await browser.newContext();
  try {
    await second.request.post("http://127.0.0.1:4173/api/login", {
      data: testAdmin,
    });
    const other = await second.newPage();
    await page.goto("/#controls");
    await other.goto("http://127.0.0.1:4173/#controls");
    await page
      .locator(".door-item")
      .filter({ hasText: "Cedar House entry" })
      .getByRole("button", { name: "Hold open" })
      .click();
    await expect(
      other
        .locator(".door-item")
        .filter({ hasText: "Cedar House entry" })
        .getByText("Held open", { exact: true }),
    ).toBeVisible({ timeout: 6000 });
    await page
      .getByRole("button", { name: `Sign out ${testAdmin.username}` })
      .click();
    expect(
      (await second.request.get("http://127.0.0.1:4173/api/state")).status(),
    ).toBe(200);
  } finally {
    await second.close();
  }
});
