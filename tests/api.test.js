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

test("v2 database upgrade retains every existing record, account, preference, and audit row", async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    await f.action({ type: "door", id: "A1-01", mode: "hold" }, admin);
    const before = await f.state(admin);
    const old = structuredClone(before.state);
    delete old.extension;
    old.settings.facilityName = "Preserved training campus";
    f.runtime.store.db
      .prepare("UPDATE workspace SET body = ? WHERE id = 1")
      .run(JSON.stringify(old));
    await f.restart();
    const after = await f.state(admin);
    assert.deepEqual(after.state.residents, old.residents);
    assert.deepEqual(after.state.doors, old.doors);
    assert.deepEqual(after.state.incidents, old.incidents);
    assert.deepEqual(after.state.settings, old.settings);
    assert.deepEqual(after.state.activity, old.activity);
    assert.equal(after.state.extension.schema, 1);
    assert.equal((await (await f.call("/api/audit", admin)).json()).total, 1);
    await f.login();
  } finally {
    await f.close();
  }
});

test("headcounts capture immutable rosters, enforce state, and preserve discrepancies", async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    assert.equal(
      (await f.action({ type: "headcountStart", zone: "A1" }, admin)).status,
      200,
    );
    assert.equal(
      (await f.action({ type: "headcountStart", zone: "A1" }, admin)).status,
      409,
    );
    let count = (await f.state(admin)).state.extension.headcounts[0];
    assert.equal(count.expected.length, 12);
    assert.equal(
      (
        await f.action(
          {
            type: "headcountMark",
            id: count.id,
            residentId: "R-1040",
            present: true,
          },
          admin,
        )
      ).status,
      409,
    );
    await f.action(
      {
        type: "headcountMark",
        id: count.id,
        residentId: "R-1001",
        present: true,
      },
      admin,
    );
    await f.action({ type: "headcountFinish", id: count.id }, admin);
    assert.equal(
      (
        await f.action(
          {
            type: "headcountMark",
            id: count.id,
            residentId: "R-1001",
            present: false,
          },
          admin,
        )
      ).status,
      409,
    );
    count = (await f.state(admin)).state.extension.headcounts[0];
    assert.equal(count.expected.length - count.present.length, 11);
  } finally {
    await f.close();
  }
});

test("movement transitions, duty checks, arrival locations, and discharge cleanup are enforced", async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    const initial = (await f.state(admin)).state;
    const escort = initial.staff.find((s) => s.status === "On duty").name,
      off = initial.staff.find((s) => s.status === "Off duty").name;
    const payload = {
      type: "movementCreate",
      residentId: "R-1001",
      destination: "MED",
      escort,
      purpose: "Training health appointment",
    };
    assert.equal(
      (await f.action({ ...payload, escort: off }, admin)).status,
      409,
    );
    assert.equal((await f.action(payload, admin)).status, 200);
    assert.equal((await f.action(payload, admin)).status, 409);
    let m = (await f.state(admin)).state.extension.movements[0];
    assert.equal(
      (
        await f.action(
          { type: "movementStatus", id: m.id, status: "Arrived" },
          admin,
        )
      ).status,
      409,
    );
    await f.action(
      { type: "movementStatus", id: m.id, status: "En route" },
      admin,
    );
    await f.action(
      { type: "movementStatus", id: m.id, status: "Arrived" },
      admin,
    );
    let state = (await f.state(admin)).state;
    assert.equal(state.extension.locations["R-1001"], "MED");
    assert.equal(state.residents.find((r) => r.id === "R-1001").unit, "A1");
    await f.action({ ...payload, destination: "A1" }, admin);
    await f.action(
      { type: "discharge", id: "R-1001", reason: "Community transition" },
      admin,
    );
    state = (await f.state(admin)).state;
    assert.equal(state.extension.locations["R-1001"], undefined);
    assert.equal(state.extension.movements[0].status, "Cancelled");
  } finally {
    await f.close();
  }
});

