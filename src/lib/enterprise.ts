import crypto from "node:crypto";

export type EnterpriseRole =
  | "organization_owner"
  | "security_admin"
  | "workspace_admin"
  | "analyst"
  | "auditor";

export type EnterprisePermission =
  | "organization:manage"
  | "security:manage"
  | "workspace:manage"
  | "scan:run"
  | "scan:read"
  | "audit:read";

export type SsoConfiguration = {
  provider: "saml" | "oidc";
  issuer: string;
  loginUrl: string;
  certificateFingerprint?: string;
  clientId?: string;
  status: "draft" | "active";
  enforceForMembers: boolean;
};

export type DataRetentionPolicy = {
  scanDays: number;
  auditLogDays: number;
  screenshotDays: number;
  deleteOnMemberRemoval: boolean;
};

export type EnterpriseMember = {
  id: string;
  email: string;
  role: EnterpriseRole;
  status: "invited" | "active" | "suspended";
  createdAt: string;
};

export type EnterpriseOrganization = {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  workspaceIds: string[];
  members: EnterpriseMember[];
  sso: SsoConfiguration | null;
  retention: DataRetentionPolicy;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  organizationId: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  outcome: "success" | "denied" | "failure";
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
};

export type EnterpriseRepository = {
  listOrganizations(): Promise<EnterpriseOrganization[]>;
  saveOrganization(organization: EnterpriseOrganization): Promise<void>;
  deleteOrganization(id: string): Promise<void>;
  listAuditEvents(organizationId: string): Promise<AuditEvent[]>;
  saveAuditEvent(event: AuditEvent): Promise<void>;
};

const rolePermissions: Record<EnterpriseRole, EnterprisePermission[]> = {
  organization_owner: [
    "organization:manage",
    "security:manage",
    "workspace:manage",
    "scan:run",
    "scan:read",
    "audit:read",
  ],
  security_admin: ["security:manage", "scan:read", "audit:read"],
  workspace_admin: ["workspace:manage", "scan:run", "scan:read"],
  analyst: ["scan:run", "scan:read"],
  auditor: ["scan:read", "audit:read"],
};

export function permissionsForRole(role: EnterpriseRole) {
  return [...rolePermissions[role]];
}

export function canEnterpriseMember(
  member: EnterpriseMember,
  permission: EnterprisePermission,
) {
  return (
    member.status === "active" &&
    rolePermissions[member.role].includes(permission)
  );
}

export function defaultRetentionPolicy(): DataRetentionPolicy {
  return {
    scanDays: 365,
    auditLogDays: 730,
    screenshotDays: 90,
    deleteOnMemberRemoval: false,
  };
}

export function validateRetentionPolicy(policy: DataRetentionPolicy) {
  const values = [policy.scanDays, policy.auditLogDays, policy.screenshotDays];
  if (
    values.some(
      (value) => !Number.isInteger(value) || value < 1 || value > 3650,
    )
  ) {
    throw new Error("Retention days must be between 1 and 3650");
  }
  return policy;
}

export function createEnterpriseOrganization(input: {
  name: string;
  slug: string;
  ownerId: string;
  ownerEmail: string;
}): EnterpriseOrganization {
  if (!/^[a-z0-9-]{3,50}$/.test(input.slug)) {
    throw new Error(
      "Organization slug must use lowercase letters, numbers, and hyphens",
    );
  }
  const now = new Date().toISOString();
  return {
    id: `org_${crypto.randomUUID()}`,
    name: input.name.trim(),
    slug: input.slug,
    ownerId: input.ownerId,
    workspaceIds: [],
    members: [
      {
        id: input.ownerId,
        email: input.ownerEmail.toLowerCase(),
        role: "organization_owner",
        status: "active",
        createdAt: now,
      },
    ],
    sso: null,
    retention: defaultRetentionPolicy(),
    createdAt: now,
    updatedAt: now,
  };
}

export function addEnterpriseMember(
  organization: EnterpriseOrganization,
  actorId: string,
  input: { email: string; role: EnterpriseRole },
) {
  requirePermission(organization, actorId, "organization:manage");
  if (
    organization.members.some(
      (member) => member.email === input.email.toLowerCase(),
    )
  ) {
    throw new Error("Member already exists");
  }
  const member: EnterpriseMember = {
    id: `member_${crypto.randomUUID()}`,
    email: input.email.toLowerCase(),
    role: input.role,
    status: "invited",
    createdAt: new Date().toISOString(),
  };
  organization.members.push(member);
  organization.updatedAt = new Date().toISOString();
  return member;
}

export function updateEnterpriseMemberRole(
  organization: EnterpriseOrganization,
  actorId: string,
  memberId: string,
  role: EnterpriseRole,
) {
  requirePermission(organization, actorId, "organization:manage");
  if (memberId === organization.ownerId)
    throw new Error("Owner role cannot be changed");
  const member = organization.members.find(
    (candidate) => candidate.id === memberId,
  );
  if (!member) throw new Error("Member not found");
  member.role = role;
  organization.updatedAt = new Date().toISOString();
  return member;
}

export function configureSso(
  organization: EnterpriseOrganization,
  actorId: string,
  configuration: SsoConfiguration,
) {
  requirePermission(organization, actorId, "security:manage");
  const issuer = new URL(configuration.issuer);
  const loginUrl = new URL(configuration.loginUrl);
  if (issuer.protocol !== "https:" || loginUrl.protocol !== "https:") {
    throw new Error("SSO URLs must use HTTPS");
  }
  organization.sso = { ...configuration };
  organization.updatedAt = new Date().toISOString();
  return organization.sso;
}

