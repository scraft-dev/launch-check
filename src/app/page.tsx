"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildScanReport,
  getUrlValidationError,
  getUserFriendlyScanError,
  normalizeWebsiteUrl,
  type ScanErrorResponse,
  type ScanResponse,
} from "@/lib/scan";
import type { ScanAnalysis } from "@/lib/ai-analysis";
import { getSafeCrawlConfig } from "@/lib/crawl";
import {
  getScanHistory,
  saveScanToHistory,
  type StoredScan,
} from "@/lib/user-history";
import { getStoredLocale, setStoredLocale, type AppLocale } from "@/lib/locale";

type ScanResult = ScanResponse & {
  analysis?: ScanAnalysis;
  crawlSummary?: string;
};

export default function Home() {
  const router = useRouter();
  const abortController = useRef<AbortController | null>(null);
  const [locale, setLocale] = useState<AppLocale>("en");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [multiPage, setMultiPage] = useState(false);
  const [detailed, setDetailed] = useState(false);
  const [recentScans, setRecentScans] = useState<StoredScan[]>([]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setLocale(getStoredLocale());
      setRecentScans(getScanHistory().slice(0, 3));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    const startedAt = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - startedAt) / 1000)),
      250,
    );
    return () => window.clearInterval(timer);
  }, [isScanning]);

  const isJapanese = locale === "ja";
  const stage = elapsed < 2 ? 0 : elapsed < 5 ? 1 : 2;
  const stages = isJapanese
    ? ["サイトへ接続", "品質項目を解析", "結果を整理"]
    : ["Connecting", "Analyzing quality", "Preparing results"];

  function changeLocale(next: AppLocale) {
    setLocale(next);
    setStoredLocale(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedUrl = normalizeWebsiteUrl(url);
    setUrl(normalizedUrl);
    const validationError = getUrlValidationError(normalizedUrl);
    if (validationError) {
      setError(
        isJapanese
          ? "公開されているWebサイトのURLを入力してください。"
          : validationError,
      );
      return;
    }

    const controller = new AbortController();
    abortController.current = controller;
    setError("");
    setElapsed(0);
    setIsScanning(true);

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          url: normalizedUrl,
          multiPage,
          detailed,
          crawlConfig: getSafeCrawlConfig(multiPage ? 4 : 1),
        }),
      });
      const data = (await response.json()) as ScanResult | ScanErrorResponse;
      if (!response.ok || "error" in data) {
        const message = "error" in data ? data.error : "Scan failed";
        throw new Error(getUserFriendlyScanError(message));
      }

      const report = buildScanReport(data);
      saveScanToHistory({
        url: data.url,
        finalUrl: data.finalUrl,
        pageTitle: data.pageTitle,
        httpStatus: data.httpStatus,
        loadTime: data.loadTime,
        summary: report.summary,
      });
      window.sessionStorage.setItem(
        "launch-check-latest-result",
        JSON.stringify(data),
      );
      router.push("/results");
    } catch (scanError) {
      if (
        scanError instanceof DOMException &&
        scanError.name === "AbortError"
      ) {
        setError(isJapanese ? "スキャンを中止しました。" : "Scan cancelled.");
      } else {
        setError(
          isJapanese
            ? "サイトを確認できませんでした。URLまたはサイトの公開状態を確認してください。"
            : scanError instanceof Error
              ? scanError.message
              : "Unable to scan this website right now.",
        );
      }
    } finally {
      abortController.current = null;
      setIsScanning(false);
    }
  }

  function cancelScan() {
    abortController.current?.abort();
  }

  return (
    <div className="launch-shell min-h-screen px-4 py-5 text-slate-900 sm:px-6 lg:px-8 lg:py-8">
      <main className="mx-auto max-w-6xl">
        <header className="mb-5 flex items-center justify-between px-1">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-200">
              LC
            </span>
            <span className="font-semibold tracking-[0.14em] text-slate-900">
              LAUNCH CHECK
            </span>
          </div>
          <div className="flex items-center gap-5 text-sm">
            <nav
              className="hidden gap-5 text-slate-600 md:flex"
              aria-label={isJapanese ? "主要メニュー" : "Primary navigation"}
            >
              <Link href="/docs">{isJapanese ? "使い方" : "Docs"}</Link>
              <Link href="/pricing">{isJapanese ? "料金" : "Pricing"}</Link>
              <Link href="/dashboard">{isJapanese ? "履歴" : "History"}</Link>
            </nav>
            <div className="flex items-center gap-2 rounded-full border border-white/80 bg-white/70 p-1 backdrop-blur">
              <button
                type="button"
                aria-pressed={isJapanese}
                onClick={() => changeLocale("ja")}
                className={`rounded-full px-3 py-1.5 ${isJapanese ? "bg-blue-600 font-semibold text-white" : "text-slate-500"}`}
              >
                日本語
              </button>
              <button
                type="button"
                aria-pressed={!isJapanese}
                onClick={() => changeLocale("en")}
                className={`rounded-full px-3 py-1.5 ${!isJapanese ? "bg-blue-600 font-semibold text-white" : "text-slate-500"}`}
              >
                English
              </button>
            </div>
          </div>
        </header>

        <section className="hero-panel rounded-[2rem] border border-white/80 bg-white/90 p-7 backdrop-blur-sm sm:p-10 lg:p-14">
          <div className="relative z-10 grid gap-10 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
            <div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-emerald-700">
                  LIVE
                </span>
                <span className="text-xs font-medium tracking-[.16em] text-blue-600">
                  WEBSITE QUALITY SCAN
                </span>
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {isJapanese
                  ? "公開前に、直すべき場所が分かる。"
                  : "Know what to fix before launch."}
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                {isJapanese
                  ? "URLを入れるだけ。表示状態、速度、SEO、アクセシビリティを確認し、優先順位を付けて返します。"
                  : "Enter a URL to check availability, speed, SEO, and accessibility—ordered by priority."}
              </p>

              <form className="mt-8" onSubmit={handleSubmit}>
                <label
                  htmlFor="website-url"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  {isJapanese ? "確認するWebサイト" : "Website to scan"}
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id="website-url"
                    name="url"
                    autoComplete="url"
                    inputMode="url"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-base text-slate-800 shadow-[0_12px_35px_-24px_rgba(15,23,42,.6)] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    placeholder="example.com"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setError("");
                    }}
                    disabled={isScanning}
                  />
                  {isScanning ? (
                    <button
                      type="button"
                      onClick={cancelScan}
                      className="rounded-2xl border border-slate-300 bg-white px-7 py-4 font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {isJapanese ? "中止" : "Cancel"}
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="scan-button rounded-2xl bg-blue-600 px-8 py-4 font-semibold text-white transition-all hover:bg-blue-700"
                    >
                      {isJapanese ? "無料で確認" : "Scan free"}
                    </button>
                  )}
                </div>

                <div className="mt-4 flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={multiPage}
                      onChange={(event) => setMultiPage(event.target.checked)}
                      disabled={isScanning}
                    />
                    {isJapanese ? "内部ページも確認" : "Scan internal pages"}
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={detailed}
                      onChange={(event) => setDetailed(event.target.checked)}
                      disabled={isScanning}
                    />
                    {isJapanese
                      ? "詳細ブラウザ診断（時間がかかります）"
                      : "Detailed browser scan (slower)"}
                  </label>
                </div>
              </form>

              {isScanning ? (
                <div
                  className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5"
                  role="status"
                  aria-live="polite"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-blue-900">
                      {stages[stage]}
                    </span>
                    <span className="font-mono text-blue-700">{elapsed}s</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${33 + stage * 30}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                    {stages.map((item, index) => (
                      <span
                        key={item}
                        className={
                          index <= stage ? "font-medium text-blue-700" : ""
                        }
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
              {error ? (
                <p
                  className="mt-4 border-l-2 border-red-500 pl-3 text-sm text-red-700"
                  role="alert"
                >
                  {error}
                </p>
              ) : null}

              {recentScans.length > 0 && !isScanning ? (
                <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
                  <span className="mr-1 text-slate-500">
                    {isJapanese ? "最近の確認" : "Recent"}
                  </span>
                  {recentScans.map((scan) => (
                    <button
                      type="button"
                      key={scan.id}
                      onClick={() => setUrl(scan.finalUrl)}
                      className="max-w-52 truncate rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:border-blue-300"
                    >
                      {scan.pageTitle || scan.finalUrl}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="hidden lg:block">
              <div className="relative mx-auto aspect-square max-w-[22rem]">
                <div className="absolute inset-0 rounded-full border border-blue-100 bg-blue-50/60" />
                <div className="absolute inset-[14%] rounded-full border border-blue-200 bg-white/80 shadow-xl shadow-blue-100/60" />
                <div className="absolute inset-[29%] grid place-items-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-300">
                  <div className="text-center">
                    <p className="text-5xl font-semibold">4</p>
                    <p className="mt-1 text-xs tracking-[.18em]">CHECKS</p>
                  </div>
                </div>
                {["SEO", "A11Y", "SPEED", "LINKS"].map((item, index) => (
                  <span
                    key={item}
                    className={`absolute rounded-full border border-blue-100 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm ${index === 0 ? "top-[4%] left-[42%]" : index === 1 ? "top-[44%] right-[-2%]" : index === 2 ? "bottom-[4%] left-[38%]" : "top-[44%] left-[-3%]"}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
          {[
            [
              isJapanese ? "通常10秒以内を目標" : "Designed for a fast result",
              isJapanese
                ? "基本診断を先に返します"
                : "Core checks return first",
            ],
            [
              isJapanese ? "保存はこの端末のみ" : "Stored on this device",
              isJapanese
                ? "URLと履歴を外部公開しません"
                : "History is not published",
            ],
            [
              isJapanese ? "サイトへ変更を加えません" : "Read-only checks",
              isJapanese
                ? "公開ページを低負荷で確認します"
                : "Low-impact public page scan",
            ],
          ].map(([title, body]) => (
            <div key={title} className="bg-white/80 p-6">
              <p className="font-semibold text-slate-900">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
            </div>
          ))}
        </section>

        <footer className="flex flex-col gap-3 px-1 py-8 text-xs leading-5 text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            {isJapanese
              ? "診断結果は改善の目安です。サイトの品質や安全性を保証するものではありません。"
              : "Results are guidance and do not guarantee website quality or security."}
          </p>
          <div className="flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <span>Operated by S.Craft</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
