"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  buildScanReport,
  exportScanReport,
  type IssueSeverity,
  type ScanResponse,
} from "@/lib/scan";
import type { ScanAnalysis } from "@/lib/ai-analysis";
import {
  getStoredLocale,
  localizeIssue,
  setStoredLocale,
  type AppLocale,
} from "@/lib/locale";

type StoredResult = ScanResponse & { analysis?: ScanAnalysis };

const severityPenalty: Record<IssueSeverity, number> = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
};

export default function ResultsPage() {
  const [result, setResult] = useState<StoredResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("en");
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const storedLocale = getStoredLocale();
      setLocale(storedLocale);
      window.document.documentElement.lang = storedLocale;
      const stored = window.sessionStorage.getItem(
        "launch-check-latest-result",
      );
      if (stored) {
        try {
          setResult(JSON.parse(stored) as StoredResult);
        } catch {
          window.sessionStorage.removeItem("launch-check-latest-result");
        }
      }
      setLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const report = useMemo(
    () => (result ? buildScanReport(result) : null),
    [result],
  );
  const isJapanese = locale === "ja";

  function changeLocale(next: AppLocale) {
    setLocale(next);
    setStoredLocale(next);
  }

  function downloadJson() {
    if (!result) return;
    const blob = new Blob([exportScanReport(result)], {
      type: "application/json",
    });
    const href = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = href;
    anchor.download = `launch-check-${new URL(result.finalUrl).hostname}.json`;
    anchor.click();
    window.URL.revokeObjectURL(href);
    setActionMessage(isJapanese ? "JSONを保存しました。" : "JSON saved.");
  }

  async function shareResult() {
    if (!result || !report) return;
    const text = isJapanese
      ? `${result.pageTitle}：総合スコア ${report.launchScore}/100、改善項目 ${report.issues.length}件`
      : `${result.pageTitle}: score ${report.launchScore}/100 with ${report.issues.length} issue(s)`;
    if (navigator.share) {
      await navigator.share({ title: "Launch Check", text });
      setActionMessage(isJapanese ? "共有しました。" : "Shared.");
    } else {
      await navigator.clipboard.writeText(text);
      setActionMessage(
        isJapanese ? "結果をコピーしました。" : "Result copied.",
      );
    }
  }

  if (!loaded) return <main className="result-shell min-h-screen" />;

  if (!result || !report) {
    return (
      <main className="result-shell min-h-screen px-5 py-16 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold">
            {isJapanese ? "表示できる結果がありません" : "No scan result found"}
          </h1>
          <p className="mt-3 text-slate-600">
            {isJapanese
              ? "結果はスキャンを実行した端末の同じタブに保存されます。"
              : "Results are stored in the same browser tab that ran the scan."}
          </p>
          <Link className="mt-6 inline-block text-blue-700 underline" href="/">
            {isJapanese ? "スキャン画面へ戻る" : "Return to scan"}
          </Link>
        </div>
      </main>
    );
  }

  const healthyChecks = [
    result.httpStatus < 400
      ? isJapanese
        ? "ページへ正常に接続できました"
        : "Page is reachable"
      : null,
    result.pageErrors.length === 0
      ? isJapanese
        ? "ページ実行エラーは見つかりませんでした"
        : "No runtime errors detected"
      : null,
    result.failedRequests.length === 0
      ? isJapanese
        ? "読み込み失敗は見つかりませんでした"
        : "No failed requests detected"
      : null,
    result.loadTime < 3000
      ? isJapanese
        ? "応答速度は3秒以内です"
        : "Response completed within 3 seconds"
      : null,
  ].filter(Boolean) as string[];
  const severityLabels: Record<IssueSeverity, string> = isJapanese
    ? { critical: "緊急", high: "重要", medium: "注意", low: "軽微" }
    : { critical: "Critical", high: "High", medium: "Medium", low: "Low" };

  return (
    <main className="result-shell min-h-screen px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <Link className="font-semibold text-blue-700" href="/">
            Launch Check
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <button
              type="button"
              aria-pressed={isJapanese}
              onClick={() => changeLocale("ja")}
              className={
                isJapanese ? "font-semibold text-blue-700" : "text-slate-500"
              }
            >
              日本語
            </button>
            <span className="text-slate-300">/</span>
            <button
              type="button"
              aria-pressed={!isJapanese}
              onClick={() => changeLocale("en")}
              className={
                !isJapanese ? "font-semibold text-blue-700" : "text-slate-500"
              }
            >
              English
            </button>
          </div>
        </header>

        <section className="py-9 sm:py-14">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
              {result.scanMode === "browser"
                ? isJapanese
                  ? "詳細診断"
                  : "Detailed scan"
                : isJapanese
                  ? "高速診断"
                  : "Fast scan"}
            </span>
            <span className="break-all font-normal text-slate-500">
              {result.finalUrl}
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                {isJapanese ? "スキャン結果" : "Scan result"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
                {result.pageTitle || result.finalUrl}
              </h1>
            </div>
            <div
              className="score-ring mx-auto shrink-0 sm:mx-0"
              style={{ "--score": `${report.launchScore}%` } as CSSProperties}
            >
              <div className="text-center">
                <p className="text-4xl font-semibold text-slate-950">
                  {report.launchScore}
                </p>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {isJapanese ? "総合スコア" : "Score"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid overflow-hidden rounded-2xl border border-white/80 bg-white/80 shadow-[0_24px_70px_-50px_rgba(15,23,42,.65)] sm:grid-cols-3">
          {[
            [
              isJapanese ? "HTTP状態" : "HTTP status",
              String(result.httpStatus),
            ],
            [
              isJapanese ? "応答時間" : "Response time",
              report.performance.loadTimeLabel,
            ],
            [
              isJapanese ? "改善項目" : "Issues found",
              String(report.issues.length),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-b border-slate-100 px-6 py-5 last:border-b-0 sm:border-r sm:border-b-0 sm:px-7 sm:py-6 last:border-r-0"
            >
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6">
            <h2 className="text-lg font-semibold">
              {isJapanese ? "スコアの根拠" : "How the score is calculated"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {isJapanese
                ? "100点から問題の重要度に応じて減点しています。"
                : "The score starts at 100 and subtracts points by severity."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {(["critical", "high", "medium", "low"] as IssueSeverity[]).map(
                (severity) => (
                  <div
                    key={severity}
                    className="flex justify-between border-b border-slate-200 py-2"
                  >
                    <span>
                      {severityLabels[severity]} ×{" "}
                      {report.severitySummary[severity]}
                    </span>
                    <span className="font-mono text-slate-500">
                      -{severityPenalty[severity]}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
            <h2 className="text-lg font-semibold text-emerald-950">
              {isJapanese ? "問題がなかった項目" : "Checks that passed"}
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-emerald-900">
              {healthyChecks.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="py-10 sm:py-14">
          <h2 className="text-2xl font-semibold">
            {isJapanese ? "改善項目" : "Issues to improve"}
          </h2>
          <p className="mt-2 text-slate-600">
            {isJapanese
              ? `影響が大きい順に全${report.issues.length}件を表示しています。`
              : `All ${report.issues.length} issue(s), ordered by impact.`}
          </p>
          <div className="mt-7 divide-y divide-slate-200 border-t border-slate-200">
            {report.issues.length ? (
              report.issues.map((rawIssue, index) => {
                const issue = localizeIssue(locale, rawIssue);
                const difficulty =
                  rawIssue.severity === "critical" ||
                  rawIssue.severity === "high"
                    ? isJapanese
                      ? "要調査・30分以上"
                      : "Investigate · 30+ min"
                    : rawIssue.severity === "medium"
                      ? isJapanese
                        ? "標準・15〜30分"
                        : "Standard · 15–30 min"
                      : isJapanese
                        ? "簡単・15分以内"
                        : "Quick · under 15 min";
                return (
                  <article
                    key={`${rawIssue.title}-${index}`}
                    className="grid gap-3 py-6 sm:grid-cols-[3rem_1fr]"
                  >
                    <span className="text-sm text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">{issue.title}</h3>
                        <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                          {severityLabels[rawIssue.severity]}
                        </span>
                        <span className="text-xs text-slate-400">
                          {difficulty}
                        </span>
                      </div>
                      <p className="mt-2 leading-7 text-slate-600">
                        {issue.recommendation ?? issue.detail}
                      </p>
                      {rawIssue.pageUrl ? (
                        <p className="mt-2 break-all text-xs text-slate-400">
                          {rawIssue.pageUrl}
                        </p>
                      ) : null}
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="py-7 text-slate-600">
                {isJapanese
                  ? "大きな問題は見つかりませんでした。"
                  : "No significant issues were found."}
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-wrap gap-3 border-t border-slate-200 pt-7 print:hidden">
          <Link
            href="/"
            className="rounded-xl bg-blue-700 px-5 py-3 font-medium text-white"
          >
            {isJapanese ? "別のURLを確認" : "Scan another URL"}
          </Link>
          <button
            type="button"
            onClick={downloadJson}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700"
          >
            JSON
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700"
          >
            {isJapanese ? "PDF保存・印刷" : "Save PDF / Print"}
          </button>
          <button
            type="button"
            onClick={shareResult}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium text-slate-700"
          >
            {isJapanese ? "結果を共有" : "Share result"}
          </button>
          <a
            href={result.finalUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-3 font-medium text-blue-700 underline"
          >
            {isJapanese ? "対象サイトを開く" : "Open website"}
          </a>
        </section>
        {actionMessage ? (
          <p className="mt-3 text-sm text-emerald-700" role="status">
            {actionMessage}
          </p>
        ) : null}

        <footer className="mt-10 border-t border-slate-200 py-8 text-xs leading-5 text-slate-500">
          <p>
            {isJapanese
              ? "結果は公開ページを自動確認した時点の目安です。品質、安全性、検索順位を保証するものではありません。共有ボタンは要約のみを共有し、診断データを公開URLとして保存しません。"
              : "Results are point-in-time guidance and do not guarantee quality, security, or search rankings. Sharing sends only a summary; scan data is not published at a public URL."}
          </p>
        </footer>
      </div>
    </main>
  );
}
