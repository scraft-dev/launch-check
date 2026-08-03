import assert from "node:assert/strict";
import test from "node:test";
import { buildReadinessReport } from "./readiness";

test("is ready in development without optional integrations", () => {
  const report = buildReadinessReport({ NODE_ENV: "development" });
  assert.equal(report.status, "ready");
  assert.equal(report.version, "1.0.0");
});

test("requires an HTTPS public URL in production", () => {
  assert.equal(
    buildReadinessReport({ NODE_ENV: "production" }).status,
    "not_ready",
  );
  assert.equal(
    buildReadinessReport({
      NODE_ENV: "production",
      APP_URL: "https://launch.example.com",
    }).status,
    "ready",
  );
});

test("reports optional integrations without revealing secrets", () => {
  const report = buildReadinessReport({
    NODE_ENV: "production",
    APP_URL: "https://launch.example.com",
    SLACK_BOT_TOKEN: "xoxb-secret",
    SLACK_CHANNEL_ID: "C123",
  });
  assert.equal(
    report.checks.find((check) => check.id === "slack")?.ready,
    true,
  );
  assert.doesNotMatch(JSON.stringify(report), /xoxb-secret/);
});