test("patrol checkpoints, intercom concurrency, and asset custody reject invalid transitions", async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    const officer = (await f.state(admin)).state.staff.find(
      (s) => s.status === "On duty",
    ).name;
    await f.action({ type: "patrolStart", officer }, admin);
    const patrol = (await f.state(admin)).state.extension.patrols[0];
    assert.equal(
      (await f.action({ type: "patrolFinish", id: patrol.id }, admin)).status,
      409,
    );
    for (const c of patrol.checkpoints)
      assert.equal(
        (
          await f.action(
            {
              type: "patrolCheck",
              id: patrol.id,
              zone: c.zone,
              note: "Verified",
            },
            admin,
          )
        ).status,
        200,
      );
    assert.equal(
      (await f.action({ type: "patrolFinish", id: patrol.id }, admin)).status,
      200,
    );
    await f.action(
      { type: "intercomCreate", zone: "A1", reason: "Assistance" },
      admin,
    );
    await f.action(
      { type: "intercomCreate", zone: "A2", reason: "Question" },
      admin,
    );
    const calls = (await f.state(admin)).state.extension.calls;
    await f.action(
      { type: "intercomStatus", id: calls[0].id, status: "Connected" },
      admin,
    );
    assert.equal(
      (
        await f.action(
          { type: "intercomStatus", id: calls[1].id, status: "Connected" },
          admin,
        )
      ).status,
      409,
    );
    await f.action(
      { type: "intercomStatus", id: calls[0].id, status: "Ended" },
      admin,
    );
    assert.equal(
      (
        await f.action(
          { type: "intercomStatus", id: calls[1].id, status: "Connected" },
          admin,
        )
      ).status,
      200,
    );
    await f.action(
      { type: "assetCheckout", id: "KEY-01", holder: officer },
      admin,
    );
    assert.equal(
      (
        await f.action(
          { type: "assetCheckout", id: "KEY-01", holder: officer },
          admin,
        )
      ).status,
      409,
    );
    await f.action({ type: "assetReturn", id: "KEY-01" }, admin);
    assert.equal(
      (await f.action({ type: "assetReturn", id: "KEY-01" }, admin)).status,
      409,
    );
  } finally {
    await f.close();
  }
});

test("PA, environment, and handover validation persist shared module records after restart", async () => {
  const f = await fixture();
  try {
    const admin = await f.login(),
      owner = (await f.state(admin)).state.staff[0].name;
    assert.equal(
      (
        await f.action(
          {
            type: "utility",
            zone: "A1",
            lighting: "Night",
            temperature: 100,
            ventilation: "Boost",
          },
          admin,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await f.action(
          {
            type: "announcement",
            zones: [],
            message: "Test",
            priority: "Routine",
          },
          admin,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await f.action(
          {
            type: "announcement",
            zones: ["A1", "A1"],
            message: "Test",
            priority: "Routine",
          },
          admin,
        )
      ).status,
      400,
    );
    await f.action(
      {
        type: "utility",
        zone: "A1",
        lighting: "Night",
        temperature: 22,
        ventilation: "Boost",
      },
      admin,
    );
    await f.action(
      {
        type: "announcement",
        zones: ["A1", "EDU"],
        message: "Training briefing starts shortly",
        priority: "Routine",
      },
      admin,
    );
    await f.action(
      {
        type: "handoverCreate",
        title: "Lighting review",
        note: "Night mode verified",
        priority: "Important",
        owner,
      },
      admin,
    );
    const h = (await f.state(admin)).state.extension.handovers[0];
    await f.action({ type: "handoverFinish", id: h.id }, admin);
    await f.restart();
    const x = (await f.state(admin)).state.extension;
    assert.equal(x.utilities.A1.temperature, 22);
    assert.equal(x.announcements[0].zones.length, 2);
    assert.equal(x.handovers[0].status, "Completed");
  } finally {
    await f.close();
  }
});

test("guided fire exercise enforces actual panel response and five sequential steps", async () => {
  const f = await fixture();
  try {
    const admin = await f.login();
    await f.action(
      { type: "drillStart", kind: "Fire response", zone: "EDU" },
      admin,
    );
    let s = (await f.state(admin)).state;
    const d = s.extension.drills[0];
    assert.equal(s.alarms.length, 1);
    assert.equal(
      (await f.action({ type: "drillFinish", id: d.id }, admin)).status,
      409,
    );
    assert.equal(
      (await f.action({ type: "drillStep", id: d.id, step: 1 }, admin)).status,
      409,
    );
    await f.action({ type: "drillStep", id: d.id, step: 0 }, admin);
    assert.equal(
      (await f.action({ type: "drillStep", id: d.id, step: 1 }, admin)).status,
      409,
    );
    await f.action({ type: "acknowledge" }, admin);
    await f.action({ type: "drillStep", id: d.id, step: 1 }, admin);
    await f.action({ type: "silence" }, admin);
    await f.action({ type: "drillStep", id: d.id, step: 2 }, admin);
    await f.action({ type: "clearSource", id: s.alarms[0].id }, admin);
    await f.action({ type: "drillStep", id: d.id, step: 3 }, admin);
    await f.action({ type: "resetPanel" }, admin);
    await f.action({ type: "drillStep", id: d.id, step: 4 }, admin);
    assert.equal(
      (await f.action({ type: "drillFinish", id: d.id }, admin)).status,
      200,
    );
    assert.equal((await f.state(admin)).state.extension.drills[0].score, 100);
  } finally {
    await f.close();
  }
});
