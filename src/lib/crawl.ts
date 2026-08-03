export type CrawlConfig = {
  maxPages: number;
  maxDepth: number;
};

export type CrawlResult = {
  pages: Array<{
    url: string;
    title: string;
    status: number;
  }>;
  queueLength: number;
  summary: string;
};

export function normalizeAndDeduplicateUrls(
  baseUrl: string,
  urls: string[],
): string[] {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const candidate of urls) {
    try {
      const parsed = new URL(candidate, baseUrl);
      if (parsed.origin !== new URL(baseUrl).origin) {
        continue;
      }
      const normalized = parsed.toString();
      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push(normalized);
      }
    } catch {
      // ignore invalid values
    }
  }

  return results;
}

export function getSafeCrawlConfig(maxPages: number): CrawlConfig {
  return {
    maxPages: Math.min(Math.max(1, maxPages), 10),
    maxDepth: 2,
  };
}

export function buildCrawlResult(
  urls: string[],
  pages: Array<{ url: string; title: string; status: number }>,
): CrawlResult {
  const deduped = normalizeAndDeduplicateUrls(urls[0] ?? "", urls);
  const summary =
    deduped.length > 0
      ? `${deduped.length} internal page${deduped.length === 1 ? "" : "s"} queued for scanning.`
      : "No internal pages were discovered.";

  return {
    pages: pages.slice(0, 10),
    queueLength: deduped.length,
    summary,
  };
}
