import Link from "next/link";

const sections = [
  {
    title: "Quick start",
    body: "Paste a public website URL, choose a scan type, and review the launch score and issues surfaced by Launch Check.",
  },
  {
    title: "Multi-page scanning",
    body: "Enable multi-page mode to crawl internal links up to a configurable cap and collect a site-wide summary.",
  },
  {
    title: "Subscription and billing",
    body: "Plans are summarized on the pricing page, and the success and cancel flows are modeled locally for product validation.",
  },
];

export default function DocsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
            Documentation
          </p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
            How Launch Check works.
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            This page summarizes the core workflows for beta users and early
            adopters.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/faq"
            className="rounded-full bg-blue-600 px-4 py-3 font-medium text-white"
          >
            Read FAQ
          </Link>
          <Link
            href="/privacy"
            className="rounded-full border border-slate-300 px-4 py-3 font-medium text-slate-700"
          >
            Privacy policy
          </Link>
        </div>
      </div>
    </main>
  );
}
