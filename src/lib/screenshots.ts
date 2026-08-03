export type ScreenshotKind = "desktop" | "mobile";

export type ScreenshotArtifact = {
  id: string;
  kind: ScreenshotKind;
  url: string;
  createdAt: string;
  note: string;
};

export function createScreenshotArtifacts(url: string): ScreenshotArtifact[] {
  return [
    {
      id: `desktop-${Date.now()}`,
      kind: "desktop",
      url,
      createdAt: new Date().toISOString(),
      note: "Desktop screenshot captured for review.",
    },
    {
      id: `mobile-${Date.now() + 1}`,
      kind: "mobile",
      url,
      createdAt: new Date().toISOString(),
      note: "Mobile screenshot captured for review.",
    },
  ];
}

export function pruneScreenshotArtifacts(artifacts: ScreenshotArtifact[], maxItems = 8): ScreenshotArtifact[] {
  return artifacts.slice(0, maxItems);
}
