import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createApplication } from "../server/app.js";
import { testAdmin, testOperator } from "./credentials.js";

const dataDir = mkdtempSync(path.join(os.tmpdir(), "jailops-browser-tests-"));
const runtime = createApplication({
  dataDir,
  host: "127.0.0.1",
  port: 4173,
  secureCookies: false,
  loginLimit: 1000,
});
runtime.store.createUser(testAdmin.username, testAdmin.password, "admin");
runtime.store.createUser(
  testOperator.username,
  testOperator.password,
  "operator",
);
const server = runtime.app.listen(4173, "127.0.0.1", () =>
  console.log("Isolated full-stack test server ready."),
);
function stop() {
  server.close(() => {
    runtime.close();
    rmSync(dataDir, { recursive: true, force: true });
    process.exit(0);
  });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
