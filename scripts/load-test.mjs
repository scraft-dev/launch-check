import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";

const baseUrl =
  process.argv[2] ?? process.env.BASE_URL ?? "http://127.0.0.1:3000";
const requests = Number(process.env.LOAD_REQUESTS ?? 50);
const concurrency = Math.min(Number(process.env.LOAD_CONCURRENCY ?? 5), 20);
const durations = [];
let failures = 0;
let nextRequest = 0;

async function worker() {
  while (nextRequest < requests) {
    nextRequest += 1;
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}/api/health`, {
        cache: "no-store",
      });
      if (!response.ok) failures += 1;
      else durations.push(performance.now() - startedAt);
    } catch {
      failures += 1;
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));
durations.sort((a, b) => a - b);
const percentile = (value) =>
  durations[
    Math.min(Math.ceil(durations.length * value) - 1, durations.length - 1)
  ] ?? Infinity;
const p95 = percentile(0.95);
assert.equal(failures, 0, `${failures} load-test requests failed`);
assert.ok(p95 < 1000, `p95 ${p95.toFixed(1)}ms exceeded the 1000ms budget`);
console.log(
  `Load test passed: ${durations.length} requests, concurrency ${concurrency}, p95 ${p95.toFixed(1)}ms.`,
);
