"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  launchPriorities,
  type LaunchPriority,
  type ReportIssueStatus,
  type ReportSnapshot,
} from "@/lib/report";
import { getStoredLocale, type AppLocale } from "@/lib/locale";

const priorityStyles: Record<LaunchPriority, string> = {
  critical: "bg-rose-100 text-rose-800 border-rose-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-sky-100 text-sky-800 border-sky-200",
};

const statusLabels: Record<ReportIssueStatus, { ja: string; en: string }> = {
  open: { ja: "未対応", en: "Open" },
  fixed: { ja: "修正済み", en: "Fixed" },
  ignored: { ja: "対応しない", en: "Ignored" },
};

export default function ReportPage() {
  const params = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ReportSnapshot | null>(null);
  const [locale, setLocale] = useState<AppLocale>("en");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [priority, setPriority] = useState<LaunchPriority | "all">("all");
  const [sortBy, setSortBy] = useState<"priority" | "status">("priority");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const localeFrame = window.requestAnimationFrame(() => {
      setLocale(getStoredLocale());
    });
    void fetch(`/api/reports/${encodeURIComponent(params.reportId)}`)
      .then(async (response) => {
        const data = (await response.json()) as
          ReportSnapshot | { error?: string };
        if (!response.ok) {
          throw new Error("error" in data ? data.error : "Report not found");
        }
        setReport(data as ReportSnapshot);
      })
      .catch((reason: unknown) =>
        setError(reason instanceof Error ? reason.message : "Report not found"),
      )
      .finally(() => setLoading(false));
    return () => window.cancelAnimationFrame(localeFrame);
  }, [params.reportId]);

  const isJapanese = locale === "ja";
  const visibleFindings = useMemo(() => {
    if (!report) return [];
    const priorityOrder = new Map(
      launchPriorities.map((value, index) => [value, index]),
    );
    const statusOrder: Record<ReportIssueStatus, number> = {
      open: 0,
      fixed: 1,
      ignored: 2,
    };
    return report.findings
      .filter(
        (finding) => priority === "all" || finding.launchPriority === priority,
      )
      .toSorted((left, right) =>
        sortBy === "priority"
          ? (priorityOrder.get(left.launchPriority) ?? 9) -
            (priorityOrder.get(right.launchPriority) ?? 9)
          : statusOrder[left.issueStatus] - statusOrder[right.issueStatus],
      );
  }, [priority, report, sortBy]);

  async function updateStatus(findingId: string, status: ReportIssueStatus) {
    const response = await fetch(
      `/api/reports/${encodeURIComponent(params.reportId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId, status, actorId: "local-user" }),
      },
    );
    const data = (await response.json()) as ReportSnapshot | { error?: string };
    if (!response.ok) {
      setMessage(isJapanese ? "状態を更新できませんでした" : "Update failed");
      return;
    }
    setReport(data as ReportSnapshot);
    setMessage(isJapanese ? "状態を更新しました" : "Status updated");
  }

  async function copyShareUrl() {
    await navigator.clipboard.writeText(window.location.href);
    setMessage(isJapanese ? "共有URLをコピーしました" : "Share URL copied");
  }

  function startRescan() {
    if (!report) return;
    window.localStorage.setItem(
      "launch-check-pending-rescan",
      JSON.stringify({ reportId: report.reportId, url: report.targetUrl }),
    );
    window.location.href = "/";
  }

  if (loading) {
    return <main className="result-shell min-h-screen" />;
  }
  if (error || !report) {
    return (
      <main className="result-shell min-h-screen px-5 py-16 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold">Report not found</h1>
          <p className="mt-3 text-slate-600">{error}</p>
          <Link href="/" className="mt-6 inline-block text-blue-700 underline">
            Launch Check
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="result-shell min-h-screen px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <Link className="font-semibold text-blue-700" href="/">
            LAUNCH CHECK
          </Link>
          <div className="flex flex-wrap gap-2 print:hidden">
            <button
              onClick={copyShareUrl}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
            >
              {isJapanese ? "共有URLをコピー" : "Copy share URL"}
            </button>
            <button
              onClick={startRescan}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white"
            >
              {isJapanese ? "再スキャン" : "Rescan"}
            </button>
          </div>
        </header>

        <section className="py-9 sm:py-12">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="font-mono">{report.reportId}</span>
            <span>
              {new Date(report.scannedAt).toLocaleString(
                isJapanese ? "ja-JP" : "en-US",
              )}
            </span>
          </div>
          <p className="mt-4 break-all text-sm text-blue-700">
            {report.finalUrl}
          </p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
                {report.pageTitle || report.targetUrl}
              </h1>
              <p className="mt-3 max-w-2xl text-slate-600">{report.summary}</p>
            </div>
            <div
              className={`rounded-2xl border px-6 py-5 ${report.launchDecision === "ready" ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}
            >
              <p className="text-xs font-semibold tracking-[.16em] text-slate-500">
                LAUNCH DECISION
              </p>
              <p
                className={`mt-2 text-2xl font-bold ${report.launchDecision === "ready" ? "text-emerald-800" : "text-rose-800"}`}
              >
                {report.launchDecision === "ready"
                  ? "READY TO LAUNCH"
                  : "NOT READY"}
              </p>
            </div>
          </div>
        </section>

        <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-5">
          <div className="p-5 sm:border-r sm:border-slate-200">
            <p className="text-xs text-slate-500">LAUNCH SCORE</p>
            <p className="mt-1 text-3xl font-semibold">{report.launchScore}</p>
          </div>
          {launchPriorities.map((item) => (
            <div
              key={item}
              className="border-t border-slate-200 p-5 sm:border-t-0 sm:border-r last:border-r-0"
            >
              <p className="text-xs uppercase text-slate-500">{item}</p>
              <p className="mt-1 text-2xl font-semibold">
                {report.prioritySummary[item]}
              </p>
            </div>
          ))}
        </section>

        {report.comparison ? (
          <section className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/70 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">
                {isJapanese ? "前回との差分" : "Changes since previous scan"}
              </h2>
              <Link
                className="text-sm text-blue-700 underline"
                href={`/reports/${report.comparison.previousReportId}`}
              >
                {isJapanese ? "前回のReport" : "Previous Report"}
              </Link>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[
                ["Fixed", report.comparison.fixed],
                ["New", report.comparison.new],
                ["Remaining", report.comparison.remaining],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-white p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section className="py-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold">
                {isJapanese ? "修正項目" : "Issues"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {visibleFindings.length} / {report.findings.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 print:hidden">
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as LaunchPriority | "all")
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="all">All priorities</option>
                {launchPriorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as "priority" | "status")
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="priority">Priority order</option>
                <option value="status">Status order</option>
              </select>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {visibleFindings.map((finding) => (
              <article
                key={finding.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase ${priorityStyles[finding.launchPriority]}`}
                    >
                      {finding.launchPriority}
                    </span>
                    <span className="text-xs text-slate-400">
                      Severity: {finding.technicalSeverity}
                    </span>
                  </div>
                  <select
                    value={finding.issueStatus}
                    onChange={(event) =>
                      void updateStatus(
                        finding.id,
                        event.target.value as ReportIssueStatus,
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm print:hidden"
                  >
                    {(Object.keys(statusLabels) as ReportIssueStatus[]).map(
                      (status) => (
                        <option key={status} value={status}>
                          {statusLabels[status][locale]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{finding.title}</h3>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-500">
                      {isJapanese ? "発生箇所" : "Location"}
                    </dt>
                    <dd className="mt-1 break-all text-slate-700">
                      {finding.location.pageUrl}
                      {finding.location.category
                        ? ` / ${finding.location.category}`
                        : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">
                      {isJapanese ? "原因・根拠" : "Cause / evidence"}
                    </dt>
                    <dd className="mt-1 text-slate-700">{finding.cause}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-semibold text-slate-500">
                      {isJapanese ? "推奨修正" : "Recommended fix"}
                    </dt>
                    <dd className="mt-1 text-slate-700">
                      {finding.recommendedFix}
                    </dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        {report.assistance ? (
          <section className="mb-10 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-semibold">AI assistance</h2>
            <p className="mt-2 text-sm text-slate-600">
              {report.assistance.summary}
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
              {report.assistance.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-400">
              Advisory only. Observed evidence is shown separately above.
            </p>
          </section>
        ) : null}
        {message ? (
          <p
            role="status"
            className="fixed right-5 bottom-5 rounded-lg bg-slate-950 px-4 py-3 text-sm text-white"
          >
            {message}
          </p>
        ) : null}
      </div>
    </main>
  );
}
