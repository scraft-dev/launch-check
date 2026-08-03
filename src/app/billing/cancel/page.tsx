import Link from "next/link";

export default function BillingCancelPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-300">
          Payment cancelled
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          The checkout was cancelled.
        </h1>
        <p className="text-lg text-slate-300">
          No charge was created. You can revisit the plans page and try again
          whenever you are ready.
        </p>
        <Link
          href="/pricing"
          className="w-fit rounded-full bg-amber-500 px-4 py-3 font-medium text-slate-950"
        >
          Return to pricing
        </Link>
      </div>
    </main>
  );
}
