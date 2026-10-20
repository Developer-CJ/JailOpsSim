import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import {
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { initialExpansion } from "../shared/expansion.ts";
import { createInitialState } from "../shared/model.ts";
import { reduceSimulation } from "../shared/simulation.ts";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const tokenHash = (value) =>
  createHash("sha256").update(value).digest("hex");
export function openDatabase(dataDir) {
  mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const filename = path.join(dataDir, "jailops.sqlite");
  const db = new DatabaseSync(filename, { timeout: 5000 });
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = FULL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','operator')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL, expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);
    CREATE TABLE IF NOT EXISTS workspace (
      id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL, body TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit (
      id TEXT PRIMARY KEY, occurred_at TEXT NOT NULL, actor TEXT NOT NULL,
      action TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL
    );
    PRAGMA user_version = 1;
  `);
  db.prepare(
    "INSERT OR IGNORE INTO workspace (id, revision, body) VALUES (1, 1, ?)",
  ).run(JSON.stringify(createInitialState()));

  // Add new module state once without replacing any existing v2 record or preference.
  const storedWorkspace = db
    .prepare("SELECT body FROM workspace WHERE id = 1")
    .get();
  const storedState = JSON.parse(storedWorkspace.body);
  if (!storedState.extension) {
    storedState.extension = initialExpansion();
    db.prepare(
      "UPDATE workspace SET body = ?, revision = revision + 1 WHERE id = 1",
    ).run(JSON.stringify(storedState));
  }

  function snapshot() {
    const row = db
      .prepare("SELECT revision, body FROM workspace WHERE id = 1")
      .get();
    return { revision: row.revision, state: JSON.parse(row.body) };
  }
  function commit(action, expectedRevision, actor, validate = () => {}) {
    db.exec("BEGIN IMMEDIATE");
    try {
      const current = snapshot();
      if (expectedRevision !== null && current.revision !== expectedRevision)
        throw new ApiError(
          409,
          "The workspace changed. Review the latest data and try again.",
        );
      validate(current.state, action);
      const next = reduceSimulation(current.state, action);
      if (next === current.state)
        throw new ApiError(
          409,
          "This command cannot be applied in the current state. Refresh and try again.",
        );
      const revision = current.revision + 1;
      db.prepare(
        "UPDATE workspace SET body = ?, revision = ? WHERE id = 1",
      ).run(JSON.stringify(next), revision);
      const event = next.activity[0];
      db.prepare(
        "INSERT INTO audit (id, occurred_at, actor, action, title, detail) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(
        randomUUID(),
        new Date().toISOString(),
        actor,
        action.type,
        event?.title || action.type,
        event?.detail || "",
      );
      db.exec("COMMIT");
      return { state: next, revision };
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
  function expireDoors() {
    const ids = snapshot()
      .state.doors.filter((d) => d.releaseUntil && d.releaseUntil <= Date.now())
      .map((d) => d.id);
    if (ids.length) commit({ type: "expire", ids }, null, "system");
  }
  function createUser(username, password, role = "operator") {
    if (!/^[a-zA-Z0-9_.-]{3,40}$/.test(username))
      throw new ApiError(
        400,
        "Username must be 3–40 letters, digits, dots, underscores, or hyphens.",
      );
    if (
      typeof password !== "string" ||
      password.length < 12 ||
      password.length > 128
    )
      throw new ApiError(400, "Password must contain 12–128 characters.");
    if (!["admin", "operator"].includes(role))
      throw new ApiError(400, "Role must be admin or operator.");
    const salt = randomBytes(16).toString("hex");
    const hash = scryptSync(password, salt, 64).toString("hex");
    const user = { id: randomUUID(), username, role };
    try {
      db.prepare(
        "INSERT INTO users (id, username, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(
        user.id,
        username,
        `${salt}:${hash}`,
        role,
        new Date().toISOString(),
      );
    } catch (error) {
      if (String(error.message).includes("UNIQUE"))
        throw new ApiError(409, "That username already exists.");
      throw error;
    }
    return user;
  }
  function authenticate(username, password) {
    const row = db
      .prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE")
      .get(username);
    const [salt, hash] = (
      row?.password_hash || `${"0".repeat(32)}:${"0".repeat(128)}`
    ).split(":");
    const actual = scryptSync(password, salt, 64);
    if (!timingSafeEqual(Buffer.from(hash, "hex"), actual) || !row) return null;
    return { id: row.id, username: row.username, role: row.role };
  }
  function createSession(userId, hours) {
    db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
    const token = randomBytes(32).toString("base64url"),
      csrfToken = randomBytes(32).toString("hex");
    db.prepare(
      "INSERT INTO sessions (token_hash, user_id, csrf_token, expires_at) VALUES (?, ?, ?, ?)",
    ).run(tokenHash(token), userId, csrfToken, Date.now() + hours * 3600000);
    return { token, csrfToken };
  }
  function session(token) {
    if (!token || token.length > 100) return null;
    const row = db
      .prepare(
        "SELECT u.id, u.username, u.role, s.csrf_token FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token_hash = ? AND s.expires_at > ?",
      )
      .get(tokenHash(token), Date.now());
    return row
      ? {
          user: { id: row.id, username: row.username, role: row.role },
          csrfToken: row.csrf_token,
        }
      : null;
  }
  return {
    db,
    filename,
    snapshot,
    commit,
    expireDoors,
    createUser,
    authenticate,
    createSession,
    session,
    userCount: () =>
      db.prepare("SELECT COUNT(*) AS count FROM users").get().count,
    deleteSession: (token) =>
      db
        .prepare("DELETE FROM sessions WHERE token_hash = ?")
        .run(tokenHash(token)),
    close: () => db.close(),
  };
}
