import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApplication } from "../server/app.js";
import { testAdmin, testOperator } from "./credentials.js";

async function fixture() {
  const dir = mkdtempSync(path.join(os.tmpdir(), "jailops-api-tests-"));
  let runtime = createApplication({
    dataDir: dir,
    secureCookies: false,
    loginLimit: 1000,
  });
  runtime.store.createUser(testAdmin.username, testAdmin.password, "admin");
  runtime.store.createUser(
    testOperator.username,
    testOperator.password,
    "operator",
  );
  let server = runtime.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  let base = `http://127.0.0.1:${server.address().port}`;
  const login = async (account = testAdmin) => {
    const response = await fetch(base + "/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(account),
    });
    assert.equal(response.status, 200);
    const data = await response.json();
    return {
      cookie: response.headers.get("set-cookie").split(";")[0],
      csrf: data.csrfToken,
      user: data.user,
    };
  };
  const call = async (route, session, options = {}) =>
    fetch(base + route, {
      ...options,
      headers: {
        ...(session
          ? { Cookie: session.cookie, "X-CSRF-Token": session.csrf }
          : {}),
        ...options.headers,
      },
    });
  const state = async (session) => (await call("/api/state", session)).json();
  const action = async (payload, session, revision) =>
    call("/api/actions", session, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "If-Match": `"${revision ?? (await state(session)).revision}"`,
      },
      body: JSON.stringify(payload),
    });
  const stop = async () => {
    await new Promise((resolve) => server.close(resolve));
    runtime.close();
  };
  return {
    dir,
    runtime,
    login,
    call,
    state,
    action,
    async restart() {
      await stop();
      runtime = createApplication({
        dataDir: dir,
        secureCookies: false,
        loginLimit: 1000,
      });
      server = runtime.app.listen(0, "127.0.0.1");
      await new Promise((resolve) => server.once("listening", resolve));
      base = `http://127.0.0.1:${server.address().port}`;
    },
    async close() {
      await stop();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}

test("authentication, HTTP-only sessions, CSRF, origin protection, and role enforcement", async () => {
  const f = await fixture();
  try {
    assert.equal((await f.call("/api/state")).status, 401);
    const admin = await f.login(),
      operator = await f.login(testOperator);
    const current = await f.state(admin);
    const headers = {
      "Content-Type": "application/json",
      "If-Match": `"${current.revision}"`,
      Cookie: admin.cookie,
    };
    assert.equal(
      (
        await f.call("/api/actions", null, {
          method: "POST",
          headers,
          body: JSON.stringify({ type: "secureAll" }),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await f.call("/api/actions", admin, {
          method: "POST",
          headers: { ...headers, Origin: "https://unrelated.example" },
          body: JSON.stringify({ type: "secureAll" }),
        })
      ).status,
      403,
    );
    assert.equal((await f.action({ type: "reset" }, operator)).status, 403);
    const stored = f.runtime.store.db
      .prepare("SELECT password_hash FROM users WHERE username = ?")
      .get(testAdmin.username).password_hash;
    assert.notEqual(stored, testAdmin.password);
    assert.match(stored, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
    await f.call("/api/logout", admin, { method: "POST" });
    assert.equal((await f.call("/api/state", admin)).status, 401);
    assert.equal((await f.call("/api/state", operator)).status, 200);
  } finally {
    await f.close();
  }
});

test("server validates requests, interlocks, room assignments, and stale revisions", async () => {
  const f = await fixture();
  try {
    const admin = await f.login(),
      initial = await f.state(admin);
    assert.equal(
      (await f.action({ type: "expire", ids: ["A1-01"] }, admin)).status,
      400,
    );
    assert.equal(
      (await f.action({ type: "door", id: "missing", mode: "release" }, admin))
        .status,
      404,
    );
    assert.equal(
      (
        await f.action(
          { type: "door", id: "A1-01", mode: "hold" },
          admin,
          initial.revision,
        )
      ).status,
      200,
    );
    assert.equal(
      (await f.action({ type: "secureAll" }, admin, initial.revision)).status,
      409,
    );
    assert.equal(
      (await f.action({ type: "door", id: "A1-02", mode: "release" }, admin))
        .status,
      409,
    );
    assert.equal(
      (
        await f.action(
          {
            type: "resident",
            id: "R-1001",
            changes: { unit: "A2", room: "01" },
          },
          admin,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await f.action(
          { type: "resident", id: "R-1001", changes: { unit: "INVALID" } },
          admin,
        )
      ).status,
      400,
    );
    const audit = await (await f.call("/api/audit", admin)).json();
    assert.equal(audit.total, 1);
    assert.equal(audit.entries[0].actor, testAdmin.username);
  } finally {
    await f.close();
  }
});

test("SQLite persists commands and accounts after restart; timer expires with no clients", async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    assert.equal(
      (await f.action({ type: "door", id: "A1-01", mode: "release" }, admin))
        .status,
      200,
    );
    const before = await f.state(admin);
    await f.restart();
    const after = await f.state(admin);
    assert.equal(after.revision, before.revision);
    assert.equal(
      after.state.doors.find((d) => d.id === "A1-01").status,
      "Released",
    );
    await new Promise((resolve) => setTimeout(resolve, 8500));
    assert.equal(
      (await f.state(admin)).state.doors.find((d) => d.id === "A1-01").status,
      "Secured",
    );
    assert.equal(
      readFileSync(path.join(f.dir, "jailops.sqlite"))
        .subarray(0, 15)
        .toString(),
      "SQLite format 3",
    );
    await f.login();
  } finally {
    await f.close();
  }
});

test("panel reset and appointment conflicts are enforced by the API", async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    await f.action({ type: "alarm", zone: "EDU", kind: "Fire alarm" }, admin);
    assert.equal((await f.action({ type: "resetPanel" }, admin)).status, 409);
    await f.action({ type: "acknowledge" }, admin);
    assert.equal((await f.action({ type: "resetPanel" }, admin)).status, 409);
    const { state } = await f.state(admin);
    await f.action({ type: "clearSource", id: state.alarms[0].id }, admin);
    assert.equal((await f.action({ type: "resetPanel" }, admin)).status, 200);
    assert.equal(
      (
        await f.action(
          { type: "appointment", appointment: state.appointments[0] },
          admin,
        )
      ).status,
      409,
    );
  } finally {
    await f.close();
  }
});
