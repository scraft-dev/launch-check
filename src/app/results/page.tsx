"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { buildScanReport, type ScanResponse } from "@/lib/scan";
import type { ScanAnalysis } from "@/lib/ai-analysis";
import {
  getStoredLocale,
  localizeIssue,
  setStoredLocale,
  type AppLocale,
} from "@/lib/locale";

type StoredResult = ScanResponse & { analysis?: ScanAnalysis };

export default function ResultsPage() {
  const [result, setResult] = useState<StoredResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [locale, setLocale] = useState<AppLocale>("en");

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLocale(getStoredLocale());
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

  function changeLocale(nextLocale: AppLocale) {
    setLocale(nextLocale);
    setStoredLocale(nextLocale);
  }

  if (!loaded) {
    return <main className="min-h-screen bg-slate-50" />;
  }

  if (!result || !report) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-16 text-slate-900">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-semibold">
            {isJapanese ? "表示できる結果がありません" : "No scan result found"}
          </h1>
          <Link className="mt-6 inline-block text-blue-700 underline" href="/">
            {isJapanese ? "スキャン画面へ戻る" : "Return to scan"}
          </Link>
        </div>
      </main>
    );
  }

  const priorityIssues = report.issues.slice(0, 5);

  return (
    <main className="result-shell min-h-screen px-5 py-8 text-slate-900 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-slate-200 pb-5">
          <Link className="font-semibold text-blue-700" href="/">
            Launch Check
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => changeLocale("ja")}
              className={isJapanese ? "font-semibold" : "text-slate-500"}
            >
              日本語
            </button>
            <span className="text-slate-300">/</span>
            <button
              onClick={() => changeLocale("en")}
              className={!isJapanese ? "font-semibold" : "text-slate-500"}
            >
              English
            </button>
          </div>
        </header>

        <section className="py-10 sm:py-14">
          <p className="text-sm text-slate-500 break-all">{result.finalUrl}</p>
          <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700">
                {isJapanese ? "スキャン結果" : "Scan result"}
              </p>
              <h1 className="mt-2 text-3xl font-semibold sm:text-5xl">
                {result.pageTitle || result.finalUrl}
              </h1>
            </div>
            <div
              className="score-ring shrink-0"
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

        {result.notice ? (
          <p className="mb-8 border-l-2 border-amber-500 pl-4 text-sm leading-6 text-amber-800">
            {isJapanese
              ? "今回は簡易スキャンで結果を取得しました。ブラウザエラーと画面画像は含まれていません。"
              : result.notice}
          </p>
        ) : null}

        <section className="grid overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-[0_24px_70px_-50px_rgba(15,23,42,.65)] backdrop-blur sm:grid-cols-3">
          {[
            [
              isJapanese ? "HTTP状態" : "HTTP status",
              String(result.httpStatus),
            ],
            [
              isJapanese ? "読込時間" : "Load time",
              `${(result.loadTime / 1000).toFixed(1)}s`,
            ],
            [
              isJapanese ? "検出項目" : "Issues found",
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

        <section className="py-10 sm:py-14">
          <h2 className="text-2xl font-semibold">
            {isJapanese ? "優先して確認する項目" : "What to check first"}
          </h2>
          <p className="mt-2 text-slate-600">
            {isJapanese
              ? "影響が大きい順に、最初の5件を表示しています。"
              : "The first five items are ordered by impact."}
          </p>
          <div className="mt-7 divide-y divide-slate-200 border-t border-slate-200">
            {priorityIssues.length ? (
              priorityIssues.map((rawIssue, index) => {
                const issue = localizeIssue(locale, rawIssue);
                const severity = isJapanese
                  ? {
                      critical: "緊急",
                      high: "重要",
                      medium: "注意",
                      low: "軽微",
                    }[rawIssue.severity]
                  : rawIssue.severity;

                return (
                  <article
                    key={`${issue.title}-${index}`}
                    className="grid gap-3 py-6 sm:grid-cols-[3rem_1fr]"
                  >
                    <span className="text-sm text-slate-400">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-semibold">{issue.title}</h3>
                        <span className="text-xs uppercase tracking-wide text-blue-700">
                          {severity}
                        </span>
                      </div>
                      <p className="mt-2 leading-7 text-slate-600">
                        {issue.recommendation ?? issue.detail}
                      </p>
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

        <div className="flex flex-wrap gap-4 border-t border-slate-200 pt-7 pb-14">
          <Link
            href="/"
            className="bg-blue-700 px-5 py-3 font-medium text-white"
          >
            {isJapanese ? "別のURLを確認する" : "Scan another URL"}
          </Link>
          <a
            href={result.finalUrl}
            target="_blank"
            rel="noreferrer"
            className="px-5 py-3 font-medium text-blue-700 underline"
          >
            {isJapanese ? "対象サイトを開く" : "Open website"}
          </a>
        </div>
      </div>
    </main>
  );
}
