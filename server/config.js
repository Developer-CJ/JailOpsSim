import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const projectRoot = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(projectRoot, ".env"), quiet: true });
export function configuration(overrides = {}) {
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("PORT must be between 1 and 65535.");
  return {
    host: process.env.HOST || "127.0.0.1",
    port,
    dataDir: path.resolve(projectRoot, process.env.DATA_DIR || "data"),
    distDir: path.join(projectRoot, "dist"),
    secureCookies: process.env.COOKIE_SECURE === "true",
    trustProxy: process.env.TRUST_PROXY === "loopback",
    sessionHours: 8,
    loginLimit: 10,
    ...overrides,
  };
}
