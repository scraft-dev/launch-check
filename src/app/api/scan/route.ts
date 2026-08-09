import crypto from "node:crypto";
import serverlessChromium from "@sparticuz/chromium";
import { chromium, type Browser, type Page } from "playwright-core";
import { buildFallbackAnalysis, type ScanAnalysis } from "@/lib/ai-analysis";
import {
  buildCrawlResult,
  getSafeCrawlConfig,
  normalizeAndDeduplicateUrls,
  type CrawlConfig,
  type CrawlResult,
} from "@/lib/crawl";
import { buildLighthouseAudit, type LighthouseMetrics } from "@/lib/lighthouse";
import { buildPdfReport } from "@/lib/pdf";
import {
  buildQualityFindings,
  type PageQualitySnapshot,
  type QualityFinding,
} from "@/lib/quality-checks";
import { buildScanReport, type PdfReportPayload } from "@/lib/scan";
import {
  JsonDeliveryLogRepository,
  JsonNotificationPreferencesRepository,
} from "@/lib/notification-log";
import {
  deliverNotification,
  readNotificationConfig,
} from "@/lib/notifications";
export const maxDuration = 60;

async function getChromiumLaunchOptions() {
  if (process.env.VERCEL) {
    return {
      args: serverlessChromium.args,
      executablePath: await serverlessChromium.executablePath(),
      headless: true as const,
    };
  }

  return {
    executablePath: chromium.executablePath(),
    headless: true as const,
  };
}

export type ScanResponse = {
  url: string;
  finalUrl: string;
  pageTitle: string;
  httpStatus: number;
  loadTime: number;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: Array<{
    url: string;
    resourceType: string;
    status: number;
    error: string;
  }>;
  lighthouseMetrics?: LighthouseMetrics;
  qualityFindings?: QualityFinding[];
  crawlResult?: CrawlResult;
  screenshots?: Array<{
    kind: "desktop" | "mobile";
    dataUrl: string;
    note: string;
  }>;
  pdfReport?: PdfReportPayload;
};

export type ScanResponseWithAnalysis = ScanResponse & {
  analysis: ScanAnalysis;
};

function normalizeUrl(value: string): string {
  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:") {
      return parsedUrl.toString();
    }
  } catch {
    // ignore invalid values
  }

  return value;
}

function isPrivateUrl(value: string): boolean {
  const hostname = new URL(value).hostname;

  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  ) {
    return true;
  }

  if (hostname.includes(":")) {
    return true;
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Pattern.test(hostname)) {
    return false;
  }

  const parts = hostname.split(".").map((part) => Number(part));
  return parts.some((part) => Number.isNaN(part) || part < 0 || part > 255);
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function runLighthouseAudit(
  targetUrl: string,
): Promise<LighthouseMetrics> {
  const [{ default: lighthouse }, chromeLauncher] = await Promise.all([
    import("lighthouse"),
    import("chrome-launcher"),
  ]);
  const launchOptions = await getChromiumLaunchOptions();
  const chrome = await chromeLauncher.launch({
    chromePath: launchOptions.executablePath,
    chromeFlags: [
      ...(launchOptions.args ?? []),
      "--headless",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    const result = await lighthouse(targetUrl, {
      port: chrome.port,
      output: "json",
      logLevel: "error",
      disableStorageReset: true,
    });

    const categories = result?.lhr?.categories ?? {};
    return {
      performance: clampScore(
        categories.performance?.score ? categories.performance.score * 100 : 0,
      ),
      accessibility: clampScore(
        categories.accessibility?.score
          ? categories.accessibility.score * 100
          : 0,
      ),
      bestPractices: clampScore(
        categories["best-practices"]?.score
          ? categories["best-practices"].score * 100
          : 0,
      ),
      seo: clampScore(categories.seo?.score ? categories.seo.score * 100 : 0),
    };
  } finally {
    await chrome.kill();
  }
}

function validateUrl(value: string): string | null {
  if (!value) {
    return "Enter a valid website URL.";
  }

  try {
    const parsedUrl = new URL(value);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "Enter a valid website URL.";
    }

    if (isPrivateUrl(parsedUrl.toString())) {
      return "Enter a valid website URL.";
    }
  } catch {
    return "Enter a valid website URL.";
  }

  return null;
}

async function collectPageQualitySnapshot(
  page: Page,
): Promise<PageQualitySnapshot> {
  return page.evaluate(() => {
    const images = Array.from(document.querySelectorAll("img"));
    const formControls = Array.from(
      document.querySelectorAll(
        "input:not([type='hidden']), select, textarea, button",
      ),
    ) as Array<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
      | HTMLButtonElement
    >;
    const resourceElements = Array.from(
      document.querySelectorAll(
        "script[src], link[href], img[src], video[src], audio[src], source[src]",
      ),
    );
    const mixedContentCount =
      window.location.protocol === "https:"
        ? resourceElements.filter((element) => {
            const value =
              element.getAttribute("src") ?? element.getAttribute("href") ?? "";
            return value.startsWith("http:");
          }).length
        : 0;

    return {
      title: document.title,
      metaDescription:
        document
          .querySelector('meta[name="description"]')
          ?.getAttribute("content") ?? "",
      language: document.documentElement.lang,
      h1Count: document.querySelectorAll("h1").length,
      imageCount: images.length,
      imagesMissingAlt: images.filter((image) => !image.hasAttribute("alt"))
        .length,
      formControlCount: formControls.length,
      unlabeledFormControls: formControls.filter((control) => {
        return !(
          control.labels?.length ||
          control.getAttribute("aria-label")?.trim() ||
          control.getAttribute("aria-labelledby")?.trim()
        );
      }).length,
      hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
      mixedContentCount,
    } satisfies PageQualitySnapshot;
  });
}

async function collectInternalLinks(page: Page, baseUrl: string) {
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll("a[href]"), (link) =>
      link.getAttribute("href"),
    ).filter((href): href is string => Boolean(href)),
  );

  return normalizeAndDeduplicateUrls(baseUrl, hrefs);
}

