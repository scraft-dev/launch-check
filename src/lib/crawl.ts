import type { QualityFinding } from "./quality-checks";

export type CrawlConfig = {
  maxPages: number;
  maxDepth: number;
};

export type CrawlResult = {
  pages: Array<{
    url: string;
    title: string;
    status: number;
    depth?: number;
    findings?: QualityFinding[];
  }>;
  queueLength: number;
  scannedPages: number;
  brokenPages: number;
  totalFindings: number;
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
      parsed.hash = "";
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
  pages: CrawlResult["pages"],
): CrawlResult {
  const deduped = normalizeAndDeduplicateUrls(urls[0] ?? "", urls);
  const summary =
    pages.length > 0
      ? `${pages.length} internal page${pages.length === 1 ? "" : "s"} scanned.`
      : "No internal pages were discovered.";
  const limitedPages = pages.slice(0, 10);

  return {
    pages: limitedPages,
    queueLength: deduped.length,
    scannedPages: limitedPages.length,
    brokenPages: limitedPages.filter((page) => page.status >= 400).length,
    totalFindings: limitedPages.reduce(
      (total, page) => total + (page.findings?.length ?? 0),
      0,
    ),
    summary,
  };
}
