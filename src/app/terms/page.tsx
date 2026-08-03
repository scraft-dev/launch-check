import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
          Terms of service
        </p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          Beta usage terms for Launch Check.
        </h1>
        <p className="text-base leading-8 text-slate-600">
          Launch Check is currently offered as a beta product for evaluation
          purposes. Users should not rely on the service for production-critical
          monitoring without independent validation.
        </p>
        <p className="text-base leading-8 text-slate-600">
          The prototype is designed to demonstrate core product workflows and
          may change before general availability.
        </p>
        <Link
          href="/"
          className="w-fit rounded-full border border-slate-300 px-4 py-3 font-medium text-slate-700"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