async function crawlInternalPages(
  browser: Browser,
  targetUrl: string,
  initialPage: {
    url: string;
    title: string;
    status: number;
    findings: QualityFinding[];
  },
  initialLinks: string[],
  config: CrawlConfig,
): Promise<CrawlResult> {
  const visited = new Set([initialPage.url]);
  const queued = new Set(initialLinks);
  const queue = initialLinks
    .filter((url) => url !== initialPage.url)
    .map((url) => ({ url, depth: 1 }));
  const pages: CrawlResult["pages"] = [{ ...initialPage, depth: 0 }];

  while (queue.length > 0 && pages.length < config.maxPages) {
    const next = queue.shift();
    if (!next || visited.has(next.url) || next.depth > config.maxDepth) {
      continue;
    }

    visited.add(next.url);
    const crawlPage = await browser.newPage();

    try {
      const response = await crawlPage.goto(next.url, {
        waitUntil: "domcontentloaded",
        timeout: 4000,
      });
      const finalUrl = crawlPage.url();
      const qualitySnapshot = await collectPageQualitySnapshot(crawlPage);
      pages.push({
        url: finalUrl,
        title: await crawlPage.title(),
        status: response?.status() ?? 0,
        depth: next.depth,
        findings: buildQualityFindings(qualitySnapshot),
      });

      if (next.depth < config.maxDepth) {
        const links = await collectInternalLinks(crawlPage, targetUrl);
        for (const link of links) {
          if (!visited.has(link) && !queued.has(link)) {
            queued.add(link);
            queue.push({ url: link, depth: next.depth + 1 });
          }
        }
      }
    } catch {
      pages.push({
        url: next.url,
        title: "Unable to load",
        status: 0,
        depth: next.depth,
        findings: [],
      });
    } finally {
      await crawlPage.close();
    }
  }

  return buildCrawlResult([...visited, ...queued], pages);
}

