"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type {
  AuditEvent,
  EnterpriseOrganization,
  EnterpriseRole,
} from "@/lib/enterprise";

const roles: EnterpriseRole[] = [
  "organization_owner",
  "security_admin",
  "workspace_admin",
  "analyst",
  "auditor",
];

export default function EnterprisePage() {
  const [organizations, setOrganizations] = useState<EnterpriseOrganization[]>(
    [],
  );
  const [selectedId, setSelectedId] = useState("");
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);
  const [message, setMessage] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<EnterpriseRole>("analyst");

  const selected = organizations.find((item) => item.id === selectedId);

  function refresh() {
    fetch("/api/enterprise")
      .then((response) => response.json())
      .then((data: { organizations?: EnterpriseOrganization[] }) => {
        const next = data.organizations ?? [];
        setOrganizations(next);
        setSelectedId((current) => current || next[0]?.id || "");
      })
      .catch(() => setMessage("Unable to load enterprise organizations."));
  }

  useEffect(refresh, []);

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ownerId = `owner_${Date.now()}`;
    const response = await fetch("/api/enterprise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create",
        name: form.get("name"),
        slug: form.get("slug"),
        ownerId,
        ownerEmail: form.get("ownerEmail"),
      }),
    });
    const result = (await response.json()) as {
      organization?: EnterpriseOrganization;
      error?: string;
    };
    setMessage(
      response.ok
        ? "Organization created."
        : (result.error ?? "Unable to create organization."),
    );
    if (result.organization) {
      setOrganizations((current) => [...current, result.organization!]);
      setSelectedId(result.organization.id);
      event.currentTarget.reset();
    }
  }

  async function inviteMember() {
    if (!selected || !memberEmail) return;
    const response = await fetch("/api/enterprise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "invite",
        organizationId: selected.id,
        actorId: selected.ownerId,
        email: memberEmail,
        role: memberRole,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Member invited."
        : (result.error ?? "Unable to invite member."),
    );
    if (response.ok) {
      setMemberEmail("");
      refresh();
    }
  }

  async function saveSecurity() {
    if (!selected) return;
    const response = await fetch("/api/enterprise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "security",
        organizationId: selected.id,
        actorId: selected.ownerId,
        retention: selected.retention,
        sso: selected.sso,
      }),
    });
    const result = (await response.json()) as { error?: string };
    setMessage(
      response.ok
        ? "Security settings saved."
        : (result.error ?? "Unable to save settings."),
    );
    if (response.ok) refresh();
  }

  async function loadAudit() {
    if (!selected) return;
    const response = await fetch(
      `/api/enterprise?organizationId=${encodeURIComponent(selected.id)}&actorId=${encodeURIComponent(selected.ownerId)}&view=audit`,
    );
    const result = (await response.json()) as {
      auditEvents?: AuditEvent[];
      error?: string;
    };
    setAuditEvents(result.auditEvents ?? []);
    setMessage(
      response.ok
        ? "Audit log refreshed."
        : (result.error ?? "Unable to load audit log."),
    );
  }

  function updateSelected(
    change: (organization: EnterpriseOrganization) => EnterpriseOrganization,
  ) {
    setOrganizations((current) =>
      current.map((item) => (item.id === selectedId ? change(item) : item)),
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Enterprise administration
          </p>
          <h1 className="mt-3 text-3xl font-semibold">
            Organizations, identity, and compliance
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Manage enterprise roles, SSO metadata, audit trails, and data
            retention. Identity-provider secrets remain outside Launch Check.
          </p>
          <div className="mt-5 flex gap-4 text-sm font-medium text-blue-600">
            <Link href="/">Back to Home</Link>
            <Link href="/workspaces">Workspaces</Link>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <form
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={createOrganization}
          >
            <h2 className="text-xl font-semibold">Create organization</h2>
            <div className="mt-4 grid gap-3">
              <input
                name="name"
                required
                placeholder="Organization name"
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
              <input
                name="slug"
                required
                placeholder="organization-slug"
                pattern="[a-z0-9-]{3,50}"
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
              <input
                name="ownerEmail"
                required
                type="email"
                placeholder="Owner email"
                className="rounded-2xl border border-slate-200 px-4 py-3"
              />
              <button className="rounded-full bg-blue-600 px-4 py-3 text-sm font-semibold text-white">
                Create organization
              </button>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Organizations</h2>
            {organizations.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                No enterprise organization yet.
              </p>
            ) : (
              <select
                className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3"
                value={selectedId}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name} ({organization.slug})
                  </option>
                ))}
              </select>
            )}
            {message && (
              <p className="mt-4 text-sm text-slate-700" role="status">
                {message}
              </p>
            )}
          </div>
        </section>

        {selected && (
          <>
            <section className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Members and roles</h2>
                <ul className="mt-4 space-y-2 text-sm">
                  {selected.members.map((member) => (
                    <li key={member.id} className="rounded-2xl bg-slate-50 p-3">
                      <span className="font-medium">{member.email}</span> ·{" "}
                      {member.role.replaceAll("_", " ")} · {member.status}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    placeholder="Member email"
                    className="rounded-2xl border border-slate-200 px-3 py-2"
                  />
                  <select
                    value={memberRole}
                    onChange={(event) =>
                      setMemberRole(event.target.value as EnterpriseRole)
                    }
                    className="rounded-2xl border border-slate-200 px-3 py-2"
                  >
                    {roles
                      .filter((role) => role !== "organization_owner")
                      .map((role) => (
                        <option key={role} value={role}>
                          {role.replaceAll("_", " ")}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={inviteMember}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Invite
                  </button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">SSO configuration</h2>
                <select
                  value={selected.sso?.provider ?? "oidc"}
                  onChange={(event) =>
                    updateSelected((organization) => ({
                      ...organization,
                      sso: {
                        provider: event.target.value as "saml" | "oidc",
                        issuer: organization.sso?.issuer ?? "",
                        loginUrl: organization.sso?.loginUrl ?? "",
                        status: "draft",
                        enforceForMembers: false,
                      },
                    }))
                  }
                  className="mt-4 w-full rounded-2xl border border-slate-200 px-3 py-2"
                >
                  <option value="oidc">OIDC</option>
                  <option value="saml">SAML</option>
                </select>
                <input
                  value={selected.sso?.issuer ?? ""}
                  onChange={(event) =>
                    updateSelected((organization) => ({
                      ...organization,
                      sso: {
                        provider: organization.sso?.provider ?? "oidc",
                        issuer: event.target.value,
                        loginUrl: organization.sso?.loginUrl ?? "",
                        status: "draft",
                        enforceForMembers:
                          organization.sso?.enforceForMembers ?? false,
                      },
                    }))
                  }
                  placeholder="https://identity.example.com"
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2"
                />
                <input
                  value={selected.sso?.loginUrl ?? ""}
                  onChange={(event) =>
                    updateSelected((organization) => ({
                      ...organization,
                      sso: {
                        provider: organization.sso?.provider ?? "oidc",
                        issuer: organization.sso?.issuer ?? "",
                        loginUrl: event.target.value,
                        status: "draft",
                        enforceForMembers:
                          organization.sso?.enforceForMembers ?? false,
                      },
                    }))
                  }
                  placeholder="https://identity.example.com/login"
                  className="mt-3 w-full rounded-2xl border border-slate-200 px-3 py-2"
                />
                <label className="mt-4 flex items-center gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.sso?.enforceForMembers ?? false}
                    onChange={(event) =>
                      updateSelected((organization) => ({
                        ...organization,
                        sso: {
                          provider: organization.sso?.provider ?? "oidc",
                          issuer: organization.sso?.issuer ?? "",
                          loginUrl: organization.sso?.loginUrl ?? "",
                          status: event.target.checked ? "active" : "draft",
                          enforceForMembers: event.target.checked,
                        },
                      }))
                    }
                  />{" "}
                  Enforce SSO for members
                </label>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Data retention</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {(["scanDays", "auditLogDays", "screenshotDays"] as const).map(
                  (field) => (
                    <label
                      key={field}
                      className="grid gap-2 text-sm font-medium"
                    >
                      {field.replace(/([A-Z])/g, " $1")}
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        value={selected.retention[field]}
                        onChange={(event) =>
                          updateSelected((organization) => ({
                            ...organization,
                            retention: {
                              ...organization.retention,
                              [field]: Number(event.target.value),
                            },
                          }))
                        }
                        className="rounded-2xl border border-slate-200 px-3 py-2"
                      />
                    </label>
                  ),
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={saveSecurity}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                >
                  Save security settings
                </button>
                <button
                  onClick={loadAudit}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Refresh audit log
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Audit events</h2>
              {auditEvents.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  Refresh to view traceable administration events.
                </p>
              ) : (
                <ul className="mt-4 space-y-2 text-sm">
                  {auditEvents.map((event) => (
                    <li key={event.id} className="rounded-2xl bg-slate-50 p-3">
                      <span className="font-medium">{event.action}</span> ·{" "}
                      {event.actorId} ·{" "}
                      {new Date(event.createdAt).toLocaleString()}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
