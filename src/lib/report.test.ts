import test from "node:test";
import assert from "node:assert/strict";
import {
  buildReportComparison,
  createReportSnapshot,
  LEGACY_LAUNCH_SCORE_POLICY_VERSION,
  REPORT_SCHEMA_VERSION,
} from "./report";
import type { ScanResponse } from "./scan";

const scanFixture: ScanResponse = {
  url: "https://example.com",
  finalUrl: "https://example.com/",
  pageTitle: "Example",
  httpStatus: 200,
  loadTime: 480,
  consoleErrors: ["ReferenceError: menu is not defined"],
  pageErrors: [],
  failedRequests: [],
  qualityFindings: [
    {
      id: "missing-title",
      category: "seo",
      severity: "high",
      title: "Page title is missing",
      detail: "The page has no title element.",
      recommendation: "Add a unique and descriptive title element.",
    },
  ],
};

test("creates a deterministic versioned Report from an existing scan result", () => {
  const input = {
    reportId: "report_demo_001",
    scannedAt: "2026-08-15T01:30:00+09:00",
    scanResult: scanFixture,
  };

  const firstReport = createReportSnapshot(input);
  const secondReport = createReportSnapshot(input);

  assert.deepEqual(firstReport, secondReport);
  assert.equal(firstReport.schemaVersion, REPORT_SCHEMA_VERSION);
  assert.equal(firstReport.reportId, "report_demo_001");
  assert.equal(firstReport.targetUrl, "https://example.com");
  assert.equal(firstReport.scannedAt, "2026-08-14T16:30:00.000Z");
  assert.equal(firstReport.launchScore, 82);
  assert.equal(firstReport.findings.length, 2);
  assert.equal(firstReport.findings[0].technicalSeverity, "high");
  assert.equal(firstReport.findings[0].launchPriority, "high");
  assert.equal(firstReport.findings[0].issueStatus, "open");
  assert.equal(firstReport.findings[0].location.category, "seo");
  assert.equal(
    firstReport.policyVersions.launchScore,
    LEGACY_LAUNCH_SCORE_POLICY_VERSION,
  );
  assert.equal(firstReport.policyVersions.launchPriority, "launch-priority-v1");
  assert.equal(firstReport.launchDecision, "ready");
});

test("compares rescans using stable finding fingerprints and priority deltas", () => {
  const previous = createReportSnapshot({
    reportId: "report_previous",
    scannedAt: "2026-08-15T00:00:00.000Z",
    scanResult: scanFixture,
  });
  const current = createReportSnapshot({
    reportId: "report_current",
    scannedAt: "2026-08-15T01:00:00.000Z",
    scanResult: { ...scanFixture, consoleErrors: [], qualityFindings: [] },
  });

  const comparison = buildReportComparison(previous, current);
  assert.equal(comparison.fixed, 2);
  assert.equal(comparison.new, 0);
  assert.equal(comparison.remaining, 0);
  assert.deepEqual(comparison.priorityDelta.high, {
    previous: 1,
    current: 0,
    change: -1,
  });
});

test("does not mutate the existing scan response while adapting it", () => {
  const original = structuredClone(scanFixture);

  createReportSnapshot({
    reportId: "report_demo_002",
    scannedAt: "2026-08-15T00:00:00.000Z",
    scanResult: scanFixture,
  });

  assert.deepEqual(scanFixture, original);
});

test("requires an explicit report id and valid scan timestamp", () => {
  assert.throws(
    () =>
      createReportSnapshot({
        reportId: " ",
        scannedAt: "2026-08-15T00:00:00.000Z",
        scanResult: scanFixture,
      }),
    /reportId is required/,
  );

  assert.throws(
    () =>
      createReportSnapshot({
        reportId: "report_demo_003",
        scannedAt: "not-a-date",
        scanResult: scanFixture,
      }),
    /scannedAt must be a valid timestamp/,
  );
});
