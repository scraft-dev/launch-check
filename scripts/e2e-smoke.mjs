import assert from "node:assert/strict";

const baseUrl =
  process.argv[2] ?? process.env.BASE_URL ?? "http://127.0.0.1:3000";
const routes = ["/", "/dashboard", "/pricing", "/docs", "/api/health"];

for (const route of routes) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
  assert.ok(
    response.status >= 200 && response.status < 400,
    `${route} returned ${response.status}`,
  );
}

const health = await fetch(`${baseUrl}/api/health`).then((response) =>
  response.json(),
);
assert.equal(health.status, "ok");
assert.equal(health.version, "1.0.0");
console.log(`E2E smoke test passed for ${routes.length} critical routes.`);
