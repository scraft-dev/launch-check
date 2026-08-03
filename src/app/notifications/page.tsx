"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { DeliveryLog, NotificationProvider } from "@/lib/notifications";

export default function NotificationsPage() {
  const [configured, setConfigured] = useState({
    slack: false,
    discord: false,
  });
  const [deliveries, setDeliveries] = useState<DeliveryLog[]>([]);
  const [scanCompleted, setScanCompleted] = useState(true);
  const [criticalAlerts, setCriticalAlerts] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<NotificationProvider | null>(null);

  function refresh() {
    fetch("/api/notifications")
      .then((response) => response.json())
      .then(
        (data: {
          configured?: typeof configured;
          deliveries?: DeliveryLog[];
          preferences?: {
            scanCompleted: boolean;
            criticalAlerts: boolean;
          };
        }) => {
          if (data.configured) setConfigured(data.configured);
          if (data.deliveries) setDeliveries(data.deliveries);
          if (data.preferences) {
            setScanCompleted(data.preferences.scanCompleted);
            setCriticalAlerts(data.preferences.criticalAlerts);
          }
        },
      )
      .catch(() => setMessage("Unable to load notification settings."));
  }

  useEffect(refresh, []);

  async function testConnection(provider: NotificationProvider) {
    setBusy(provider);
    setMessage("");
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", provider }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Connection test failed");
      }
      setMessage(
        `${provider === "slack" ? "Slack" : "Discord"} connection verified.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Connection test failed",
      );
    } finally {
      setBusy(null);
    }
  }

  async function savePreferences() {
    setMessage("");
    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "preferences",
        provider: "slack",
        preferences: { scanCompleted, criticalAlerts },
      }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Notification preferences saved."
        : (result.error ?? "Unable to save preferences."),
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Team notifications
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Slack and Discord</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Deliver scan summaries and critical alerts with safe retries.
            Credentials stay in the server environment and are never displayed
            here.
          </p>
          <div className="mt-5 flex gap-4 text-sm font-medium text-blue-600">
            <Link href="/">Back to Home</Link>
            <Link href="/integrations">All integrations</Link>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {(["slack", "discord"] as const).map((provider) => (
            <div
              key={provider}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold capitalize">{provider}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${configured[provider] ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                >
                  {configured[provider]
                    ? "Configured"
                    : "Configuration required"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {provider === "slack"
                  ? "Uses a bot token and channel ID configured on the server."
                  : "Uses a Discord webhook URL configured on the server."}
              </p>
              <button
                className="mt-5 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                disabled={!configured[provider] || busy !== null}
                onClick={() => testConnection(provider)}
              >
                {busy === provider ? "Checking…" : "Test connection"}
              </button>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Notification preferences</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={scanCompleted}
                onChange={(event) => setScanCompleted(event.target.checked)}
              />
              Scan completion notifications
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={criticalAlerts}
                onChange={(event) => setCriticalAlerts(event.target.checked)}
              />
              Critical issue alerts
            </label>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Current choice: completion {scanCompleted ? "on" : "off"}, critical
            alerts {criticalAlerts ? "on" : "off"}.
          </p>
          <button
            className="mt-4 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            onClick={savePreferences}
          >
            Save preferences
          </button>
          {message && (
            <p className="mt-4 text-sm text-slate-700" role="status">
              {message}
            </p>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Recent delivery log</h2>
          {deliveries.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">
              No delivery attempts yet.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {deliveries.slice(0, 20).map((delivery) => (
                <li
                  key={delivery.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold capitalize">
                      {delivery.provider} · {delivery.kind.replace("_", " ")}
                    </span>
                    <span
                      className={
                        delivery.status === "delivered"
                          ? "text-emerald-700"
                          : "text-red-700"
                      }
                    >
                      {delivery.status}
                    </span>
                  </div>
                  <p className="mt-2 text-slate-600">
                    Scan {delivery.scanId} · {delivery.attempts.length}{" "}
                    attempt(s)
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
