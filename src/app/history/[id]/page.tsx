"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getScanHistory, type StoredScan } from "@/lib/user-history";

export default function HistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [scan, setScan] = useState<StoredScan | null>(null);

  useEffect(() => {
    async function loadScan() {
      const resolvedParams = await params;
      const history = getScanHistory();
      const selectedScan = history.find((item) => item.id === resolvedParams.id) ?? null;
      setScan(selectedScan);
    }

    void loadScan();
  }, [params]);

  if (!scan) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Scan detail</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">Scan not found</h1>
          <Link className="mt-6 inline-block text-sm font-medium text-blue-600" href="/dashboard">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Scan detail</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-950">{scan.pageTitle}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">{scan.summary}</p>

        <div className="mt-6 space-y-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <p><span className="font-semibold text-slate-900">URL:</span> {scan.url}</p>
          <p><span className="font-semibold text-slate-900">Final URL:</span> {scan.finalUrl}</p>
          <p><span className="font-semibold text-slate-900">HTTP Status:</span> {scan.httpStatus}</p>
          <p><span className="font-semibold text-slate-900">Load Time:</span> {scan.loadTime}ms</p>
          <p><span className="font-semibold text-slate-900">Saved:</span> {new Date(scan.createdAt).toLocaleString()}</p>
        </div>

        <Link className="mt-6 inline-block text-sm font-medium text-blue-600" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
