import test from "node:test";
import assert from "node:assert/strict";
import {
  buildQualityFindings,
  type PageQualitySnapshot,
} from "./quality-checks";

function healthySnapshot(): PageQualitySnapshot {
  return {
    title: "A descriptive example page title",
    metaDescription:
      "A useful, page-specific description that clearly explains the purpose of this example page and helps visitors understand what they will find before opening it.",
    language: "en",
    h1Count: 1,
    imageCount: 2,
    imagesMissingAlt: 0,
    formControlCount: 1,
    unlabeledFormControls: 0,
    hasViewportMeta: true,
    mixedContentCount: 0,
    canonicalUrl: "https://example.com/",
    isNoIndex: false,
    linkCount: 2,
    unlabeledLinks: 0,
  };
}

test("returns no findings for a healthy page snapshot", () => {
  assert.deepEqual(buildQualityFindings(healthySnapshot()), []);
});

test("detects actionable SEO and accessibility problems", () => {
  const findings = buildQualityFindings({
    ...healthySnapshot(),
    title: "",
    metaDescription: "",
    language: "",
    h1Count: 0,
    imagesMissingAlt: 2,
    unlabeledFormControls: 1,
    hasViewportMeta: false,
    mixedContentCount: 1,
    canonicalUrl: "",
    isNoIndex: true,
    unlabeledLinks: 1,
  });

  assert.ok(findings.some((finding) => finding.id === "missing-title"));
  assert.ok(findings.some((finding) => finding.id === "missing-image-alt"));
  assert.ok(findings.some((finding) => finding.id === "missing-canonical"));
  assert.ok(findings.some((finding) => finding.id === "page-noindex"));
  assert.ok(findings.some((finding) => finding.id === "unlabeled-links"));
  assert.ok(findings.some((finding) => finding.severity === "critical"));
  assert.ok(findings.every((finding) => finding.recommendation.length > 0));
});
