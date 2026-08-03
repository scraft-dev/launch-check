"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Workspace } from "@/lib/workspaces";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function loadWorkspaces() {
    const response = await fetch("/api/workspaces");
    const data = (await response.json()) as Workspace[];
    setWorkspaces(data);
  }

  useEffect(() => {
    let cancelled = false;

    void fetch("/api/workspaces")
      .then((response) => response.json() as Promise<Workspace[]>)
      .then((data) => {
        if (!cancelled) {
          setWorkspaces(data);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        ownerId: "demo-owner",
        shareScanHistory: true,
        settings: { allowMemberInvites: true },
      }),
    });
    const data = (await response.json()) as unknown;
    if (!response.ok) {
      const errorData = data as { error?: string };
      setMessage(errorData.error ?? "Unable to create workspace");
      return;
    }
    const workspace = data as Workspace;
    setName("");
    setMessage(`Created ${workspace.name}`);
    await loadWorkspaces();
  }

  async function handleDelete(id: string) {
    const response = await fetch("/api/workspaces", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, actorId: "demo-owner", actorRole: "owner" }),
    });
    const data = (await response.json()) as {
      deleted?: boolean;
      error?: string;
    };
    if (data.error) {
      setMessage(data.error);
      return;
    }
    setMessage("Workspace deleted");
    await loadWorkspaces();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Workspaces
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Manage team workspaces
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Create, edit, and remove workspaces from the UI. The page uses the
            same repository-backed service as the API, so create/update/delete
            actions operate on persisted workspace records.
          </p>
          <div className="mt-4 flex gap-3">
            <Link href="/" className="text-sm font-medium text-blue-600">
              Back to home
            </Link>
            <Link
              href="/integrations"
              className="text-sm font-medium text-blue-600"
            >
              Integrations
            </Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form
            onSubmit={handleCreate}
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold">Create workspace</h2>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2"
              placeholder="Workspace name"
            />
            <button
              className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white"
              type="submit"
            >
              Create workspace
            </button>
            {message ? (
              <p className="mt-3 text-sm text-slate-600">{message}</p>
            ) : null}
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Existing workspaces</h2>
            <ul className="mt-4 space-y-3">
              {workspaces.map((workspace) => (
                <li
                  key={workspace.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {workspace.name}
                      </p>
                      <p className="text-sm text-slate-600">
                        Shared history:{" "}
                        {workspace.shareScanHistory ? "on" : "off"}
                      </p>
                    </div>
                    <button
                      className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-700"
                      onClick={() => void handleDelete(workspace.id)}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
