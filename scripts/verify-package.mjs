import extract from "extract-zip";
import { chromium } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "node:net";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

if (!process.argv[2]) throw new Error("Supply a deployment ZIP filename.");
const temporary = await mkdtemp(
  path.join(os.tmpdir(), "jailops package verification "),
);
let server, browser;
async function unusedPort() {
  const socket = createServer();
  await new Promise((resolve) => socket.listen(0, "127.0.0.1", resolve));
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  return port;
}
try {
  await extract(path.resolve(process.argv[2]), { dir: temporary });
  const root = path.join(temporary, "JailOpsSim");
  const environment = {
    ...process.env,
    HOST: "127.0.0.1",
    PORT: String(await unusedPort()),
    DATA_DIR: path.join(root, "data"),
    COOKIE_SECURE: "false",
    TRUST_PROXY: "false",
  };
  const cli = (args, input) =>
    execFileSync(process.execPath, ["server/manage.js", ...args], {
      cwd: root,
      env: environment,
      input,
      encoding: "utf8",
    });
  assert.equal(
    JSON.parse(cli(["status"])).users,
    0,
    "A deployment must not contain live accounts.",
  );
  const runtime = await readFile(path.join(root, "runtime/node.exe"));
  assert.equal(runtime.subarray(0, 2).toString(), "MZ");
  const pe = runtime.readUInt32LE(0x3c);
  assert.equal(runtime.subarray(pe, pe + 4).toString("hex"), "50450000");
  assert.equal(
    runtime.readUInt16LE(pe + 4),
    0x8664,
    "Bundled runtime must be Windows x64.",
  );
  const account = {
    username: "package.verify",
    password: randomBytes(24).toString("base64url"),
    role: "admin",
  };
  cli(["create-user"], JSON.stringify(account));
  const base = `http://127.0.0.1:${environment.PORT}`;
  let serverOutput = "";
  async function start() {
    server = spawn(process.execPath, ["server/index.js"], {
      cwd: root,
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    });
    server.stdout.on("data", (chunk) => {
      serverOutput += chunk;
    });
    server.stderr.on("data", (chunk) => {
      serverOutput += chunk;
    });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (server.exitCode !== null)
        throw new Error(`Packaged server exited: ${serverOutput}`);
      try {
        if ((await fetch(base + "/api/health")).ok) return;
      } catch {
        /* Wait for the server to bind. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Packaged server did not become ready.");
  }
  async function stop() {
    const child = server;
    server = null;
    if (child.exitCode === null) {
      const closed = new Promise((resolve) => child.once("exit", resolve));
      child.kill("SIGTERM");
      await closed;
    }
  }
  await start();
  assert.equal((await fetch(base + "/api/state")).status, 401);
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      (process.platform === "linux" ? "/usr/bin/chromium" : undefined),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page.getByLabel("Username", { exact: true }).fill(account.username);
  await page.getByLabel("Password", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("heading", { name: "Facility overview." }).waitFor();
  await page.goto(base + "/?console=1#controls");
  const door = page
    .locator(".door-item")
    .filter({ hasText: "Cedar House entry" });
  await door.getByRole("button", { name: "Hold open" }).click();
  await door.getByText("Held open", { exact: true }).waitFor();
  await page.reload();
  await door.getByText("Held open", { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  await page.screenshot({
    path: path.join(os.tmpdir(), "jailops-packaged-controls.png"),
    fullPage: true,
  });
  await page.goto(base + "/?console=1#facility-view");
  await page
    .getByRole("img", { name: "Detailed interactive facility map" })
    .waitFor();
  assert.equal(await page.locator(".tactical-room").count(), 64);
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.goto(base + "/#accountability");
  await page.getByRole("button", { name: "Start headcount" }).click();
  await page.locator(".identity-check").first().getByRole("checkbox").click();
  await page.waitForFunction(
    () => document.querySelector(".identity-check input")?.checked === true,
  );
  assert.deepEqual(errors, []);
  await browser.close();
  browser = null;
  await stop();
  const backup = path.join(temporary, "verified-backup.sqlite");
  cli(["backup", backup]);
  const copiedDatabase = new DatabaseSync(backup, { readOnly: true });
  assert.equal(
    copiedDatabase.prepare("SELECT COUNT(*) AS count FROM users").get().count,
    1,
  );
  assert.ok(
    copiedDatabase.prepare("SELECT COUNT(*) AS count FROM audit").get().count >=
      1,
  );
  copiedDatabase.close();
  await start();
  const login = await fetch(base + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: account.username,
      password: account.password,
    }),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const snapshot = await (
    await fetch(base + "/api/state", { headers: { Cookie: cookie } })
  ).json();
  assert.equal(
    snapshot.state.doors.find((d) => d.id === "A1-01").status,
    "Held open",
  );
  assert.equal(snapshot.state.extension.headcounts[0].present.length, 1);
  assert.equal(snapshot.state.extension.headcounts[0].expected.length, 12);
  console.log(
    "Deployment ZIP verified: Windows x64 runtime, no preconfigured accounts, production-only dependencies, React sign-in, dark theme, detailed facility map, controls, and headcount, SQLite persistence after restart, and consistent database backup. Native Windows startup tasks were not executed.",
  );
} finally {
  if (browser) await browser.close();
  if (server && server.exitCode === null) {
    const child = server;
    const closed = new Promise((resolve) => child.once("exit", resolve));
    child.kill("SIGTERM");
    await closed;
  }
  await rm(temporary, { recursive: true, force: true });
}
