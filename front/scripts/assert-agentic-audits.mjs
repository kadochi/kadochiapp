import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const baseUrl = new URL(
  process.env.AUDIT_BASE_URL || "http://localhost:3000",
);
const productPath = process.env.AUDIT_PRODUCT_PATH || "/product/1114";
const routes = ["/", "/products", productPath, "/magazine"];
const profiles = ["mobile", "desktop"];
const isLocal =
  baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1";
const lighthouseBin = path.join(
  process.cwd(),
  "node_modules",
  ".bin",
  "lighthouse",
);
const workingDirectory = await mkdtemp(
  path.join(tmpdir(), "kadochi-agentic-audit-"),
);
let server;

async function isReady() {
  try {
    const response = await fetch(baseUrl, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function startLocalServer() {
  if (!isLocal || (await isReady())) return;

  const { spawn } = await import("node:child_process");
  server = spawn(
    "npm",
    ["run", "start", "--", "-p", baseUrl.port || "3000"],
    { cwd: process.cwd(), stdio: "ignore" },
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (await isReady()) return;
  }
  throw new Error("The local production server did not become ready.");
}

try {
  await startLocalServer();
  const failures = [];

  for (const profile of profiles) {
    for (const route of routes) {
      const url = new URL(route, baseUrl).toString();
      const outputPath = path.join(
        workingDirectory,
        `${profile}-${route.replaceAll("/", "_") || "home"}.json`,
      );
      const args = [
        url,
        "--only-categories=agentic-browsing",
        "--output=json",
        `--output-path=${outputPath}`,
        "--quiet",
        "--chrome-flags=--headless=new --no-sandbox",
      ];
      if (profile === "desktop") args.push("--preset=desktop");
      await execFileAsync(lighthouseBin, args, { maxBuffer: 10_000_000 });

      const report = JSON.parse(await readFile(outputPath, "utf8"));
      const countedAudits = report.categories["agentic-browsing"].auditRefs
        .filter((audit) => audit.weight > 0)
        .map((audit) => ({
          id: audit.id,
          score: report.audits[audit.id]?.score,
        }));
      const required = new Map(
        countedAudits.map((audit) => [audit.id, audit.score]),
      );
      const passed =
        required.get("agent-accessibility-tree") === 1 &&
        required.get("cumulative-layout-shift") === 1;

      process.stdout.write(
        `${profile} ${url}: ${countedAudits.filter((audit) => audit.score === 1).length}/${countedAudits.length}\n`,
      );
      if (!passed) failures.push(`${profile} ${url}`);
    }
  }

  if (failures.length) {
    throw new Error(`Agentic Browsing failed for: ${failures.join(", ")}`);
  }
} finally {
  server?.kill("SIGTERM");
  await rm(workingDirectory, { recursive: true, force: true });
}
