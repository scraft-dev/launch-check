import Link from "next/link";

export default function BillingSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-300">
          Payment success
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Your subscription is active.
        </h1>
        <p className="text-lg text-slate-300">
          This flow is a local prototype for Sprint 6. In production it would
          confirm the Stripe checkout session and redirect back here.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-full bg-emerald-500 px-4 py-3 font-medium text-slate-950"
          >
            Back to pricing
          </Link>
          <Link
            href="/"
            className="rounded-full border border-slate-700 px-4 py-3 text-slate-200"
          >
            Return home
          </Link>
        </div>
      </div>
    </main>
  );
}
