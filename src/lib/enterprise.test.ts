import assert from "node:assert/strict";
import test from "node:test";
import {
  EnterpriseService,
  MemoryEnterpriseRepository,
  addEnterpriseMember,
  applyAuditRetention,
  canEnterpriseMember,
  configureSso,
  createAuditEvent,
  createEnterpriseOrganization,
  permissionsForRole,
  runComplianceReview,
  updateEnterpriseMemberRole,
  updateRetentionPolicy,
} from "./enterprise";

test("creates an enterprise organization with an active owner", () => {
  const organization = createEnterpriseOrganization({
    name: "Launch Corp",
    slug: "launch-corp",
    ownerId: "owner-1",
    ownerEmail: "OWNER@example.com",
  });
  assert.equal(organization.members[0].email, "owner@example.com");
  assert.equal(organization.members[0].role, "organization_owner");
  assert.equal(organization.retention.auditLogDays, 730);
});

test("enforces advanced role permissions", () => {
  const organization = createEnterpriseOrganization({
    name: "Launch Corp",
    slug: "launch-corp",
    ownerId: "owner-1",
    ownerEmail: "owner@example.com",
  });
  const member = addEnterpriseMember(organization, "owner-1", {
    email: "audit@example.com",
    role: "auditor",
  });
  member.status = "active";
  assert.equal(canEnterpriseMember(member, "audit:read"), true);
  assert.equal(canEnterpriseMember(member, "scan:run"), false);
  assert.deepEqual(permissionsForRole("security_admin"), [
    "security:manage",
    "scan:read",
    "audit:read",
  ]);
  updateEnterpriseMemberRole(organization, "owner-1", member.id, "analyst");
  assert.equal(member.role, "analyst");
  assert.throws(() =>
    updateEnterpriseMemberRole(organization, "owner-1", "owner-1", "auditor"),
  );
});

test("configures secure SSO without storing provider secrets", () => {
  const organization = createEnterpriseOrganization({
    name: "Launch Corp",
    slug: "launch-corp",
    ownerId: "owner-1",
    ownerEmail: "owner@example.com",
  });
  const sso = configureSso(organization, "owner-1", {
    provider: "oidc",
    issuer: "https://identity.example.com",
    loginUrl: "https://identity.example.com/authorize",
    clientId: "public-client-id",
    status: "active",
    enforceForMembers: true,
  });
  assert.equal(sso.status, "active");
  assert.doesNotMatch(JSON.stringify(sso), /secret|password|token/i);
  assert.throws(
    () =>
      configureSso(organization, "owner-1", {
        ...sso,
        issuer: "http://unsafe.example.com",
      }),
    /HTTPS/,
  );
});

test("validates retention controls and compliance", () => {
  const organization = createEnterpriseOrganization({
    name: "Launch Corp",
    slug: "launch-corp",
    ownerId: "owner-1",
    ownerEmail: "owner@example.com",
  });
  updateRetentionPolicy(organization, "owner-1", {
    scanDays: 365,
    auditLogDays: 730,
    screenshotDays: 30,
    deleteOnMemberRemoval: true,
  });
  assert.equal(runComplianceReview(organization).passed, false);
  configureSso(organization, "owner-1", {
    provider: "saml",
    issuer: "https://idp.example.com",
    loginUrl: "https://idp.example.com/login",
    certificateFingerprint: "SHA256:example",
    status: "active",
    enforceForMembers: true,
  });
  assert.equal(runComplianceReview(organization).passed, true);
  assert.throws(() =>
    updateRetentionPolicy(organization, "owner-1", {
      ...organization.retention,
      scanDays: 0,
    }),
  );
});

test("retains only audit events inside the configured period", () => {
  const now = Date.parse("2026-08-03T00:00:00.000Z");
  const recent = createAuditEvent({
    organizationId: "org",
    actorId: "owner",
    action: "login",
    targetType: "session",
    outcome: "success",
    metadata: {},
  });
  recent.createdAt = "2026-08-02T00:00:00.000Z";
  const old = { ...recent, id: "old", createdAt: "2025-01-01T00:00:00.000Z" };
  assert.deepEqual(
    applyAuditRetention([recent, old], 30, now).map((event) => event.id),
    [recent.id],
  );
});

test("persists organizations, member actions, and traceable audit events", async () => {
  const repository = new MemoryEnterpriseRepository();
  const service = new EnterpriseService(repository);
  const organization = await service.create({
    name: "Launch Corp",
    slug: "launch-corp",
    ownerId: "owner-1",
    ownerEmail: "owner@example.com",
  });
  const member = await service.invite(organization.id, "owner-1", {
    email: "analyst@example.com",
    role: "analyst",
  });
  await service.changeRole(organization.id, "owner-1", member.id, "auditor");
  const events = await service.auditEvents(organization.id, "owner-1");
  assert.equal(events.length, 3);
  assert.deepEqual(
    events.map((event) => event.action),
    ["member.role.updated", "member.invited", "organization.created"],
  );
});
