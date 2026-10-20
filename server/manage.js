import { mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import { configuration } from "./config.js";
import { openDatabase } from "./database.js";

const store = openDatabase(configuration().dataDir);
try {
  const command = process.argv[2];
  if (command === "status")
    console.log(
      JSON.stringify({
        database: store.filename,
        users: store.userCount(),
        revision: store.snapshot().revision,
      }),
    );
  else if (command === "create-user") {
    process.stdin.setEncoding("utf8");
    let input = "";
    for await (const chunk of process.stdin) {
      input += chunk;
      if (input.length > 4096) throw new Error("Account input is too large.");
    }
    const account = JSON.parse(input.replace(/^\uFEFF/, ""));
    const user = store.createUser(
      account.username,
      account.password,
      account.role || "operator",
    );
    console.log(`Created ${user.role} account: ${user.username}`);
  } else if (command === "backup") {
    if (!process.argv[3]) throw new Error("Supply a destination filename.");
    const destination = path.resolve(process.argv[3]);
    if (existsSync(destination))
      throw new Error(
        "The backup destination already exists. Choose a new filename.",
      );
    mkdirSync(path.dirname(destination), { recursive: true });
    store.db.prepare("VACUUM INTO ?").run(destination);
    console.log(`Consistent SQLite backup created: ${destination}`);
  } else
    throw new Error(
      "Commands: status | create-user (JSON on stdin) | backup <destination.sqlite>",
    );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  store.close();
}
