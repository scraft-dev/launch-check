import test from "node:test";
import assert from "node:assert/strict";
import {
  buildFallbackAnalysis,
  buildAnalysisPrompt,
  trimAnalysisPayload,
} from "./ai-analysis";

test("builds a concise fallback analysis for common issues", () => {
  const analysis = buildFallbackAnalysis({
    url: "https://example.com",
    finalUrl: "https://example.com",
    pageTitle: "Example",
    httpStatus: 404,
    loadTime: 2200,
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

  assert.match(analysis.summary, /HTTP 404/i);
  assert.ok(analysis.suggestions.length > 0);
});

test("creates a compact prompt and trims payload for token efficiency", () => {
  const prompt = buildAnalysisPrompt({
    url: "https://example.com",
    finalUrl: "https://example.com",
    pageTitle: "Example",
    httpStatus: 200,
    loadTime: 1800,
    consoleErrors: ["one", "two", "three"],
    pageErrors: ["runtime error"],
    failedRequests: [
      {
        url: "https://example.com/app.js",
        resourceType: "script",
        status: 404,
        error: "Not Found",
      },
    ],
  });

  assert.ok(prompt.includes("Launch Check"));
  const trimmed = trimAnalysisPayload(prompt);
  assert.ok(trimmed.length <= 600);
});
