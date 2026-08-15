import test from "node:test";
import assert from "node:assert/strict";
import {
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
  assert.equal(firstReport.findings[0].launchPriority, null);
  assert.equal(firstReport.findings[0].issueStatus, null);
  assert.equal(firstReport.findings[0].location.category, "seo");
  assert.equal(
    firstReport.policyVersions.launchScore,
    LEGACY_LAUNCH_SCORE_POLICY_VERSION,
  );
  assert.equal(firstReport.policyVersions.launchPriority, null);
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
