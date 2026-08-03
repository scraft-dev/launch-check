"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buildBillingSummary,
  getBillingPlan,
  type BillingPlanId,
} from "@/lib/billing";

const planIds: BillingPlanId[] = ["starter", "growth", "enterprise"];

export default function PricingPage() {
  const [selectedPlan, setSelectedPlan] = useState<BillingPlanId>("growth");
  const [usage, setUsage] = useState(120);

  const selectedPlanData = getBillingPlan(selectedPlan);
  const summary = selectedPlanData
    ? buildBillingSummary(selectedPlan, usage)
    : null;

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">
            Billing
          </p>
          <h1 className="mt-4 text-4xl font-semibold sm:text-5xl">
            Choose the plan that fits your launch cadence.
          </h1>
          <p className="mt-4 text-lg text-slate-300">
            Launch Check supports a simple subscription model with transparent
            limits for scans and crawl depth.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 md:grid-cols-3">
            {planIds.map((planId) => {
              const plan = getBillingPlan(planId);
              if (!plan) {
                return null;
              }

              const isSelected = selectedPlan === plan.id;
              return (
                <button
                  key={plan.id}
                  type="button"
                  className={`rounded-3xl border p-6 text-left transition ${
                    isSelected
                      ? "border-blue-400 bg-blue-500/15 shadow-lg"
                      : "border-slate-800 bg-slate-900/70"
                  }`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  <p className="text-lg font-semibold">{plan.name}</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {plan.description}
                  </p>
                  <p className="mt-6 text-3xl font-semibold">
                    ${plan.priceMonthly}
                    <span className="text-base text-slate-400">/mo</span>
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300">
                    <li>
                      • {plan.limits.scansPerMonth.toLocaleString()} scans /
                      month
                    </li>
                    <li>• {plan.limits.pagesPerScan} pages per scan</li>
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">
              Subscription preview
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              {selectedPlanData?.name}
            </h2>
            <p className="mt-3 text-sm text-slate-400">
              {selectedPlanData?.description}
            </p>

            <label
              className="mt-6 block text-sm font-medium text-slate-200"
              htmlFor="usage"
            >
              Current monthly scans used
            </label>
            <input
              id="usage"
              type="number"
              min="0"
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none"
              value={usage}
              onChange={(event) => setUsage(Number(event.target.value))}
            />

            {summary ? (
              <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <p className="text-sm text-slate-400">Remaining this month</p>
                <p className="mt-2 text-3xl font-semibold">
                  {summary.remaining}
                </p>
                <p className="mt-2 text-sm text-slate-300">{summary.message}</p>
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                className="rounded-full bg-blue-600 px-4 py-3 font-medium text-white"
              >
                Start {selectedPlanData?.name} plan
              </button>
              <Link
                href="/billing/success"
                className="rounded-full border border-slate-700 px-4 py-3 text-center text-sm text-slate-200"
              >
                View success flow
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
