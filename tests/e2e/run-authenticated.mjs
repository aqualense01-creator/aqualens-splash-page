import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const env = { ...process.env, E2E_REQUIRE_AUTH: "1" };

function loadEnvFile(path) {
  const file = resolve(path);
  if (!existsSync(file)) return;

  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    if (key && env[key] == null) env[key] = value;
  }
}

loadEnvFile(".env.e2e.local");

const required = ["E2E_EMAIL", "E2E_PASSWORD", "E2E_ADMIN_EMAIL", "E2E_ADMIN_PASSWORD"];
const missing = required.filter((key) => !env[key]);

if (missing.length > 0) {
  console.error("Authenticated E2E credentials are missing.");
  console.error(`Missing: ${missing.join(", ")}`);
  console.error("Create .env.e2e.local from .env.e2e.example, then run this command again.");
  process.exit(1);
}

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(command, ["playwright", "test"], {
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    console.error(`Authenticated E2E run stopped by ${signal}.`);
    process.exit(1);
  }
  process.exit(code ?? 1);
});
