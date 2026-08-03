import test from "node:test";
import assert from "node:assert/strict";
import {
  createScreenshotArtifacts,
  loadStoredScreenshotArtifacts,
  persistScreenshotArtifacts,
  pruneScreenshotArtifacts,
} from "./screenshots";

test("creates desktop and mobile screenshot artifacts", () => {
  const artifacts = createScreenshotArtifacts("https://example.com");
  assert.equal(artifacts.length, 2);
  assert.equal(artifacts[0].kind, "desktop");
  assert.equal(artifacts[1].kind, "mobile");
});

test("prunes screenshot artifacts to the configured maximum", () => {
  const artifacts = pruneScreenshotArtifacts(
    Array.from({ length: 10 }, (_, index) => ({
      id: `${index}`,
      kind: index % 2 === 0 ? "desktop" : "mobile",
      url: "https://example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      note: "sample",
    })),
    8,
  );

  assert.equal(artifacts.length, 8);
});

test("persists screenshot artifacts to storage and reloads them", () => {
  const storage = new Map<string, string>();
  const artifacts = createScreenshotArtifacts("https://example.com", {
    desktop: "data:image/png;base64,desktop",
    mobile: "data:image/png;base64,mobile",
  });

  const persisted = persistScreenshotArtifacts(artifacts, storage as never);
  const reloaded = loadStoredScreenshotArtifacts(storage as never);

  assert.equal(persisted.length, 2);
  assert.equal(reloaded.length, 2);
  assert.match(reloaded[0].dataUrl ?? "", /desktop/);
});
