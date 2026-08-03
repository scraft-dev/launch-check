"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildScanReport,
  exportScanReport,
  getUrlValidationError,
  getUserFriendlyScanError,
  type ScanErrorResponse,
  type ScanResponse,
} from "@/lib/scan";
import type { ScanAnalysis } from "@/lib/ai-analysis";
import { saveScanToHistory } from "@/lib/user-history";
import { buildCrawlResult, getSafeCrawlConfig } from "@/lib/crawl";
import { buildLighthouseAudit } from "@/lib/lighthouse";
import { createScreenshotArtifacts } from "@/lib/screenshots";
import { buildPdfReport, createPdfDownloadUrl } from "@/lib/pdf";

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<
    (ScanResponse & { analysis?: ScanAnalysis }) | null
  >(null);
  const [crawlSummary, setCrawlSummary] = useState<string | null>(null);
  const [multiPageEnabled, setMultiPageEnabled] = useState(false);
  const [lighthouseAudit, setLighthouseAudit] = useState<ReturnType<typeof buildLighthouseAudit> | null>(null);
  const [screenshots, setScreenshots] = useState<ReturnType<typeof createScreenshotArtifacts>>([]);
  const [pdfReport, setPdfReport] = useState<ReturnType<typeof buildPdfReport> | null>(null);

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
    setLighthouseAudit(null);
    setScreenshots([]);
    setPdfReport(null);
    setIsScanning(true);

    try {
      const crawlConfig = getSafeCrawlConfig(multiPageEnabled ? 6 : 1);
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
        const nextScreenshots = createScreenshotArtifacts(nextScanResult.finalUrl);
        const nextPdfReport = buildPdfReport(
          "Launch Check Report",
          buildScanReport(nextScanResult).summary,
          nextLighthouseAudit.opportunities.map((opportunity) => opportunity.title),
          nextScreenshots.map((screenshot) => screenshot.url),
        );
        setLighthouseAudit(nextLighthouseAudit);
        setScreenshots(nextScreenshots);
        setPdfReport(nextPdfReport);
        const crawlResult = buildCrawlResult(
          [trimmedUrl],
          [
            {
              url: nextScanResult.finalUrl,
              title: nextScanResult.pageTitle,
              status: nextScanResult.httpStatus,
            },
          ],
        );
        setCrawlSummary(nextScanResult.crawlSummary ?? crawlResult.summary);

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
                    href={createPdfDownloadUrl(pdfReport)}
                    download="launch-check-report.txt"
                  >
                    Download report preview
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
                  <p className="text-sm font-semibold text-slate-900">Issues</p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {scanReport.issues.map((issue) => (
                      <li
                        key={`${issue.title}-${issue.detail}`}
                        className="rounded-lg bg-white p-3"
                      >
                        <p className="font-medium capitalize text-slate-900">
                          {issue.severity}
                        </p>
                        <p>{issue.title}</p>
                        <p className="text-slate-500">{issue.detail}</p>
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
