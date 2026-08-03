"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildIntegrationSummary,
  canPerformAction,
  createIntegration,
  createWebhookDelivery,
  validateWebhookSignature,
  type IntegrationProvider,
} from "@/lib/integrations";

const providers: Array<{ id: IntegrationProvider; label: string }> = [
  { id: "github", label: "GitHub App" },
  { id: "slack", label: "Slack" },
  { id: "discord", label: "Discord" },
];

export default function IntegrationsPage() {
  const [selectedProvider, setSelectedProvider] = useState<IntegrationProvider>("github");
  const [integrations, setIntegrations] = useState(() => [
    createIntegration({
      name: "Release notifications",
      provider: "github",
      channel: "release-updates",
      permissions: ["read"],
    }),
  ]);

  const summary = useMemo(() => integrations.map(buildIntegrationSummary).join("\n"), [integrations]);

  function addIntegration() {
    const next = createIntegration({
      name: `${selectedProvider.toUpperCase()} bridge`,
      provider: selectedProvider,
      channel: `${selectedProvider}-channel`,
      permissions: ["read"],
    });
    setIntegrations((current) => [...current, next]);
  }

  function validateDemo() {
    const demoPayload = JSON.stringify({ event: "scan:completed", ok: true });
    const result = validateWebhookSignature(
      selectedProvider,
      demoPayload,
      {
        "x-hub-signature-256": "sha256=demo",
        "x-slack-signature": "v0=demo",
        "x-slack-request-timestamp": "1",
        "x-discord-signature": "demo",
      },
      "demo-secret",
    );
    alert(result.valid ? "Webhook validation passed locally" : `Webhook validation failed: ${result.error}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Integrations</p>
          <h1 className="mt-3 text-3xl font-semibold">Connected delivery and webhooks</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            This screen models GitHub App, Slack, and Discord integrations without sending real messages. External credentials are required for live delivery,
            so the UI clearly shows the pending state and the validation rules that will be enforced once secrets are configured.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="text-sm font-medium text-blue-600">Back to Home</Link>
            <Link href="/docs" className="text-sm font-medium text-blue-600">Read docs</Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Create integration</h2>
            <div className="mt-4 flex flex-col gap-3">
              <select
                className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
                value={selectedProvider}
                onChange={(event) => setSelectedProvider(event.target.value as IntegrationProvider)}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.label}
                  </option>
                ))}
              </select>
              <button
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
                onClick={addIntegration}
              >
                Add integration
              </button>
              <button
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                onClick={validateDemo}
              >
                Validate webhook demo
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Configured integrations</h2>
            <ul className="mt-4 space-y-3">
              {integrations.map((integration) => {
                const canSend = canPerformAction(integration, "send");
                const delivery = createWebhookDelivery(integration.id, "scan:completed");
                return (
                  <li key={integration.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900">{integration.name}</p>
                        <p className="text-sm text-slate-600">{integration.provider.toUpperCase()} · {integration.channel}</p>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-700">
                        {integration.status}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-slate-600">{buildIntegrationSummary(integration)}</p>
                    <p className="mt-2 text-sm text-slate-600">Webhook delivery: {delivery.status} ({delivery.eventType})</p>
                    <p className="mt-2 text-sm text-slate-600">Can send: {canSend ? "yes" : "requires write permission"}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Status summary</h2>
          <pre className="mt-4 whitespace-pre-wrap rounded-2xl bg-slate-950 p-4 text-sm text-slate-100">{summary}</pre>
        </section>
      </div>
    </main>
  );
}
