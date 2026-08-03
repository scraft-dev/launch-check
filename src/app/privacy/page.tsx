import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
          Privacy policy
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Launch Check keeps beta usage lightweight and transparent.
        </h1>
        <p className="text-base leading-8 text-slate-600">
          During the beta period, Launch Check stores basic scan history in the
          browser for convenience. No sensitive account data, API keys, or
          payment credentials are collected or logged in this prototype.
        </p>
        <p className="text-base leading-8 text-slate-600">
          The public beta experience is intentionally local-first so teams can
          validate the workflow without relying on external services.
        </p>
        <Link
          href="/terms"
          className="w-fit rounded-full bg-blue-600 px-4 py-3 font-medium text-white"
        >
          Read terms of service
        </Link>
      </div>
    </main>
  );
}
