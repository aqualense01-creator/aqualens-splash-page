#!/usr/bin/env node

const DEFAULT_ROUTES = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-otp",
  "/activate-account",
  "/app/dashboard",
  "/app/live",
  "/app/farms",
  "/app/devices",
  "/app/setup",
  "/app/maintenance",
  "/app/alerts",
  "/app/reports",
  "/app/settings",
  "/admin/dashboard",
  "/admin/farms",
  "/admin/devices",
  "/admin/users",
  "/admin/alerts",
  "/admin/support",
  "/admin/settings",
];

const ACCEPTABLE_STATUSES = new Set([200, 204, 301, 302, 303, 307, 308, 401, 403]);

const config = {
  baseUrl: envString("LOAD_BASE_URL", "http://127.0.0.1:5173"),
  durationMs: envNumber("LOAD_DURATION_MS", envNumber("LOAD_DURATION_SECONDS", 15) * 1000),
  concurrency: envNumber("LOAD_CONCURRENCY", 4),
  timeoutMs: envNumber("LOAD_TIMEOUT_MS", 8000),
  maxP95Ms: envNumber("LOAD_MAX_P95_MS", 5000),
  maxErrorRate: envNumber("LOAD_MAX_ERROR_RATE", 0),
  routes: envList("LOAD_ROUTES", DEFAULT_ROUTES),
};

validateConfig(config);

const startedAt = Date.now();
const deadline = startedAt + config.durationMs;
const routeStats = new Map(config.routes.map((route) => [route, createStats()]));
const overall = createStats();
let nextRouteIndex = 0;

console.log("Acqua Lence load smoke");
console.log(`Base URL:      ${config.baseUrl}`);
console.log(`Duration:      ${Math.round(config.durationMs / 1000)}s`);
console.log(`Concurrency:   ${config.concurrency}`);
console.log(`Timeout:       ${config.timeoutMs}ms`);
console.log(`P95 threshold: ${config.maxP95Ms}ms`);
console.log(`Routes:        ${config.routes.length}`);
console.log("");

await warmup(config.routes);
await Promise.all(Array.from({ length: config.concurrency }, (_, index) => worker(index)));

const elapsedMs = Date.now() - startedAt;
const summary = summarize(overall);
const failures = collectFailures(summary);

printSummary(summary, elapsedMs);
printRouteBreakdown();

if (failures.length > 0) {
  console.log("");
  console.error("Result: FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("");
  console.log("Result: PASS");
}

async function warmup(routes) {
  console.log("Warming routes...");
  const results = await Promise.all(routes.map((route) => hit(route, { record: false })));
  const failed = results.filter((result) => result.kind !== "ok");
  if (failed.length > 0) {
    console.log(
      `Warmup completed with ${failed.length} non-fatal issue(s); measured run will enforce failures.`,
    );
  } else {
    console.log("Warmup completed.");
  }
  console.log("");
}

async function worker(workerIndex) {
  while (Date.now() < deadline) {
    const route = config.routes[nextRouteIndex++ % config.routes.length];
    await hit(route, { workerIndex, record: true });
  }
}

async function hit(route, options) {
  const url = new URL(route, config.baseUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "Cache-Control": "no-store",
        "User-Agent": "acqua-lence-load-smoke/1.0",
      },
    });
    const latencyMs = performance.now() - started;
    await response.arrayBuffer();

    const kind = ACCEPTABLE_STATUSES.has(response.status) ? "ok" : "unexpected_status";
    if (options.record) {
      record(route, {
        kind,
        latencyMs,
        status: response.status,
      });
    }
    return { kind, status: response.status, latencyMs };
  } catch (error) {
    const latencyMs = performance.now() - started;
    const kind = error?.name === "AbortError" ? "timeout" : "network_error";
    if (options.record) {
      record(route, {
        kind,
        latencyMs,
        status: kind,
      });
    }
    return { kind, latencyMs };
  } finally {
    clearTimeout(timeout);
  }
}

function record(route, sample) {
  addSample(overall, sample);
  addSample(routeStats.get(route), sample);
}

function addSample(stats, sample) {
  stats.total += 1;
  stats.latencies.push(sample.latencyMs);
  stats.statusCounts.set(sample.status, (stats.statusCounts.get(sample.status) ?? 0) + 1);
  if (sample.kind === "timeout") stats.timeouts += 1;
  if (sample.kind === "network_error") stats.networkErrors += 1;
  if (sample.kind === "unexpected_status") stats.unexpectedStatuses += 1;
  if (typeof sample.status === "number" && sample.status >= 500) stats.serverErrors += 1;
}