export function updateRetentionPolicy(
  organization: EnterpriseOrganization,
  actorId: string,
  policy: DataRetentionPolicy,
) {
  requirePermission(organization, actorId, "security:manage");
  organization.retention = { ...validateRetentionPolicy(policy) };
  organization.updatedAt = new Date().toISOString();
  return organization.retention;
}

export function createAuditEvent(
  input: Omit<AuditEvent, "id" | "createdAt">,
): AuditEvent {
  return {
    ...input,
    id: `audit_${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
  };
}

export function applyAuditRetention(
  events: AuditEvent[],
  days: number,
  now = Date.now(),
) {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return events.filter(
    (event) => new Date(event.createdAt).getTime() >= cutoff,
  );
}

export function runComplianceReview(organization: EnterpriseOrganization) {
  const checks = [
    {
      id: "owner",
      passed: organization.members.some(
        (member) =>
          member.role === "organization_owner" && member.status === "active",
      ),
    },
    {
      id: "sso",
      passed: Boolean(
        organization.sso?.status === "active" &&
        organization.sso.enforceForMembers,
      ),
    },
    {
      id: "audit-retention",
      passed: organization.retention.auditLogDays >= 365,
    },
    {
      id: "data-minimization",
      passed:
        organization.retention.screenshotDays <=
        organization.retention.scanDays,
    },
  ];
  return {
    passed: checks.every((check) => check.passed),
    checks,
    reviewedAt: new Date().toISOString(),
  };
}

function requirePermission(
  organization: EnterpriseOrganization,
  actorId: string,
  permission: EnterprisePermission,
) {
  const actor = organization.members.find((member) => member.id === actorId);
  if (!actor || !canEnterpriseMember(actor, permission)) {
    throw new Error("Permission denied");
  }
}

export class EnterpriseService {
  constructor(private readonly repository: EnterpriseRepository) {}

  async list() {
    return this.repository.listOrganizations();
  }

  async create(input: Parameters<typeof createEnterpriseOrganization>[0]) {
    const organization = createEnterpriseOrganization(input);
    await this.repository.saveOrganization(organization);
    await this.audit(
      organization.id,
      input.ownerId,
      "organization.created",
      "organization",
      organization.id,
    );
    return organization;
  }

  async update(
    organizationId: string,
    actorId: string,
    input: { sso?: SsoConfiguration; retention?: DataRetentionPolicy },
  ) {
    const organization = await this.get(organizationId);
    if (input.sso) configureSso(organization, actorId, input.sso);
    if (input.retention)
      updateRetentionPolicy(organization, actorId, input.retention);
    await this.repository.saveOrganization(organization);
    await this.audit(
      organizationId,
      actorId,
      "organization.security.updated",
      "organization",
      organizationId,
    );
    return organization;
  }

  async invite(
    organizationId: string,
    actorId: string,
    input: { email: string; role: EnterpriseRole },
  ) {
    const organization = await this.get(organizationId);
    const member = addEnterpriseMember(organization, actorId, input);
    await this.repository.saveOrganization(organization);
    await this.audit(
      organizationId,
      actorId,
      "member.invited",
      "member",
      member.id,
    );
    return member;
  }

  async changeRole(
    organizationId: string,
    actorId: string,
    memberId: string,
    role: EnterpriseRole,
  ) {
    const organization = await this.get(organizationId);
    const member = updateEnterpriseMemberRole(
      organization,
      actorId,
      memberId,
      role,
    );
    await this.repository.saveOrganization(organization);
    await this.audit(
      organizationId,
      actorId,
      "member.role.updated",
      "member",
      member.id,
    );
    return member;
  }

  async auditEvents(organizationId: string, actorId: string) {
    const organization = await this.get(organizationId);
    requirePermission(organization, actorId, "audit:read");
    const events = await this.repository.listAuditEvents(organizationId);
    return applyAuditRetention(events, organization.retention.auditLogDays);
  }

  async compliance(organizationId: string, actorId: string) {
    const organization = await this.get(organizationId);
    requirePermission(organization, actorId, "audit:read");
    return runComplianceReview(organization);
  }

  private async get(id: string) {
    const organization = (await this.repository.listOrganizations()).find(
      (item) => item.id === id,
    );
    if (!organization) throw new Error("Organization not found");
    return organization;
  }

  private async audit(
    organizationId: string,
    actorId: string,
    action: string,
    targetType: string,
    targetId: string,
  ) {
    await this.repository.saveAuditEvent(
      createAuditEvent({
        organizationId,
        actorId,
        action,
        targetType,
        targetId,
        outcome: "success",
        metadata: {},
      }),
    );
  }
}

export class MemoryEnterpriseRepository implements EnterpriseRepository {
  organizations: EnterpriseOrganization[] = [];
  auditEvents: AuditEvent[] = [];

  async listOrganizations() {
    return structuredClone(this.organizations);
  }
  async saveOrganization(organization: EnterpriseOrganization) {
    const index = this.organizations.findIndex(
      (item) => item.id === organization.id,
    );
    if (index >= 0) this.organizations[index] = structuredClone(organization);
    else this.organizations.push(structuredClone(organization));
  }
  async deleteOrganization(id: string) {
    this.organizations = this.organizations.filter((item) => item.id !== id);
  }
  async listAuditEvents(organizationId: string) {
    return structuredClone(
      this.auditEvents.filter(
        (event) => event.organizationId === organizationId,
      ),
    );
  }
  async saveAuditEvent(event: AuditEvent) {
    this.auditEvents.unshift(structuredClone(event));
  }
}
