export type ScreenshotKind = "desktop" | "mobile";

export type ScreenshotArtifact = {
  id: string;
  kind: ScreenshotKind;
  url: string;
  createdAt: string;
  note: string;
  dataUrl?: string;
};

export type ScreenshotArtifactInput = {
  desktop?: string;
  mobile?: string;
};

const SCREENSHOT_STORAGE_KEY = "launch-check-screenshots";

export function createScreenshotArtifacts(
  url: string,
  dataUrls: ScreenshotArtifactInput = {},
): ScreenshotArtifact[] {
  return [
    {
      id: `desktop-${Date.now()}`,
      kind: "desktop",
      url,
      createdAt: new Date().toISOString(),
      note: "Desktop screenshot captured for review.",
      dataUrl: dataUrls.desktop,
    },
    {
      id: `mobile-${Date.now() + 1}`,
      kind: "mobile",
      url,
      createdAt: new Date().toISOString(),
      note: "Mobile screenshot captured for review.",
      dataUrl: dataUrls.mobile,
    },
  ];
}

export function pruneScreenshotArtifacts(artifacts: ScreenshotArtifact[], maxItems = 8): ScreenshotArtifact[] {
  return artifacts.slice(0, maxItems);
}

type ScreenshotStorage = {
  getItem?: (key: string) => string | null;
  setItem?: (key: string, value: string) => void;
};

function getStoredValue(storage: ScreenshotStorage | Map<string, string>, key: string): string | null {
  if (storage instanceof Map) {
    return storage.get(key) ?? null;
  }

  return storage.getItem?.(key) ?? null;
}

function setStoredValue(storage: ScreenshotStorage | Map<string, string>, key: string, value: string): void {
  if (storage instanceof Map) {
    storage.set(key, value);
    return;
  }

  storage.setItem?.(key, value);
}

export function persistScreenshotArtifacts(
  artifacts: ScreenshotArtifact[],
  storage: ScreenshotStorage | Map<string, string> = window.localStorage,
): ScreenshotArtifact[] {
  const nextArtifacts = pruneScreenshotArtifacts(artifacts);
  setStoredValue(storage, SCREENSHOT_STORAGE_KEY, JSON.stringify(nextArtifacts));
  return nextArtifacts;
}

export function loadStoredScreenshotArtifacts(
  storage: ScreenshotStorage | Map<string, string> = window.localStorage,
): ScreenshotArtifact[] {
  const storedValue = getStoredValue(storage, SCREENSHOT_STORAGE_KEY);
  if (!storedValue) {
    return [];
  }

  try {
    return JSON.parse(storedValue) as ScreenshotArtifact[];
  } catch {
    return [];
  }
}