function createStats() {
  return {
    total: 0,
    latencies: [],
    statusCounts: new Map(),
    timeouts: 0,
    networkErrors: 0,
    unexpectedStatuses: 0,
    serverErrors: 0,
  };
}

function summarize(stats) {
  const sorted = [...stats.latencies].sort((a, b) => a - b);
  return {
    ...stats,
    min: percentile(sorted, 0),
    p50: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    max: percentile(sorted, 1),
    errorRate: stats.total === 0 ? 1 : errorCount(stats) / stats.total,
  };
}

function percentile(sorted, percentileValue) {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1);
  return sorted[Math.max(0, index)];
}

function errorCount(stats) {
  return stats.serverErrors + stats.timeouts + stats.networkErrors + stats.unexpectedStatuses;
}

function collectFailures(summary) {
  const failures = [];
  if (summary.total === 0) failures.push("no requests completed");
  if (summary.serverErrors > 0) failures.push(`${summary.serverErrors} request(s) returned 5xx`);
  if (summary.timeouts > 0) failures.push(`${summary.timeouts} request(s) timed out`);
  if (summary.networkErrors > 0)
    failures.push(`${summary.networkErrors} request(s) had network errors`);
  if (summary.unexpectedStatuses > 0)
    failures.push(`${summary.unexpectedStatuses} request(s) returned unexpected statuses`);
  if (summary.p95 > config.maxP95Ms)
    failures.push(`p95 ${formatMs(summary.p95)} exceeded ${config.maxP95Ms}ms`);
  if (summary.errorRate > config.maxErrorRate) {
    failures.push(
      `error rate ${formatPercent(summary.errorRate)} exceeded ${formatPercent(config.maxErrorRate)}`,
    );
  }
  return failures;
}

function printSummary(summary, elapsedMs) {
  console.log("Summary");
  console.log(`Requests:      ${summary.total}`);
  console.log(`Rate:          ${formatNumber((summary.total / elapsedMs) * 1000)} req/s`);
  console.log(
    `Latency:       min ${formatMs(summary.min)} | p50 ${formatMs(summary.p50)} | p90 ${formatMs(summary.p90)} | p95 ${formatMs(summary.p95)} | p99 ${formatMs(summary.p99)} | max ${formatMs(summary.max)}`,
  );
  console.log(`Status counts: ${formatStatusCounts(summary.statusCounts)}`);
  console.log(`Error rate:    ${formatPercent(summary.errorRate)}`);
}

function printRouteBreakdown() {
  console.log("");
  console.log("Route breakdown");
  console.log("route                         requests  p50     p95     statuses");
  for (const route of config.routes) {
    const summary = summarize(routeStats.get(route));
    console.log(
      `${pad(route, 29)} ${padLeft(summary.total, 8)}  ${padLeft(formatMs(summary.p50), 6)}  ${padLeft(formatMs(summary.p95), 6)}  ${formatStatusCounts(summary.statusCounts)}`,
    );
  }
}

function formatStatusCounts(statusCounts) {
  if (statusCounts.size === 0) return "-";
  return [...statusCounts.entries()]
    .sort(([a], [b]) => String(a).localeCompare(String(b), undefined, { numeric: true }))
    .map(([status, count]) => `${status}:${count}`)
    .join(", ");
}

function envString(name, fallback) {
  return process.env[name]?.trim() || fallback;
}

function envNumber(name, fallback) {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number`);
  return value;
}

function envList(name, fallback) {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  return raw
    .split(",")
    .map((route) => route.trim())
    .filter(Boolean);
}

function validateConfig(value) {
  if (!URL.canParse(value.baseUrl)) throw new Error("LOAD_BASE_URL must be a valid URL");
  if (value.durationMs <= 0) throw new Error("LOAD_DURATION_MS must be greater than 0");
  if (!Number.isInteger(value.concurrency) || value.concurrency <= 0) {
    throw new Error("LOAD_CONCURRENCY must be a positive integer");
  }
  if (value.timeoutMs <= 0) throw new Error("LOAD_TIMEOUT_MS must be greater than 0");
  if (value.maxP95Ms <= 0) throw new Error("LOAD_MAX_P95_MS must be greater than 0");
  if (value.maxErrorRate < 0 || value.maxErrorRate > 1) {
    throw new Error("LOAD_MAX_ERROR_RATE must be between 0 and 1");
  }
  if (value.routes.length === 0) throw new Error("LOAD_ROUTES must include at least one route");
}

function formatMs(value) {
  return `${Math.round(value)}ms`;
}

function formatPercent(value) {
  return `${formatNumber(value * 100)}%`;
}

function formatNumber(value) {
  return value.toFixed(2);
}

function pad(value, length) {
  return String(value).padEnd(length);
}

function padLeft(value, length) {
  return String(value).padStart(length);
}
