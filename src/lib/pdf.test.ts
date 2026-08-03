import test from "node:test";
import assert from "node:assert/strict";
import { buildPdfReport, createPdfDownloadUrl } from "./pdf";

test("builds a PDF report payload from scan content", () => {
  const report = buildPdfReport("Launch Check", "Healthy", ["No issues"], ["desktop.png"]);

  assert.equal(report.title, "Launch Check");
  assert.equal(report.findings.length, 1);
  assert.match(createPdfDownloadUrl(report), /^data:text\/plain/);
});
