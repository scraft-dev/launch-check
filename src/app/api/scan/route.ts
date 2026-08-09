import crypto from "node:crypto";
import serverlessChromium from "@sparticuz/chromium";
import { chromium, type Browser, type Page } from "playwright-core";
import { buildFallbackAnalysis, type ScanAnalysis } from "@/lib/ai-analysis";
import { buildCrawlResult, getSafeCrawlConfig } from "@/lib/crawl";
import { buildLighthouseAudit, type LighthouseMetrics } from "@/lib/lighthouse";
import { buildPdfReport } from "@/lib/pdf";
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

async function collectScanData(targetUrl: string): Promise<ScanResponse> {
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
      timeout: 30000,
    });

    await page
      .waitForLoadState("networkidle", { timeout: 5000 })
      .catch(() => undefined);

    const loadTime = Date.now() - startedAt;
    const finalUrl = page.url();
    const pageTitle = await page.title();
    const httpStatus = response?.status() ?? 0;
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
                timeout: 30000,
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

    const scanResult = await collectScanData(targetUrl);
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
    const crawlConfig = getSafeCrawlConfig(body.crawlConfig?.maxPages ?? 1);
    const crawlResult = buildCrawlResult(
      [targetUrl],
      [
        {
          url: scanResult.finalUrl,
          title: scanResult.pageTitle,
          status: scanResult.httpStatus,
        },
      ],
    );
    const crawlSummary = body.multiPage
      ? `${crawlResult.summary} (bounded to ${crawlConfig.maxPages} page${crawlConfig.maxPages === 1 ? "" : "s"})`
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
