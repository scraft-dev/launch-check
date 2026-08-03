import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  buildIntegrationSummary,
  canPerformAction,
  createIntegration,
  createWorkspace,
  inviteWorkspaceMember,
  createGitHubIssueDraft,
  createGitHubRepositoryConnection,
  createPullRequestStatusCheck,
  createNotificationSettings,
  createWebhookDelivery,
  validateWebhookSignature,
  validateSlackSignature,
  validateDiscordSignature,
  type IntegrationProvider,
} from "./integrations";

test("creates a pending integration that requires external credentials", () => {
  const integration = createIntegration({
    name: "Release alerts",
    provider: "github" as IntegrationProvider,
    channel: "release-updates",
    permissions: ["read"],
  });

  assert.equal(integration.status, "pending");
  assert.equal(integration.requiresExternalCredentials, true);
  assert.equal(integration.permissions[0], "read");
});

test("validates GitHub webhook signatures without exposing secrets", () => {
  const secret = "super-secret";
  const payload = JSON.stringify({ test: true });
  const signature = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  const result = validateWebhookSignature(
    "github",
    payload,
    {
      "x-hub-signature-256": signature,
    },
    secret,
  );

  assert.equal(result.valid, true);
  assert.equal(result.error, undefined);
});

test("rejects webhook validation when the signature is invalid", () => {
  const result = validateWebhookSignature(
    "slack",
    '{"ok":true}',
    {
      "x-slack-signature": "bad-signature",
      "x-slack-request-timestamp": "123",
    },
    "shared-secret",
  );

  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /signature/i);
});

test("blocks actions when permissions are not available", () => {
  const integration = createIntegration({
    name: "Discord alerts",
    provider: "discord" as IntegrationProvider,
    channel: "ops",
    permissions: ["read"],
  });

  assert.equal(canPerformAction(integration, "send"), false);
  assert.equal(canPerformAction(integration, "read"), true);
});

test("builds a summary and webhook delivery record for the UI", () => {
  const integration = createIntegration({
    name: "Slack alerts",
    provider: "slack" as IntegrationProvider,
    channel: "launch",
    permissions: ["write"],
  });
  const summary = buildIntegrationSummary(integration);
  const delivery = createWebhookDelivery(
    integration.id,
    "scan:completed",
    "slack",
  );

  assert.match(summary, /pending/i);
  assert.equal(delivery.provider, "slack");
  assert.equal(delivery.eventType, "scan:completed");
});

test("creates a workspace with members, roles, and shared settings", () => {
  const workspace = createWorkspace({
    name: "Launch Ops",
    ownerId: "owner-1",
    shareScanHistory: true,
  });
  const member = inviteWorkspaceMember(workspace, {
    email: "dev@example.com",
    role: "viewer",
  });

  assert.equal(workspace.name, "Launch Ops");
  assert.equal(workspace.shareScanHistory, true);
  assert.equal(member.role, "viewer");
  assert.equal(workspace.members.length, 1);
});

test("builds a GitHub issue draft without embedding secrets", () => {
  const repo = createGitHubRepositoryConnection({
    repository: "acme/www",
    installationId: "install-1",
    status: "pending",
  });
  const issue = createGitHubIssueDraft(
    repo,
    [{ title: "LCP too slow", detail: "Reduce initial server response time." }],
    "Launch Check",
  );

  assert.equal(repo.repository, "acme/www");
  assert.equal(issue.title, "Launch Check: LCP too slow");
  assert.match(issue.body, /LCP too slow/i);
  assert.equal(issue.secretsExposed, false);
});

test("creates a PR status check payload and notification settings", () => {
  const status = createPullRequestStatusCheck("build", "success");
  const settings = createNotificationSettings({
    notifyOnCompletion: true,
    notifyOnCriticalAlert: true,
    retryCount: 3,
  });

  assert.equal(status.context, "build");
  assert.equal(status.state, "success");
  assert.equal(settings.retryCount, 3);
  assert.equal(settings.notifyOnCriticalAlert, true);
});

test("verifies Slack and Discord signatures with the correct scheme", () => {
  const slackPayload = JSON.stringify({ ok: true });
  const slackTimestamp = "1710000000";
  const slackSecret = "secret";
  const slackSignature = crypto
    .createHmac("sha256", slackSecret)
    .update(`v0:${slackTimestamp}:${slackPayload}`)
    .digest("hex");
  const slackHeaders = {
    "x-slack-request-timestamp": slackTimestamp,
    "x-slack-signature": `v0=${slackSignature}`,
  };

  const slackResult = validateSlackSignature(
    slackPayload,
    slackHeaders,
    slackSecret,
  );
  assert.equal(slackResult.valid, true);
  assert.equal(slackResult.error, undefined);

  const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
  const discordPayload = Buffer.from(
    JSON.stringify({ event: "scan:completed" }),
  );
  const discordTimestamp = "1";
  const signed = crypto.sign(
    null,
    Buffer.concat([Buffer.from(discordTimestamp), discordPayload]),
    privateKey,
  );
  const discordResult = validateDiscordSignature(
    discordPayload,
    {
      "x-signature-ed25519": signed.toString("hex"),
      "x-signature-timestamp": discordTimestamp,
    },
    publicKey,
  );

  assert.equal(discordResult.valid, true);
  assert.equal(discordResult.error, undefined);
});
