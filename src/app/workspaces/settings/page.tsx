"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Workspace } from "@/lib/workspaces";

export default function WorkspaceSettingsPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState("");
  const [shareScanHistory, setShareScanHistory] = useState(false);
  const [allowMemberInvites, setAllowMemberInvites] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/workspaces");
      const data = (await response.json()) as Workspace[];
      const first = data[0];
      if (first) {
        setWorkspace(first);
        setName(first.name);
        setShareScanHistory(first.shareScanHistory);
        setAllowMemberInvites(first.settings.allowMemberInvites === true);
      }
    })();
  }, []);

  async function handleSave() {
    if (!workspace) {
      return;
    }
    const response = await fetch("/api/workspaces", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: workspace.id,
        actorId: "demo-owner",
        actorRole: "owner",
        updates: {
          name,
          shareScanHistory,
          settings: {
            allowMemberInvites,
            requireApprovalForPublicLinks: false,
          },
        },
      }),
    });
    const data = (await response.json()) as unknown;
    if (!response.ok) {
      const errorData = data as { error?: string };
      setMessage(errorData.error ?? "Unable to update workspace");
      return;
    }
    setWorkspace(data as Workspace);
    setMessage("Workspace settings updated");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Workspace settings
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Configure workspace behavior
          </h1>
          <div className="mt-4 flex gap-3">
            <Link
              href="/workspaces"
              className="text-sm font-medium text-blue-600"
            >
              Back to workspaces
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700">
            Workspace name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
          />
          <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={shareScanHistory}
              onChange={() => setShareScanHistory((value) => !value)}
            />
            Share scan history with workspace members
          </label>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allowMemberInvites}
              onChange={() => setAllowMemberInvites((value) => !value)}
            />
            Allow member invites
          </label>
          <button
            className="mt-6 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
            onClick={() => void handleSave()}
          >
            Save settings
          </button>
          {message ? (
            <p className="mt-3 text-sm text-slate-600">{message}</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
