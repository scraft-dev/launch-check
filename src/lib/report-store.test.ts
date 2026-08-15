import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createReportSnapshot } from "./report";
import { JsonReportRepository } from "./report-store";
import type { ScanResponse } from "./scan";

const scan: ScanResponse = {
  url: "https://example.com",
  finalUrl: "https://example.com/",
  pageTitle: "Example",
  httpStatus: 500,
  loadTime: 800,
  consoleErrors: [],
  pageErrors: [],
  failedRequests: [],
};

test("persists Reports and updates finding status without changing evidence", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "launch-report-"));
  try {
    const repository = new JsonReportRepository(
      path.join(directory, "reports.json"),
    );
    const report = createReportSnapshot({
      reportId: "report_store_001",
      scannedAt: "2026-08-15T00:00:00.000Z",
      scanResult: scan,
      workspaceId: "workspace-1",
    });
    await repository.save(report);

    const stored = await repository.get(report.reportId);
    assert.deepEqual(stored, report);
    const originalEvidence = stored?.findings[0].evidence;

    const updated = await repository.updateFindingStatus({
      reportId: report.reportId,
      findingId: report.findings[0].id,
      status: "fixed",
      actorId: "user-1",
      updatedAt: "2026-08-15T01:00:00.000Z",
    });
    assert.equal(updated?.findings[0].issueStatus, "fixed");
    assert.equal(updated?.findings[0].statusActorId, "user-1");
    assert.equal(updated?.findings[0].evidence, originalEvidence);
    assert.equal(
      (await repository.list({ workspaceId: "workspace-1" })).length,
      1,
    );
    assert.equal(
      (await repository.list({ workspaceId: "workspace-2" })).length,
      0,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
