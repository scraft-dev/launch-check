"use client";

import { useState } from "react";

function isValidUrl(value: string) {
  try {
    const parsedUrl = new URL(value);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [showResults, setShowResults] = useState(false);

  function handleStartScan() {
    const trimmedUrl = url.trim();

    if (!trimmedUrl || !isValidUrl(trimmedUrl)) {
      setError("Enter a valid website URL.");
      setIsScanning(false);
      setShowResults(false);
      return;
    }

    setError("");
    setShowResults(false);
    setIsScanning(true);

    window.setTimeout(() => {
      setIsScanning(false);
      setShowResults(true);
    }, 2000);
  }

  function handleReset() {
    setUrl("");
    setError("");
    setIsScanning(false);
    setShowResults(false);
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

            {error ? (
              <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
            ) : null}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-blue-100 bg-blue-50 p-8 sm:p-10">
            <p className="text-lg font-semibold text-blue-700">
              {isScanning ? "Scanning your website..." : "Ready to scan"}
            </p>
          </section>

          {showResults ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-slate-900">
                  Launch Score: 95
                </h2>
                <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  Healthy
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Critical</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">0</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">High</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">1</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Medium</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">2</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Low</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">3</p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Summary</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your website looks healthy. One issue should be reviewed before launch.
                </p>
              </div>

              <button
                type="button"
                className="mt-6 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                onClick={handleReset}
              >
                Scan another website
              </button>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
