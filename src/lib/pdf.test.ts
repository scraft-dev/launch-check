import test from "node:test";
import assert from "node:assert/strict";
import { buildPdfReport, createPdfDownloadUrl } from "./pdf";

test("builds a PDF report payload from scan content", async () => {
  const report = await buildPdfReport("Launch Check", "Healthy", ["No issues"], ["desktop.png"]);

  assert.equal(report.title, "Launch Check");
  assert.equal(report.findings.length, 1);
  assert.match(createPdfDownloadUrl(report), /^data:application\/pdf/);

  const decoded = Buffer.from(report.pdfBase64, "base64");
  assert.match(decoded.toString("utf8"), /^%PDF-/);
});

test("embeds score details and screenshot images into the PDF payload", async () => {
  const report = await buildPdfReport(
    "Launch Check",
    "Healthy",
    ["No console errors", "No failed requests"],
    ["data:image/png;base64,desktop"],
    {
      score: 88,
      details: ["Performance: 92", "Accessibility: 95"],
    },
  );

  assert.equal(report.score, 88);
  assert.equal(report.details.length, 2);
  assert.match(report.pdfBase64, /^[A-Za-z0-9+/=]+$/);
  assert.match(createPdfDownloadUrl(report), /^data:application\/pdf/);

  const decoded = Buffer.from(report.pdfBase64, "base64");
  assert.match(decoded.toString("utf8"), /^%PDF-/);
});
