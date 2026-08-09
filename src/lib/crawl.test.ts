import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCrawlResult,
  getSafeCrawlConfig,
  normalizeAndDeduplicateUrls,
} from "./crawl";

test("normalizes and deduplicates internal URLs", () => {
  const urls = normalizeAndDeduplicateUrls("https://example.com/docs", [
    "https://example.com/docs",
    "/about",
    "https://example.com/docs#section",
    "https://example.org/blocked",
  ]);

  assert.deepEqual(urls, [
    "https://example.com/docs",
    "https://example.com/about",
  ]);
});

test("caps crawl config to safe limits", () => {
  const config = getSafeCrawlConfig(999);
  assert.equal(config.maxPages, 10);
  assert.equal(config.maxDepth, 2);
});

test("builds a crawl summary from discovered pages", () => {
  const result = buildCrawlResult(
    ["https://example.com"],
    [
      { url: "https://example.com", title: "Home", status: 200 },
      { url: "https://example.com/about", title: "About", status: 200 },
    ],
  );

  assert.equal(result.queueLength, 1);
  assert.equal(result.scannedPages, 2);
  assert.equal(result.brokenPages, 0);
  assert.match(result.summary, /2 internal pages scanned/i);
});

test("summarizes broken pages and page findings", () => {
  const result = buildCrawlResult(
    ["https://example.com", "https://example.com/missing"],
    [
      { url: "https://example.com", title: "Home", status: 200 },
      {
        url: "https://example.com/missing",
        title: "Missing",
        status: 404,
        findings: [
          {
            id: "missing-title",
            category: "seo",
            severity: "high",
            title: "Page title is missing",
            detail: "No title",
            recommendation: "Add a title",
          },
        ],
      },
    ],
  );

  assert.equal(result.brokenPages, 1);
  assert.equal(result.totalFindings, 1);
});
