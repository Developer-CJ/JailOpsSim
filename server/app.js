import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { timingSafeEqual } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { configuration } from "./config.js";
import { ApiError, openDatabase } from "./database.js";
import { actionSchema, validateAction } from "./actions.js";

const cookieName = "jailops_session";
function readCookie(req) {
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${cookieName}=`));
  return cookie?.slice(cookieName.length + 1);
}
export function createApplication(overrides = {}) {
  const config = configuration(overrides),
    store = openDatabase(config.dataDir),
    app = express();
  const logDir = path.join(config.dataDir, "logs");
  mkdirSync(logDir, { recursive: true });
  const log = (level, message) => {
    const record = JSON.stringify({
      time: new Date().toISOString(),
      level,
      message,
    });
    appendFileSync(
      path.join(logDir, `server-${new Date().toISOString().slice(0, 10)}.log`),
      record + "\n",
    );
    if (level === "error") console.error(message);
  };
  app.disable("x-powered-by");
  if (config.trustProxy) app.set("trust proxy", "loopback");
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "style-src": ["'self'", "'unsafe-inline'"],
          "upgrade-insecure-requests": null,
        },
      },
    }),
  );
  app.use(express.json({ limit: "128kb" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", (req, _res, next) => {
    const origin = req.get("origin");
    if (origin) {
      try {
        if (new URL(origin).host !== req.get("host")) throw new Error();
      } catch {
        return next(
          new ApiError(403, "Cross-origin requests are not permitted."),
        );
      }
    }
    req.auth = store.session(readCookie(req));
    next();
  });
  const authenticate = (req, _res, next) =>
    req.auth ? next() : next(new ApiError(401, "Sign in to continue."));
  const csrf = (req, _res, next) => {
    const actual = Buffer.from(req.get("X-CSRF-Token") || ""),
      expected = Buffer.from(req.auth?.csrfToken || "");
    if (
      !actual.length ||
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    )
      return next(
        new ApiError(
          403,
          "The session verification token is invalid. Reload and try again.",
        ),
      );
    next();
  };
  app.get("/api/health", (_req, res) => {
    store.db.prepare("SELECT 1").get();
    res.json({ status: "ok", service: "JailOpsSim", version: "2.0.0" });
  });
  app.get("/api/session", (req, res) =>
    res.json({
      user: req.auth?.user ?? null,
      csrfToken: req.auth?.csrfToken ?? null,
      configured: store.userCount() > 0,
    }),
  );
  app.post(
    "/api/login",
    rateLimit({
      windowMs: 15 * 60000,
      limit: config.loginLimit,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: { error: "Too many sign-in attempts. Try again in 15 minutes." },
    }),
    (req, res, next) => {
      const parsed = z
        .object({
          username: z.string().trim().min(1).max(40),
          password: z.string().min(1).max(128),
        })
        .strict()
        .safeParse(req.body);
      if (!parsed.success)
        return next(new ApiError(400, "Enter a username and password."));
      const user = store.authenticate(
        parsed.data.username,
        parsed.data.password,
      );
      if (!user)
        return next(
          new ApiError(401, "The username or password is incorrect."),
        );
      const oldToken = readCookie(req);
      if (oldToken) store.deleteSession(oldToken);
      const session = store.createSession(user.id, config.sessionHours);
      res.cookie(cookieName, session.token, {
        httpOnly: true,
        secure: config.secureCookies,
        sameSite: "strict",
        path: "/",
        maxAge: config.sessionHours * 3600000,
      });
      log("info", `Signed in: ${user.username}`);
      res.json({ user, csrfToken: session.csrfToken, configured: true });
    },
  );
  app.post("/api/logout", authenticate, csrf, (req, res) => {
    store.deleteSession(readCookie(req));
    res.clearCookie(cookieName, {
      path: "/",
      httpOnly: true,
      secure: config.secureCookies,
      sameSite: "strict",
    });
    res.status(204).end();
  });
  app.get("/api/state", authenticate, (req, res) => {
    const snapshot = store.snapshot(),
      tag = `"${snapshot.revision}"`;
    res.set("ETag", tag);
    if (req.get("If-None-Match") === tag) return res.status(304).end();
    res.json(snapshot);
  });
  app.post("/api/actions", authenticate, csrf, (req, res, next) => {
    const parsed = actionSchema.safeParse(req.body);
    if (!parsed.success)
      return next(
        new ApiError(
          400,
          "Invalid command. Check the required fields and supported values.",
        ),
      );
    const match = /^"?(\d+)"?$/.exec(req.get("If-Match") || "");
    if (!match || !Number.isSafeInteger(Number(match[1])))
      return next(
        new ApiError(
          428,
          "A workspace revision is required. Reload and try again.",
        ),
      );
    try {
      res.json(
        store.commit(
          parsed.data,
          Number(match[1]),
          req.auth.user.username,
          (s, a) => validateAction(s, a, req.auth.user),
        ),
      );
    } catch (error) {
      next(error);
    }
  });
  app.get("/api/audit", authenticate, (req, res) => {
    const offset = Math.max(0, Math.floor(Number(req.query.offset) || 0));
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(req.query.limit) || 50)),
    );
    const entries = store.db
      .prepare(
        "SELECT id, occurred_at AS time, actor, action, title, detail FROM audit ORDER BY rowid DESC LIMIT ? OFFSET ?",
      )
      .all(limit, offset);
    const { count } = store.db
      .prepare("SELECT COUNT(*) AS count FROM audit")
      .get();
    res.json({ entries, total: count, limit, offset });
  });
  app.use("/api", (_req, _res, next) =>
    next(new ApiError(404, "API endpoint not found.")),
  );
  app.use(
    express.static(config.distDir, {
      index: false,
      maxAge: "1h",
      setHeaders: (res, filename) => {
        if (filename.endsWith(".html"))
          res.setHeader("Cache-Control", "no-cache");
      },
    }),
  );
  app.get("/{*path}", (_req, res) => {
    const index = path.join(config.distDir, "index.html");
    if (!existsSync(index))
      return res
        .status(503)
        .type("text")
        .send(
          "React build is missing. Run npm run build before starting the production server.",
        );
    res.set("Cache-Control", "no-cache").sendFile(index);
  });
  app.use((error, _req, res, _next) => {
    const status =
      error.status === 413
        ? 413
        : error instanceof SyntaxError && error.status === 400
          ? 400
          : error.status || 500;
    if (status >= 500) log("error", `Request failed: ${error.message}`);
    res.status(status).json({
      error:
        status >= 500
          ? "The server could not complete the request. Check the server log."
          : status === 413
            ? "The request is too large."
            : error.message,
    });
  });
  // The server owns timers, so releases expire even when no browser is connected.
  store.expireDoors();
  const timer = setInterval(() => {
    try {
      store.expireDoors();
    } catch (error) {
      log("error", `Door timer failed: ${error.message}`);
    }
  }, 250);
  timer.unref();
  return {
    app,
    store,
    config,
    log,
    close: () => {
      clearInterval(timer);
      store.close();
    },
  };
}
