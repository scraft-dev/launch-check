import { NextResponse } from "next/server";
import {
  createGitHubIssueDraft,
  createGitHubRepositoryConnection,
  createIntegration,
  createNotificationSettings,
  createPullRequestStatusCheck,
  createWebhookDelivery,
  createWorkspace,
  inviteWorkspaceMember,
  validateWebhookSignature,
  type IntegrationProvider,
} from "@/lib/integrations";

function readSecret(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const provider = body.provider as IntegrationProvider | undefined;
    const payload = typeof body.payload === "string" ? body.payload : JSON.stringify(body.payload ?? {});
    const headers = (body.headers ?? {}) as Record<string, string | undefined>;
    const secret = readSecret(
      provider === "github"
        ? "GITHUB_WEBHOOK_SECRET"
        : provider === "slack"
          ? "SLACK_SIGNING_SECRET"
          : "DISCORD_PUBLIC_KEY",
    );

    if (!provider || !["github", "slack", "discord"].includes(provider)) {
      return NextResponse.json({ error: "Unsupported integration provider" }, { status: 400 });
    }

    if (!secret) {
      return NextResponse.json({ error: "External credentials are required for live delivery" }, { status: 400 });
    }

    const validation = validateWebhookSignature(provider, payload, headers, secret);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error ?? "Webhook validation failed" }, { status: 400 });
    }

    const integration = createIntegration({
      name: `${provider} integration`,
      provider,
      channel: body.channel ?? `${provider}-channel`,
      permissions: ["read", "write"],
      status: "active",
    });
    const workspace = createWorkspace({
      name: body.workspaceName ?? "Launch Check Workspace",
      ownerId: body.ownerId ?? "system",
      shareScanHistory: body.shareScanHistory ?? true,
    });
    inviteWorkspaceMember(workspace, { email: body.memberEmail ?? "ops@example.com", role: body.memberRole ?? "viewer" });
    const repository = createGitHubRepositoryConnection({
      repository: body.repository ?? "example/repo",
      installationId: body.installationId ?? "install-demo",
      status: "connected",
    });
    const issueDraft = createGitHubIssueDraft(
      repository,
      [{ title: body.issueTitle ?? "Scan failure", detail: body.issueDetail ?? "Needs review" }],
      body.issueLabel ?? "launch-check",
    );
    const prStatus = createPullRequestStatusCheck(body.context ?? "launch-check", body.state ?? "success");
    const notifications = createNotificationSettings({
      notifyOnCompletion: body.notifyOnCompletion ?? true,
      notifyOnCriticalAlert: body.notifyOnCriticalAlert ?? true,
      retryCount: body.retryCount ?? 2,
    });
    const delivery = createWebhookDelivery(integration.id, body.eventType ?? "scan:completed", provider);

    return NextResponse.json({
      integration,
      workspace,
      repository,
      issueDraft,
      prStatus,
      notifications,
      delivery,
      message: "Webhook validated server-side; live delivery is pending external credentials",
    });
  } catch {
    return NextResponse.json({ error: "Unable to process integrations request" }, { status: 500 });
  }
}
