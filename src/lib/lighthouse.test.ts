import test from "node:test";
import assert from "node:assert/strict";
import { buildLighthouseAudit } from "./lighthouse";

test("builds lighthouse scores and opportunities from scan results", () => {
  const audit = buildLighthouseAudit({
    url: "https://example.com",
    finalUrl: "https://example.com",
    pageTitle: "Example",
    httpStatus: 200,
    loadTime: 1200,
    consoleErrors: ["console error"],
    pageErrors: [],
    failedRequests: [
      {
        url: "https://example.com/app.js",
        resourceType: "script",
        status: 404,
        error: "Not Found",
      },
    ],
  });

  assert.equal(audit.performance, 78);
  assert.equal(audit.accessibility, 88);
  assert.equal(audit.bestPractices, 82);
  assert.equal(audit.seo, 90);
  assert.match(audit.opportunities[0].title, /console/i);
});
