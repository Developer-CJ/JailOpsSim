import { createInterface } from "node:readline/promises";
import { emitKeypressEvents } from "node:readline";
import { configuration } from "../server/config.js";
import { openDatabase } from "../server/database.js";

async function hiddenQuestion(prompt) {
  process.stdout.write(prompt);
  emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.off("keypress", onKey);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };
    const onKey = (text, key = {}) => {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new Error("Account creation cancelled."));
      } else if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(value);
      } else if (key.name === "backspace") {
        if (value) {
          value = [...value].slice(0, -1).join("");
          process.stdout.write("\b \b");
        }
      } else if (
        text &&
        !key.ctrl &&
        !key.meta &&
        !text.includes("\u001b") &&
        value.length < 128
      ) {
        value += text;
        process.stdout.write("*");
      }
    };
    process.stdin.on("keypress", onKey);
  });
}
let store;
try {
  if (!process.stdin.isTTY)
    throw new Error(
      "Use an interactive terminal, or use windows/New-User.ps1. Passwords are never accepted as command-line arguments.",
    );
  const index = process.argv.indexOf("--role");
  const role = index >= 0 ? process.argv[index + 1] : "operator";
  if (!["admin", "operator"].includes(role))
    throw new Error("Role must be admin or operator.");
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const username = (await terminal.question("Username: ")).trim();
  terminal.close();
  const password = await hiddenQuestion("Password (12–128 characters): ");
  const confirmation = await hiddenQuestion("Confirm password: ");
  if (password !== confirmation)
    throw new Error("Passwords do not match. No account was created.");
  store = openDatabase(configuration().dataDir);
  const user = store.createUser(username, password, role);
  console.log(`Created ${user.role} account: ${user.username}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  store?.close();
}
