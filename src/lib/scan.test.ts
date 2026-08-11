import test from "node:test";
import assert from "node:assert/strict";
import {
  buildScanReport,
  exportScanReport,
  getUrlValidationError,
  getUserFriendlyScanError,
  normalizeWebsiteUrl,
  type ScanResponse,
} from "./scan";

test("adds https to website addresses without a protocol", () => {
  assert.equal(normalizeWebsiteUrl("example.com"), "https://example.com");
  assert.equal(
    normalizeWebsiteUrl(" https://example.com/path "),
    "https://example.com/path",
  );
});

test("accepts valid public http URLs", () => {
  assert.equal(getUrlValidationError("https://example.com"), null);
  assert.equal(getUrlValidationError("http://example.com"), null);
});

test("rejects invalid URLs", () => {
  assert.equal(
    getUrlValidationError("not-a-url"),
    "Enter a valid website URL.",
  );
  assert.equal(
    getUrlValidationError("file:///tmp/test"),
    "Enter a valid website URL.",
  );
});

test("rejects private IP hosts", () => {
  assert.equal(
    getUrlValidationError("http://127.0.0.1"),
    "Enter a valid website URL.",
  );
  assert.equal(
    getUrlValidationError("https://192.168.1.10"),
    "Enter a valid website URL.",
  );
});

test("maps common scan errors to user-friendly messages", () => {
  assert.equal(
    getUserFriendlyScanError("net::ERR_NAME_NOT_RESOLVED"),
    "The website could not be reached. Check the URL and try again.",
  );
  assert.equal(
    getUserFriendlyScanError("SSL certificate problem"),
    "SSL verification failed. Try a different URL.",
  );
  assert.equal(
    getUserFriendlyScanError("browser launch failed"),
    "The browser could not be launched for scanning.",
  );
});

test("builds a report with score, severity counts, and export JSON", () => {
  const sampleScan: ScanResponse = {
    url: "https://example.com",
    finalUrl: "https://example.com",
    pageTitle: "Example",
    httpStatus: 200,
    loadTime: 1320,
    consoleErrors: ["console error"],
    pageErrors: ["runtime error"],
    failedRequests: [
      {
        url: "https://example.com/app.js",
        resourceType: "script",
        status: 404,
        error: "Not Found",
      },
    ],
    qualityFindings: [
      {
        id: "missing-title",
        category: "seo",
        severity: "high",
        title: "Page title is missing",
        detail: "The page has no title.",
        recommendation: "Add a descriptive title.",
      },
    ],
  };

  const report = buildScanReport(sampleScan);
  assert.equal(report.launchScore, 66);
  assert.equal(report.severitySummary.high, 1);
  assert.equal(report.severitySummary.medium, 2);
  assert.equal(report.severitySummary.low, 1);
  assert.equal(report.performance.loadTimeLabel, "1.3s");
  assert.equal(report.issues[0].severity, "high");
  assert.match(exportScanReport(sampleScan), /"launchScore": 66/);
});

test("includes findings and broken links from crawled pages without duplicating the main page", () => {
  const sampleScan: ScanResponse = {
    url: "https://example.com",
    finalUrl: "https://example.com/",
    pageTitle: "Example",
    httpStatus: 200,
    loadTime: 400,
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    qualityFindings: [],
    crawlResult: {
      queueLength: 3,
      scannedPages: 3,
      brokenPages: 1,
      totalFindings: 2,
      summary: "3 internal pages scanned.",
      pages: [
        {
          url: "https://example.com/#top",
          title: "Example",
          status: 200,
          findings: [
            {
              id: "main-duplicate",
              category: "seo",
              severity: "low",
              title: "Main page duplicate",
              detail: "Should not be counted twice.",
              recommendation: "None.",
            },
          ],
        },
        {
          url: "https://example.com/about",
          title: "About",
          status: 200,
          findings: [
            {
              id: "missing-description",
              category: "seo",
              severity: "medium",
              title: "Meta description is missing",
              detail: "No description.",
              recommendation: "Add a description.",
            },
          ],
        },
        {
          url: "https://example.com/missing",
          title: "",
          status: 404,
          findings: [],
        },
      ],
    },
  };

  const report = buildScanReport(sampleScan);
  assert.equal(report.launchScore, 77);
  assert.equal(report.severitySummary.high, 1);
  assert.equal(report.severitySummary.medium, 1);
  assert.equal(report.severitySummary.low, 0);
  assert.equal(report.issues.length, 2);
  assert.equal(report.issues[0].pageUrl, "https://example.com/missing");
  assert.equal(report.issues[1].pageUrl, "https://example.com/about");
});
