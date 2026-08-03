import Link from "next/link";

const faqs = [
  {
    question: "How does Launch Check work?",
    answer:
      "Enter a public website URL and Launch Check will inspect the page, collect console and runtime diagnostics, and summarize launch risks.",
  },
  {
    question: "Can I scan multi-page sites?",
    answer:
      "Yes. The multi-page scan mode crawls a bounded set of internal links and aggregates issues across the site.",
  },
  {
    question: "What happens to my data?",
    answer:
      "Saved scan history stays locally in your browser so you can review it without sending data to a separate backend.",
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600">
            FAQ
          </p>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">
            Answers for teams preparing a launch.
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-slate-600">
            Launch Check is designed to be simple to understand, even as your
            website grows in complexity.
          </p>
        </header>

        <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {faqs.map((faq) => (
            <div
              key={faq.question}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <h2 className="text-lg font-semibold">{faq.question}</h2>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="rounded-full bg-blue-600 px-4 py-3 font-medium text-white"
          >
            Read docs
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
