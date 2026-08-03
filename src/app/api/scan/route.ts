import { chromium, type Browser, type Page } from "playwright";
import { buildFallbackAnalysis, type ScanAnalysis } from "@/lib/ai-analysis";
import { buildCrawlResult, getSafeCrawlConfig } from "@/lib/crawl";

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
  const browser: Browser = await chromium.launch({ headless: true });
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

    return Response.json({
      ...scanResult,
      analysis,
      crawlSummary,
    } satisfies ScanResponseWithAnalysis & { crawlSummary?: string });
  } catch {
    return Response.json(
      { error: "Unable to scan this website right now." },
      { status: 500 },
    );
  }
}
