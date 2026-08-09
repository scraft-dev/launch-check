"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildScanReport,
  exportScanReport,
  getUrlValidationError,
  getUserFriendlyScanError,
  type ScanErrorResponse,
  type PdfReportPayload,
  type ScanResponse,
} from "@/lib/scan";
import type { ScanAnalysis } from "@/lib/ai-analysis";
import { saveScanToHistory } from "@/lib/user-history";
import {
  buildCrawlResult,
  getSafeCrawlConfig,
  type CrawlResult,
} from "@/lib/crawl";
import { buildLighthouseAudit } from "@/lib/lighthouse";
import { createScreenshotArtifacts } from "@/lib/screenshots";

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<
    (ScanResponse & { analysis?: ScanAnalysis }) | null
  >(null);
  const [crawlSummary, setCrawlSummary] = useState<string | null>(null);
  const [crawlResult, setCrawlResult] = useState<CrawlResult | null>(null);
  const [multiPageEnabled, setMultiPageEnabled] = useState(false);
  const [lighthouseAudit, setLighthouseAudit] = useState<ReturnType<
    typeof buildLighthouseAudit
  > | null>(null);
  const [screenshots, setScreenshots] = useState<
    ReturnType<typeof createScreenshotArtifacts>
  >([]);
  const [pdfReport, setPdfReport] = useState<PdfReportPayload | null>(null);

  const scanReport = useMemo(() => {
    if (!scanResult) {
      return null;
    }

    return buildScanReport(scanResult);
  }, [scanResult]);

  async function handleStartScan() {
    const trimmedUrl = url.trim();
    const validationError = getUrlValidationError(trimmedUrl);

    if (validationError) {
      setError(validationError);
      setScanResult(null);
      setIsScanning(false);
      return;
    }

    setError("");
    setScanResult(null);
    setCrawlSummary(null);
    setCrawlResult(null);
    setLighthouseAudit(null);
    setScreenshots([]);
    setPdfReport(null);
    setIsScanning(true);

    try {
      const crawlConfig = getSafeCrawlConfig(multiPageEnabled ? 4 : 1);
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: trimmedUrl,
          multiPage: multiPageEnabled,
          crawlConfig,
        }),
      });

      const data = (await response.json()) as
        | (ScanResponse & { analysis?: ScanAnalysis; crawlSummary?: string })
        | ScanErrorResponse;

      if (!response.ok) {
        const scanError =
          "error" in data
            ? data.error
            : "Unable to scan this website right now.";
        setError(getUserFriendlyScanError(scanError));
        setScanResult(null);
      } else {
        const nextScanResult = data as ScanResponse & {
          analysis?: ScanAnalysis;
          crawlSummary?: string;
        };
        setScanResult(nextScanResult);
        const nextLighthouseAudit = buildLighthouseAudit(nextScanResult);
        const nextScreenshots = createScreenshotArtifacts(
          nextScanResult.finalUrl,
          {
            desktop: nextScanResult.screenshots?.find(
              (screenshot) => screenshot.kind === "desktop",
            )?.dataUrl,
            mobile: nextScanResult.screenshots?.find(
              (screenshot) => screenshot.kind === "mobile",
            )?.dataUrl,
          },
        );
        setLighthouseAudit(nextLighthouseAudit);
        setScreenshots(nextScreenshots);
        setPdfReport(nextScanResult.pdfReport ?? null);
        const fallbackCrawlResult = buildCrawlResult(
          [trimmedUrl],
          [
            {
              url: nextScanResult.finalUrl,
              title: nextScanResult.pageTitle,
              status: nextScanResult.httpStatus,
            },
          ],
        );
        setCrawlSummary(
          nextScanResult.crawlSummary ?? fallbackCrawlResult.summary,
        );
        setCrawlResult(nextScanResult.crawlResult ?? null);

        saveScanToHistory({
          url: nextScanResult.url,
          finalUrl: nextScanResult.finalUrl,
          pageTitle: nextScanResult.pageTitle,
          httpStatus: nextScanResult.httpStatus,
          loadTime: nextScanResult.loadTime,
          summary: buildScanReport(nextScanResult).summary,
        });
      }
    } catch {
      setError("Unable to scan this website right now.");
      setScanResult(null);
    } finally {
      setIsScanning(false);
    }
  }

  function handleReset() {
    setUrl("");
    setError("");
    setIsScanning(false);
    setScanResult(null);
    setCrawlSummary(null);
    setCrawlResult(null);
    setMultiPageEnabled(false);
    setLighthouseAudit(null);
    setScreenshots([]);
    setPdfReport(null);
  }

  function handleExport() {
    if (!scanResult) {
      return;
    }

    const blob = new Blob([exportScanReport(scanResult)], {
      type: "application/json",
    });
    const objectUrl = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = objectUrl;
    link.download = "scan-report.json";
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    window.URL.revokeObjectURL(objectUrl);
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8 lg:py-16">
      <main className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-blue-100 bg-white p-8 shadow-sm sm:p-10 lg:p-14">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Launch Check
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-950 sm:text-5xl">
              Launch with confidence.
            </h1>
            <p className="mt-4 text-lg leading-8 text-slate-600 sm:text-xl">
              Catch critical website issues before your users do.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <input
                className="w-full rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-base text-slate-700 outline-none ring-0 placeholder:text-slate-400 sm:max-w-md"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) => {
                  setUrl(event.target.value);
                  if (error) {
                    setError("");
                  }
                }}
              />
              <button
                type="button"
                className="rounded-full bg-blue-600 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                onClick={handleStartScan}
                disabled={url.trim() === "" || isScanning}
              >
                {isScanning ? "Scanning..." : "Start Scan"}
              </button>
            </div>

            <label className="mt-4 flex items-center gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={multiPageEnabled}
                onChange={() => setMultiPageEnabled((value) => !value)}
              />
              Run a multi-page crawl (safe internal-link scan)
            </label>

            {error ? (
              <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-4">
              <Link
                className="text-sm font-medium text-blue-600"
                href="/dashboard"
              >
                Go to dashboard
              </Link>
              <Link
                className="text-sm font-medium text-blue-600"
                href="/pricing"
              >
                View pricing
              </Link>
              <Link className="text-sm font-medium text-blue-600" href="/faq">
                View FAQ
              </Link>
              <Link className="text-sm font-medium text-blue-600" href="/docs">
                Read docs
              </Link>
              <Link
                className="text-sm font-medium text-blue-600"
                href="/integrations"
              >
                View integrations
              </Link>
              <Link
                className="text-sm font-medium text-blue-600"
                href="/github"
              >
                Connect GitHub
              </Link>
              <Link
                className="text-sm font-medium text-blue-600"
                href="/notifications"
              >
                Team notifications
              </Link>
              <Link
                className="text-sm font-medium text-blue-600"
                href="/enterprise"
              >
                Enterprise administration
              </Link>
              <Link
                className="text-sm font-medium text-blue-600"
                href="/workspaces"
              >
                Manage workspaces
              </Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-8 sm:p-10">
            <p className="text-lg font-semibold text-blue-700">
              {isScanning ? "Scanning your website..." : "Ready to scan"}
            </p>
            {crawlSummary ? (
              <p className="mt-3 rounded-2xl border border-blue-200 bg-white/70 p-4 text-sm text-slate-700">
                {crawlSummary}
              </p>
            ) : null}
          </section>

          {scanResult && scanReport ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">
                  Launch Score: {scanReport.launchScore}
                </h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  {scanReport.launchScore >= 80 ? "Healthy" : "Needs review"}
                </span>
              </div>

              <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p>
                  <span className="font-semibold text-slate-900">URL:</span>{" "}
                  {scanResult.url}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    Final URL:
                  </span>{" "}
                  {scanResult.finalUrl}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    Page Title:
                  </span>{" "}
                  {scanResult.pageTitle}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    HTTP Status:
                  </span>{" "}
                  {scanReport.performance.httpStatus}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    Load Time:
                  </span>{" "}
                  {scanReport.performance.loadTimeLabel}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    Console Errors:
                  </span>{" "}
                  {scanResult.consoleErrors.length}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">
                    Failed Requests:
                  </span>{" "}
                  {scanResult.failedRequests.length}
                </p>
              </div>

              {crawlResult ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Pages scanned
                    </p>
                    <div className="flex gap-2 text-xs font-medium">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-blue-700">
                        {crawlResult.scannedPages} pages
                      </span>
                      <span className="rounded-full bg-red-100 px-2.5 py-1 text-red-700">
                        {crawlResult.brokenPages} broken
                      </span>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {crawlResult.pages.map((page) => (
                      <li
                        key={page.url}
                        className="rounded-xl border border-slate-100 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-900">
                              {page.title || "Untitled page"}
                            </p>
                            <p className="mt-1 break-all text-xs text-slate-500">
                              {page.url}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              page.status >= 400 || page.status === 0
                                ? "bg-red-100 text-red-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {page.status || "Failed"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Depth {page.depth ?? 0} · {page.findings?.length ?? 0}{" "}
                          quality findings
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {(["critical", "high", "medium", "low"] as const).map(
                  (severity) => (
                    <div key={severity} className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-sm capitalize text-slate-500">
                        {severity}
                      </p>
                      <p className="mt-1 text-2xl font-semibold text-slate-900">
                        {scanReport.severitySummary[severity]}
                      </p>
                    </div>
                  ),
                )}
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {scanReport.summary}
                </p>
              </div>

              {lighthouseAudit ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Lighthouse scores
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {[
                      ["Performance", lighthouseAudit.performance],
                      ["Accessibility", lighthouseAudit.accessibility],
                      ["Best Practices", lighthouseAudit.bestPractices],
                      ["SEO", lighthouseAudit.seo],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl bg-white p-3">
                        <p className="text-sm text-slate-500">{label}</p>
                        <p className="mt-1 text-xl font-semibold text-slate-900">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>
                  {lighthouseAudit.opportunities.length > 0 ? (
                    <ul className="mt-3 space-y-2 text-sm text-slate-600">
                      {lighthouseAudit.opportunities.map((opportunity) => (
                        <li
                          key={opportunity.title}
                          className="rounded-lg bg-white p-3"
                        >
                          <p className="font-medium text-slate-900">
                            {opportunity.title}
                          </p>
                          <p>{opportunity.detail}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}

              {screenshots.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    Screenshots
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {screenshots.map((screenshot) => (
                      <li
                        key={screenshot.id}
                        className="rounded-lg bg-white p-3"
                      >
                        <p className="font-medium text-slate-900">
                          {screenshot.kind}
                        </p>
                        <p>{screenshot.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {pdfReport ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    PDF report
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {pdfReport.summary}
                  </p>
                  <a
                    className="mt-3 inline-flex rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                    href={`data:application/pdf;base64,${pdfReport.pdfBase64}`}
                    download="launch-check-report.pdf"
                  >
                    Download PDF report
                  </a>
                </div>
              ) : null}

              {scanResult.analysis ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    AI Analysis
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {scanResult.analysis.summary}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {scanResult.analysis.suggestions.map((suggestion) => (
                      <li
                        key={suggestion.title}
                        className="rounded-lg bg-white p-3"
                      >
                        <p className="font-medium text-slate-900">
                          {suggestion.title}
                        </p>
                        <p>{suggestion.detail}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {scanReport.issues.length > 0 ? (
                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">
                      Action plan
                    </p>
                    <span className="text-xs font-medium text-slate-500">
                      {scanReport.issues.length} finding
                      {scanReport.issues.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {scanReport.issues.map((issue) => (
                      <li
                        key={`${issue.title}-${issue.detail}`}
                        className="rounded-xl border border-slate-100 bg-white p-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${
                              issue.severity === "critical"
                                ? "bg-red-100 text-red-700"
                                : issue.severity === "high"
                                  ? "bg-orange-100 text-orange-700"
                                  : issue.severity === "medium"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {issue.severity}
                          </span>
                          {issue.category ? (
                            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium capitalize text-blue-700">
                              {issue.category}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 font-semibold text-slate-900">
                          {issue.title}
                        </p>
                        <p className="mt-1 leading-6 text-slate-600">
                          {issue.detail}
                        </p>
                        {issue.pageUrl ? (
                          <a
                            className="mt-2 block break-all text-xs font-medium text-blue-600 hover:underline"
                            href={issue.pageUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {issue.pageUrl}
                          </a>
                        ) : null}
                        {issue.recommendation ? (
                          <div className="mt-3 rounded-lg bg-blue-50 p-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                              How to fix
                            </p>
                            <p className="mt-1 leading-6 text-blue-950">
                              {issue.recommendation}
                            </p>
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={handleReset}
                >
                  Scan another website
                </button>
                <button
                  type="button"
                  className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  onClick={handleExport}
                >
                  Export JSON
                </button>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
