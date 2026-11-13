import { createApplication } from "./app.js";

const runtime = createApplication();
const server = runtime.app.listen(
  runtime.config.port,
  runtime.config.host,
  () => {
    runtime.log(
      "info",
      `Server started on ${runtime.config.host}:${runtime.config.port}`,
    );
    console.log(
      `JailOpsSim server listening on ${runtime.config.host}:${runtime.config.port}`,
    );
    if (!runtime.store.userCount())
      console.log(
        "No accounts configured. Run windows/Install.ps1 or windows/New-User.ps1 to create an administrator.",
      );
  },
);
server.on("error", (error) => {
  console.error(`Server startup failed: ${error.message}`);
  runtime.close();
  process.exitCode = 1;
});
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  server.close(() => {
    runtime.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
