import type { CrawlResult } from "./crawl";
import type { LighthouseMetrics } from "./lighthouse";
import type { QualityFinding } from "./quality-checks";

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
  scanMode?: "browser" | "http";
  notice?: string;
};

export type PdfReportPayload = {
  title: string;
  summary: string;
  findings: string[];
  screenshots: string[];
  score?: number;
  details: string[];
  pdfBase64: string;
};

export type ScanErrorResponse = {
  error: string;
};

export type IssueSeverity = "critical" | "high" | "medium" | "low";

const severityPriority: Record<IssueSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export type ScanReport = {
  launchScore: number;
  severitySummary: Record<IssueSeverity, number>;
  summary: string;
  performance: {
    httpStatus: number;
    loadTime: number;
    loadTimeLabel: string;
  };
  issues: Array<{
    severity: IssueSeverity;
    title: string;
    detail: string;
    category?: string;
    recommendation?: string;
    pageUrl?: string;
  }>;
};

function normalizePageUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

export function getUrlValidationError(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "Enter a valid website URL.";
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "Enter a valid website URL.";
    }

    if (isPrivateHostname(parsedUrl.hostname)) {
      return "Enter a valid website URL.";
    }
  } catch {
    return "Enter a valid website URL.";
  }

  return null;
}

function isPrivateHostname(hostname: string): boolean {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname === "127.0.0.1" ||
    normalizedHostname === "0.0.0.0"
  ) {
    return true;
  }

  if (normalizedHostname.includes(":")) {
    return normalizedHostname === "::1";
  }

  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Pattern.test(normalizedHostname)) {
    return false;
  }

  const octets = normalizedHostname.split(".").map((octet) => Number(octet));
  if (octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)) {
    return true;
  }

  const [firstOctet, secondOctet] = octets;
  if (firstOctet === 0) {
    return true;
  }

  if (firstOctet === 10) {
    return true;
  }

  if (firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) {
    return true;
  }

  if (firstOctet === 192 && secondOctet === 168) {
    return true;
  }

  return false;
}

export function getUserFriendlyScanError(
  message: string | null | undefined,
): string {
  const normalizedMessage = (message ?? "").toLowerCase();

  if (
    normalizedMessage.includes("net::err_name_not_resolved") ||
    normalizedMessage.includes("dns")
  ) {
    return "The website could not be reached. Check the URL and try again.";
  }

  if (
    normalizedMessage.includes("ssl") ||
    normalizedMessage.includes("certificate")
  ) {
    return "SSL verification failed. Try a different URL.";
  }

  if (normalizedMessage.includes("timeout")) {
    return "The scan timed out. The site may be slow or unavailable.";
  }

  if (normalizedMessage.includes("cloudflare")) {
    return "The site is blocking automated access.";
  }

  if (normalizedMessage.includes("captcha")) {
    return "The site requested a CAPTCHA challenge.";
  }

  if (
    normalizedMessage.includes("access denied") ||
    normalizedMessage.includes("denied")
  ) {
    return "Access to this website was denied.";
  }

  if (normalizedMessage.includes("browser")) {
    return "The browser could not be launched for scanning.";
  }

  return "Unable to scan this website right now.";
}

export function buildScanReport(scanResult: ScanResponse): ScanReport {
  const severitySummary: Record<IssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  if (scanResult.httpStatus >= 400) {
    severitySummary.high += 1;
  }

  if (scanResult.pageErrors.length > 0) {
    severitySummary.medium += 1;
  }

  if (scanResult.consoleErrors.length > 0) {
    severitySummary.low += 1;
  }

  if (scanResult.failedRequests.length > 0) {
    severitySummary.medium += 1;
  }

  const mainPageUrl = normalizePageUrl(scanResult.finalUrl);
  const crawledPageIssues = (scanResult.crawlResult?.pages ?? []).flatMap(
    (page) => {
      if (normalizePageUrl(page.url) === mainPageUrl) {
        return [];
      }

      const statusIssue =
        page.status === 0 || page.status >= 400
          ? [
              {
                severity: "high" as IssueSeverity,
                title: "Internal page is unavailable",
                detail:
                  page.status === 0
                    ? "The page could not be reached during the crawl."
                    : `Received HTTP ${page.status}.`,
                category: "availability",
                recommendation:
                  "Restore the page or update links that point to this URL.",
                pageUrl: page.url,
              },
            ]
          : [];

      return [
        ...statusIssue,
        ...(page.findings ?? []).map((finding) => ({
          severity: finding.severity,
          title: finding.title,
          detail: finding.detail,
          category: finding.category,
          recommendation: finding.recommendation,
          pageUrl: page.url,
        })),
      ];
    },
  );

  for (const finding of [
    ...(scanResult.qualityFindings ?? []),
    ...crawledPageIssues,
  ]) {
    severitySummary[finding.severity] += 1;
  }

  const totalIssues = Object.values(severitySummary).reduce(
    (sum, count) => sum + count,
    0,
  );
  const launchScore = Math.max(
    0,
    Math.min(
      100,
      100 -
        severitySummary.critical * 25 -
        severitySummary.high * 15 -
        severitySummary.medium * 8 -
        severitySummary.low * 3,
    ),
  );
  const loadTimeLabel =
    scanResult.loadTime > 1000
      ? `${(scanResult.loadTime / 1000).toFixed(1)}s`
      : `${scanResult.loadTime}ms`;

  const issues = [
    ...(scanResult.httpStatus >= 400
      ? [
          {
            severity: "high" as IssueSeverity,
            title: "HTTP status error",
            detail: `Received HTTP ${scanResult.httpStatus}.`,
          },
        ]
      : []),
    ...(scanResult.pageErrors.length > 0
      ? [
          {
            severity: "medium" as IssueSeverity,
            title: "Page runtime error",
            detail: scanResult.pageErrors[0],
          },
        ]
      : []),
    ...(scanResult.consoleErrors.length > 0
      ? [
          {
            severity: "low" as IssueSeverity,
            title: "Console error",
            detail: scanResult.consoleErrors[0],
          },
        ]
      : []),
    ...(scanResult.failedRequests.length > 0
      ? [
          {
            severity: "medium" as IssueSeverity,
            title: "Failed request",
            detail: scanResult.failedRequests[0].error,
          },
        ]
      : []),
    ...(scanResult.qualityFindings ?? []).map((finding) => ({
      severity: finding.severity,
      title: finding.title,
      detail: finding.detail,
      category: finding.category,
      recommendation: finding.recommendation,
      pageUrl: scanResult.finalUrl,
    })),
    ...crawledPageIssues,
  ].sort(
    (left, right) =>
      severityPriority[left.severity] - severityPriority[right.severity],
  );

  return {
    launchScore,
    severitySummary,
    summary:
      totalIssues === 0
        ? "Your website looks healthy. No issues were detected."
        : `${totalIssues} issue${totalIssues === 1 ? "" : "s"} should be reviewed before launch. Start with the highest-severity findings.`,
    performance: {
      httpStatus: scanResult.httpStatus,
      loadTime: scanResult.loadTime,
      loadTimeLabel,
    },
    issues,
  };
}

export function exportScanReport(scanResult: ScanResponse): string {
  return JSON.stringify(buildScanReport(scanResult), null, 2);
}
