"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type Repository = {
  fullName: string;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
};

export default function GitHubPage() {
  const [configured, setConfigured] = useState(false);
  const [repository, setRepository] = useState("scraft-dev/launch-check");
  const [installationId, setInstallationId] = useState("");
  const [connected, setConnected] = useState<Repository | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/github")
      .then((response) => response.json())
      .then((data: { configured?: boolean }) =>
        setConfigured(Boolean(data.configured)),
      )
      .catch(() => setConfigured(false));
  }, []);

  async function connect(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect", repository, installationId }),
      });
      const result = (await response.json()) as {
        repository?: Repository;
        error?: string;
      };
      if (!response.ok || !result.repository)
        throw new Error(result.error ?? "Connection failed");
      setConnected(result.repository);
      setMessage("Repository connected successfully.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            GitHub Integration
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Connect a repository</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Connect a GitHub App installation to create traceable issues from
            findings, link scans to commits, and publish pull request checks.
          </p>
          <div className="mt-6 flex gap-4 text-sm font-medium text-blue-600">
            <Link href="/">Back to Home</Link>
            <Link href="/integrations">All integrations</Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">GitHub App status</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
            >
              {configured ? "Configured" : "Configuration required"}
            </span>
          </div>
          {!configured && (
            <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              Set the GitHub App ID, private key, and webhook secret in the
              server environment. Secret values are never entered or displayed
              on this page.
            </p>
          )}

          <form className="mt-6 grid gap-4" onSubmit={connect}>
            <label className="grid gap-2 text-sm font-medium">
              Repository
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3"
                value={repository}
                onChange={(event) => setRepository(event.target.value)}
                placeholder="owner/repository"
                required
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Installation ID
              <input
                className="rounded-2xl border border-slate-200 px-4 py-3"
                value={installationId}
                onChange={(event) => setInstallationId(event.target.value)}
                placeholder="GitHub App installation ID"
                required
              />
            </label>
            <button
              className="w-fit rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!configured || busy}
            >
              {busy ? "Connecting…" : "Connect repository"}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-sm text-slate-700" role="status">
              {message}
            </p>
          )}
          {connected && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">
                {connected.fullName}
              </p>
              <p className="mt-1 text-sm text-emerald-800">
                Default branch: {connected.defaultBranch} ·{" "}
                {connected.private ? "Private" : "Public"}
              </p>
              <a
                className="mt-3 inline-block text-sm font-medium text-blue-600"
                href={connected.htmlUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open repository
              </a>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