async function collectScanData(
  targetUrl: string,
  crawlConfig?: CrawlConfig,
): Promise<ScanResponse> {
  const browser: Browser = await chromium.launch(
    await getChromiumLaunchOptions(),
  );
  const page: Page = await browser.newPage();

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: Array<{
    url: string;
    resourceType: string;
    status: number;
    error: string;
  }> = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("requestfailed", (request) => {
    failedRequests.push({
      url: request.url(),
      resourceType: request.resourceType(),
      status: 0,
      error: request.failure()?.errorText ?? "Request failed",
    });
  });

  page.on("response", async (response) => {
    if (response.status() >= 400) {
      failedRequests.push({
        url: response.url(),
        resourceType: response.request().resourceType(),
        status: response.status(),
        error: response.statusText(),
      });
    }
  });

  const startedAt = Date.now();

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    await page
      .waitForLoadState("networkidle", { timeout: 3000 })
      .catch(() => undefined);

    const loadTime = Date.now() - startedAt;
    const finalUrl = page.url();
    const pageTitle = await page.title();
    const httpStatus = response?.status() ?? 0;
    const qualitySnapshot = await collectPageQualitySnapshot(page);
    const qualityFindings = buildQualityFindings(qualitySnapshot);
    const initialLinks = crawlConfig
      ? await collectInternalLinks(page, targetUrl)
      : [];
    const lighthouseMetrics = process.env.VERCEL
      ? undefined
      : await runLighthouseAudit(targetUrl);
    const screenshots = [
      {
        kind: "desktop" as const,
        dataUrl: await page
          .screenshot({ fullPage: false, type: "png" })
          .then(
            (buffer) => `data:image/png;base64,${buffer.toString("base64")}`,
          ),
        note: "Desktop screenshot captured with Playwright",
      },
      {
        kind: "mobile" as const,
        dataUrl: await page
          .setViewportSize({ width: 390, height: 844 })
          .then(async () => {
            await page
              .goto(targetUrl, {
                waitUntil: "domcontentloaded",
                timeout: 5000,
              })
              .catch(() => undefined);
            const buffer = await page.screenshot({
              fullPage: false,
              type: "png",
            });
            return `data:image/png;base64,${buffer.toString("base64")}`;
          }),
        note: "Mobile screenshot captured with Playwright",
      },
    ];
    const crawlResult = crawlConfig
      ? await crawlInternalPages(
          browser,
          targetUrl,
          {
            url: finalUrl,
            title: pageTitle,
            status: httpStatus,
            findings: qualityFindings,
          },
          initialLinks,
          crawlConfig,
        )
      : undefined;

    return {
      url: targetUrl,
      finalUrl,
      pageTitle,
      httpStatus,
      loadTime,
      consoleErrors,
      pageErrors,
      failedRequests: failedRequests.filter(
        (item, index, self) =>
          index ===
          self.findIndex(
            (candidate) =>
              candidate.url === item.url && candidate.status === item.status,
          ),
      ),
      lighthouseMetrics,
      qualityFindings,
      crawlResult,
      screenshots,
    };
  } finally {
    await browser.close();
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      url?: string;
      multiPage?: boolean;
      crawlConfig?: { maxPages?: number; maxDepth?: number };
    };
    const targetUrl = normalizeUrl(body.url ?? "");
    const validationError = validateUrl(targetUrl);

    if (validationError) {
      return Response.json({ error: validationError }, { status: 400 });
    }

    const crawlConfig = body.multiPage
      ? getSafeCrawlConfig(Math.min(body.crawlConfig?.maxPages ?? 4, 4))
      : undefined;
    const scanResult = await collectScanData(targetUrl, crawlConfig);
    const analysis = buildFallbackAnalysis(scanResult);
    const scanReport = buildScanReport(scanResult);
    const lighthouseAudit = buildLighthouseAudit(scanResult);
    const pdfReport = await buildPdfReport(
      "Launch Check Report",
      scanReport.summary,
      lighthouseAudit.opportunities.map((opportunity) => opportunity.title),
      (scanResult.screenshots ?? []).map((screenshot) => screenshot.dataUrl),
      {
        score: lighthouseAudit.performance,
        details: [
          `Accessibility: ${lighthouseAudit.accessibility}`,
          `Best Practices: ${lighthouseAudit.bestPractices}`,
          `SEO: ${lighthouseAudit.seo}`,
        ],
      },
    );
    const crawlSummary = scanResult.crawlResult
      ? `${scanResult.crawlResult.summary} ${scanResult.crawlResult.brokenPages} broken page${scanResult.crawlResult.brokenPages === 1 ? "" : "s"}; ${scanResult.crawlResult.totalFindings} quality finding${scanResult.crawlResult.totalFindings === 1 ? "" : "s"}.`
      : undefined;

    const notificationConfig = readNotificationConfig();
    if (
      notificationConfig.slackConfigured ||
      notificationConfig.discordConfigured
    ) {
      const scanId = `scan_${crypto.randomUUID()}`;
      const score = lighthouseAudit.performance;
      const kind = score < 50 ? "critical_alert" : "scan_completed";
      const notification = {
        kind,
        scanId,
        siteUrl: scanResult.finalUrl,
        score,
        summary: scanReport.summary,
        reportUrl: `${new URL(request.url).origin}/history/${scanId}`,
      } as const;
      const preferences =
        await new JsonNotificationPreferencesRepository().get();
      const deliveryRepository = new JsonDeliveryLogRepository();
      const providers = [
        ...(notificationConfig.slackConfigured ? (["slack"] as const) : []),
        ...(notificationConfig.discordConfigured ? (["discord"] as const) : []),
      ];
      await Promise.allSettled(
        providers.map((provider) =>
          deliverNotification({
            provider,
            notification,
            preferences,
            config: notificationConfig,
            repository: deliveryRepository,
          }),
        ),
      );
    }

    return Response.json({
      ...scanResult,
      analysis,
      crawlSummary,
      pdfReport,
    } satisfies ScanResponseWithAnalysis & { crawlSummary?: string });
  } catch (error) {
    console.error("Website scan failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : "Unknown scan error",
    });
    return Response.json(
      { error: "Unable to scan this website right now." },
      { status: 500 },
    );
  }
}
