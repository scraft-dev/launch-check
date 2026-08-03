import crypto from "node:crypto";

export type IntegrationProvider = "github" | "slack" | "discord";
export type IntegrationStatus = "pending" | "active" | "disabled";
export type IntegrationPermission = "read" | "write" | "admin";
export type WorkspaceRole = "owner" | "admin" | "editor" | "viewer";
export type WorkspaceMember = {
  id: string;
  email: string;
  role: WorkspaceRole;
};
export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  members: WorkspaceMember[];
  shareScanHistory: boolean;
  settings: Record<string, boolean | number | string>;
};
export type GitHubRepositoryConnection = {
  id: string;
  repository: string;
  installationId: string;
  status: "pending" | "connected";
};
export type GitHubIssueDraft = {
  title: string;
  body: string;
  secretsExposed: boolean;
};
export type PullRequestStatusCheck = {
  context: string;
  state: "success" | "failure" | "pending";
};
export type NotificationSettings = {
  notifyOnCompletion: boolean;
  notifyOnCriticalAlert: boolean;
  retryCount: number;
};

export type Integration = {
  id: string;
  name: string;
  provider: IntegrationProvider;
  channel: string;
  status: IntegrationStatus;
  permissions: IntegrationPermission[];
  requiresExternalCredentials: boolean;
  createdAt: string;
};

export type WebhookValidationResult = {
  valid: boolean;
  error?: string;
};

export type WebhookDelivery = {
  id: string;
  integrationId: string;
  provider: IntegrationProvider;
  eventType: string;
  status: "queued" | "failed";
  createdAt: string;
};

export function createIntegration(input: {
  name: string;
  provider: IntegrationProvider;
  channel: string;
  permissions: IntegrationPermission[];
  status?: IntegrationStatus;
}): Integration {
  return {
    id: `int_${Math.random().toString(36).slice(2, 10)}`,
    name: input.name,
    provider: input.provider,
    channel: input.channel,
    status: input.status ?? "pending",
    permissions: input.permissions,
    requiresExternalCredentials: true,
    createdAt: new Date().toISOString(),
  };
}

export function canPerformAction(
  integration: Integration,
  action: IntegrationPermission | "send",
): boolean {
  if (action === "send") {
    return (
      integration.permissions.includes("write") ||
      integration.permissions.includes("admin")
    );
  }

  return integration.permissions.includes(action);
}

export function buildIntegrationSummary(integration: Integration): string {
  const permissionText = integration.permissions.join(", ");
  return `${integration.provider.toUpperCase()} integration "${integration.name}" is ${integration.status} and requires external credentials. Permissions: ${permissionText}`;
}

export function createWorkspace(input: {
  name: string;
  ownerId: string;
  shareScanHistory?: boolean;
}): Workspace {
  return {
    id: `workspace_${Math.random().toString(36).slice(2, 10)}`,
    name: input.name,
    ownerId: input.ownerId,
    members: [],
    shareScanHistory: input.shareScanHistory ?? false,
    settings: {
      allowMemberInvites: true,
      requireApprovalForPublicLinks: false,
    },
  };
}

export function inviteWorkspaceMember(
  workspace: Workspace,
  input: { email: string; role: WorkspaceRole },
): WorkspaceMember {
  const member: WorkspaceMember = {
    id: `member_${Math.random().toString(36).slice(2, 10)}`,
    email: input.email,
    role: input.role,
  };
  workspace.members.push(member);
  return member;
}

export function createGitHubRepositoryConnection(input: {
  repository: string;
  installationId: string;
  status?: "pending" | "connected";
}): GitHubRepositoryConnection {
  return {
    id: `repo_${Math.random().toString(36).slice(2, 10)}`,
    repository: input.repository,
    installationId: input.installationId,
    status: input.status ?? "pending",
  };
}

export function createGitHubIssueDraft(
  repository: GitHubRepositoryConnection,
  findings: Array<{ title: string; detail: string }>,
  label: string,
): GitHubIssueDraft {
  const body = findings
    .map((finding) => `- ${finding.title}: ${finding.detail}`)
    .join("\n");

  return {
    title: `${label}: ${findings[0]?.title ?? "Scan issue"}`,
    body,
    secretsExposed: false,
  };
}

export function createPullRequestStatusCheck(
  context: string,
  state: PullRequestStatusCheck["state"],
): PullRequestStatusCheck {
  return {
    context,
    state,
  };
}

export function createNotificationSettings(input: {
  notifyOnCompletion?: boolean;
  notifyOnCriticalAlert?: boolean;
  retryCount?: number;
}): NotificationSettings {
  return {
    notifyOnCompletion: input.notifyOnCompletion ?? true,
    notifyOnCriticalAlert: input.notifyOnCriticalAlert ?? true,
    retryCount: input.retryCount ?? 1,
  };
}

export function validateWebhookSignature(
  provider: IntegrationProvider,
  payload: string,
  headers: Record<string, string | undefined>,
  secret: string,
): WebhookValidationResult {
  if (!secret) {
    return { valid: false, error: "Missing webhook secret" };
  }

  if (provider === "github") {
    const expected = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex")}`;
    const actual = headers["x-hub-signature-256"];
    return {
      valid: actual === expected,
      error: actual === expected ? undefined : "Invalid GitHub signature",
    };
  }

  if (provider === "slack") {
    return validateSlackSignature(payload, headers, secret);
  }

  return validateDiscordSignature(
    Buffer.from(payload, "utf8"),
    headers,
    secret,
  );
}

export function validateSlackSignature(
  payload: string,
  headers: Record<string, string | undefined>,
  secret: string,
): WebhookValidationResult {
  const timestamp = headers["x-slack-request-timestamp"];
  const signature = headers["x-slack-signature"];
  if (!timestamp || !signature) {
    return { valid: false, error: "Missing Slack signature headers" };
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`v0:${timestamp}:${payload}`)
    .digest("hex");
  return {
    valid: signature === `v0=${expected}`,
    error:
      signature === `v0=${expected}` ? undefined : "Invalid Slack signature",
  };
}

export function validateDiscordSignature(
  payload: Buffer,
  headers: Record<string, string | undefined>,
  signingKey: string | crypto.KeyObject,
): WebhookValidationResult {
  const timestamp = headers["x-signature-timestamp"];
  const signature = headers["x-signature-ed25519"];
  if (!timestamp || !signature) {
    return { valid: false, error: "Missing Discord signature headers" };
  }

  const key =
    typeof signingKey === "string"
      ? crypto.createPublicKey({
          key: Buffer.concat([
            Buffer.from("302a300506032b6570032100", "hex"),
            Buffer.from(signingKey, "hex"),
          ]),
          format: "der",
          type: "spki",
        })
      : signingKey;

  const message = Buffer.concat([Buffer.from(timestamp), payload]);
  const signatureBuffer = Buffer.from(signature, "hex");

  try {
    const valid = crypto.verify(null, message, key, signatureBuffer);
    return { valid, error: valid ? undefined : "Invalid Discord signature" };
  } catch {
    return { valid: false, error: "Invalid Discord signature" };
  }
}

export function createWebhookDelivery(
  integrationId: string,
  eventType: string,
  provider: IntegrationProvider = "github",
): WebhookDelivery {
  return {
    id: `delivery_${Math.random().toString(36).slice(2, 10)}`,
    integrationId,
    provider,
    eventType,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
}
