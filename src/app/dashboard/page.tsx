"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  deleteScanFromHistory,
  getScanHistory,
  loginUser,
  logoutUser,
  searchScanHistory,
  type StoredScan,
  type StoredUser,
} from "@/lib/user-history";

export default function DashboardPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState<StoredScan[]>(() => getScanHistory());

  const filteredHistory = useMemo(() => {
    if (query.trim()) {
      return searchScanHistory(query);
    }

    return history;
  }, [history, query]);

  function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail) {
      return;
    }

    const nextUser = loginUser(trimmedName, trimmedEmail);
    setUser(nextUser);
    setHistory(getScanHistory());
  }

  function handleLogout() {
    logoutUser();
    setUser(null);
    setHistory([]);
  }

  function handleDelete(id: string) {
    deleteScanFromHistory(id);
    setHistory(getScanHistory());
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
        <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Launch Check</p>
          <h1 className="mt-4 text-3xl font-semibold text-slate-950">Welcome back</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Sign in to view your saved scans and manage your history.
          </p>
          <form className="mt-6 space-y-4" onSubmit={handleLogin}>
            <input
              className="w-full rounded-full border border-slate-200 px-4 py-3"
              placeholder="Your name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              className="w-full rounded-full border border-slate-200 px-4 py-3"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <button className="rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white" type="submit">
              Sign in
            </button>
          </form>
          <Link className="mt-6 inline-block text-sm font-medium text-blue-600" href="/">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-950">Hello, {user.name}</h1>
              <p className="mt-2 text-sm text-slate-600">{user.email}</p>
            </div>
            <div className="flex gap-3">
              <Link className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700" href="/">
                Home
              </Link>
              <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white" onClick={handleLogout} type="button">
                Logout
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Scan history</h2>
              <p className="mt-2 text-sm text-slate-600">Search, review, and remove recent scans.</p>
            </div>
            <input
              className="w-full rounded-full border border-slate-200 px-4 py-3 lg:max-w-sm"
              placeholder="Search scan history"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <div className="mt-6 space-y-3">
            {filteredHistory.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No scans yet.</p>
            ) : (
              filteredHistory.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-slate-900">{item.pageTitle}</p>
                    <p className="text-sm text-slate-600">{item.url}</p>
                    <p className="text-sm text-slate-500">{item.summary}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link className="rounded-full border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700" href={`/history/${item.id}`}>
                      View
                    </Link>
                    <button className="rounded-full border border-red-200 px-3 py-2 text-sm font-medium text-red-600" onClick={() => handleDelete(item.id)} type="button">
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
