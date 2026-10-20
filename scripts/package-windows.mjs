import { ZipArchive } from "archiver";
import extract from "extract-zip";
import { createWriteStream, createReadStream } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import os from "node:os";

const root = fileURLToPath(new URL("../", import.meta.url));
const outputDir = path.resolve(process.argv[2] || path.join(root, "releases"));
const nodeVersion = "24.19.0";
const runtimeName = `node-v${nodeVersion}-win-x64.zip`;
const temporary = await mkdtemp(
  path.join(os.tmpdir(), "jailops-windows-package-"),
);
const stage = path.join(temporary, "JailOpsSim");
async function sha256(filename) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filename)) hash.update(chunk);
  return hash.digest("hex");
}
async function fetchOfficial(name, cached) {
  if (cached) {
    await stat(cached);
    return path.resolve(cached);
  }
  const filename = path.join(temporary, name);
  execFileSync(
    process.platform === "win32" ? "curl.exe" : "curl",
    [
      "--fail",
      "--silent",
      "--show-error",
      "--location",
      "--proto",
      "=https",
      "--tlsv1.2",
      "--max-time",
      "180",
      `https://nodejs.org/dist/v${nodeVersion}/${name}`,
      "-o",
      filename,
    ],
    { stdio: "inherit" },
  );
  return filename;
}
async function rejectNativeDependencies(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(
        `Unexpected symlink in production dependencies: ${filename}`,
      );
    if (entry.isDirectory()) await rejectNativeDependencies(filename);
    else if (entry.name.endsWith(".node"))
      throw new Error(
        `Platform-specific native dependency must be built for Windows: ${filename}`,
      );
  }
}
try {
  const manifestPath = await fetchOfficial(
    "SHASUMS256.txt",
    process.env.NODE_WINDOWS_SHASUMS,
  );
  const runtimeArchive = await fetchOfficial(
    runtimeName,
    process.env.NODE_WINDOWS_ARCHIVE,
  );
  const shasums = await readFile(manifestPath, "utf8");
  const expected = shasums
    .split(/\r?\n/)
    .find((line) => line.trim().endsWith(` ${runtimeName}`))
    ?.split(/\s+/)[0];
  const actual = await sha256(runtimeArchive);
  if (!expected || !/^[a-f0-9]{64}$/.test(expected) || actual !== expected)
    throw new Error(
      "Windows runtime checksum did not match the official Node.js manifest.",
    );
  await mkdir(stage, { recursive: true });
  for (const filename of [
    "package.json",
    "package-lock.json",
    "README.md",
    "index.html",
    "vite.config.ts",
    "tsconfig.json",
    "playwright.config.ts",
    ".nvmrc",
    ".gitignore",
    ".prettierignore",
    ".env.example",
    "Start.cmd",
    "Install.cmd",
  ])
    await cp(path.join(root, filename), path.join(stage, filename));
  for (const directory of [
    "dist",
    "src",
    "shared",
    "server",
    "windows",
    "docs",
    "scripts",
    "tests",
    "public",
  ])
    await cp(path.join(root, directory), path.join(stage, directory), {
      recursive: true,
    });
  const npmCli = process.env.npm_execpath;
  if (!npmCli || !npmCli.endsWith(".js"))
    throw new Error(
      "Run packaging through npm run package:windows so the npm CLI path is available.",
    );
  execFileSync(
    process.execPath,
    [
      npmCli,
      "ci",
      "--omit=dev",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      path.join(root, "..", ".cache", "npm"),
    ],
    { cwd: stage, stdio: "inherit" },
  );
  await rm(path.join(stage, "node_modules", ".bin"), {
    recursive: true,
    force: true,
  });
  await rejectNativeDependencies(path.join(stage, "node_modules"));
  const extracted = path.join(temporary, "node-runtime");
  await extract(runtimeArchive, { dir: extracted });
  await cp(
    path.join(extracted, `node-v${nodeVersion}-win-x64`),
    path.join(stage, "runtime"),
    { recursive: true },
  );
  await cp(
    manifestPath,
    path.join(stage, "runtime", "OFFICIAL-SHASUMS256.txt"),
  );
  await writeFile(
    path.join(stage, "DEPLOYMENT-MANIFEST.json"),
    JSON.stringify(
      {
        application: "JailOpsSim",
        version: "2.0.0",
        platform: "Windows Server x64",
        node: nodeVersion,
        runtimeArchive: runtimeName,
        runtimeArchiveSha256: actual,
        bundled: [
          "React production assets",
          "Node.js JavaScript API",
          "SQLite database engine (built into Node)",
          "production npm dependencies",
          "PowerShell deployment scripts",
          "application source",
        ],
        data: "No accounts, passwords, environment settings, or live databases are included. Run Install.cmd to initialize.",
        builtAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  await mkdir(outputDir, { recursive: true });
  const filename = `JailOpsSim-Windows-x64-v2.0.0.zip`,
    destination = path.join(outputDir, filename);
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const output = createWriteStream(destination);
  const closed = new Promise((resolve, reject) => {
    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
  });
  archive.pipe(output);
  archive.directory(stage, "JailOpsSim");
  await archive.finalize();
  await closed;
  const digest = await sha256(destination);
  await writeFile(destination + ".sha256", `${digest}  ${filename}\n`);
  console.log(
    JSON.stringify({
      zip: destination,
      bytes: (await stat(destination)).size,
      sha256: digest,
    }),
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
