import crypto from "node:crypto";

export type NotificationProvider = "slack" | "discord";
export type NotificationKind = "scan_completed" | "critical_alert";

export type NotificationPreferences = {
  scanCompleted: boolean;
  criticalAlerts: boolean;
  minimumScore?: number;
};

export type ScanNotification = {
  kind: NotificationKind;
  scanId: string;
  siteUrl: string;
  score: number;
  summary: string;
  reportUrl: string;
};

export type DeliveryAttempt = {
  attempt: number;
  status: "delivered" | "failed";
  statusCode?: number;
  error?: string;
  createdAt: string;
};

export type DeliveryLog = {
  id: string;
  provider: NotificationProvider;
  kind: NotificationKind;
  scanId: string;
  status: "delivered" | "failed";
  attempts: DeliveryAttempt[];
  createdAt: string;
};

export type NotificationRequest = (
  url: string,
  init?: RequestInit,
) => Promise<Response>;

export type DeliveryLogRepository = {
  save(log: DeliveryLog): Promise<void>;
  list(): Promise<DeliveryLog[]>;
};

export class MemoryDeliveryLogRepository implements DeliveryLogRepository {
  private readonly logs: DeliveryLog[] = [];

  async save(log: DeliveryLog) {
    this.logs.unshift(structuredClone(log));
  }

  async list() {
    return structuredClone(this.logs);
  }
}

export function readNotificationConfig(
  env: Record<string, string | undefined> = process.env,
) {
  const slackToken = env.SLACK_BOT_TOKEN?.trim();
  const slackChannel = env.SLACK_CHANNEL_ID?.trim();
  const discordWebhookUrl = env.DISCORD_WEBHOOK_URL?.trim();
  return {
    slackConfigured: Boolean(slackToken && slackChannel),
    discordConfigured: Boolean(discordWebhookUrl),
    slackToken,
    slackChannel,
    discordWebhookUrl,
  };
}

export function shouldNotify(
  notification: ScanNotification,
  preferences: NotificationPreferences,
): boolean {
  if (
    preferences.minimumScore !== undefined &&
    notification.score > preferences.minimumScore
  ) {
    return false;
  }
  return notification.kind === "critical_alert"
    ? preferences.criticalAlerts
    : preferences.scanCompleted;
}

export function buildSlackMessage(notification: ScanNotification) {
  const title =
    notification.kind === "critical_alert"
      ? "🚨 Critical Launch Check alert"
      : "✅ Launch Check scan completed";
  return {
    text: `${title}: ${notification.siteUrl} scored ${notification.score}`,
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: title },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Site:* ${notification.siteUrl}\n*Score:* ${notification.score}/100\n${notification.summary}`,
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "View report" },
            url: notification.reportUrl,
          },
        ],
      },
    ],
  };
}

export function buildDiscordMessage(notification: ScanNotification) {
  const critical = notification.kind === "critical_alert";
  return {
    content: critical ? "Critical Launch Check alert" : undefined,
    embeds: [
      {
        title: critical
          ? "Critical issue detected"
          : "Launch Check scan completed",
        description: notification.summary,
        url: notification.reportUrl,
        color: critical ? 0xdc2626 : 0x2563eb,
        fields: [
          { name: "Site", value: notification.siteUrl },
          { name: "Score", value: `${notification.score}/100`, inline: true },
          { name: "Scan", value: notification.scanId, inline: true },
        ],
      },
    ],
    allowed_mentions: { parse: [] },
  };
}

export async function testSlackConnection(
  token: string,
  request: NotificationRequest = fetch,
): Promise<{ connected: true; team?: string }> {
  const response = await request("https://slack.com/api/auth.test", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = (await response.json()) as {
    ok?: boolean;
    team?: string;
    error?: string;
  };
  if (!response.ok || !data.ok) {
    throw new Error(
      `Slack connection failed: ${data.error ?? response.status}`,
    );
  }
  return { connected: true, team: data.team };
}

export async function testDiscordConnection(
  webhookUrl: string,
  request: NotificationRequest = fetch,
): Promise<{ connected: true; name?: string }> {
  assertDiscordWebhookUrl(webhookUrl);
  const response = await request(webhookUrl);
  if (!response.ok)
    throw new Error(`Discord connection failed: ${response.status}`);
  const data = (await response.json()) as { name?: string };
  return { connected: true, name: data.name };
}

function assertDiscordWebhookUrl(url: string) {
  const parsed = new URL(url);
  if (
    parsed.protocol !== "https:" ||
    !["discord.com", "discordapp.com"].includes(parsed.hostname) ||
    !parsed.pathname.startsWith("/api/webhooks/")
  ) {
    throw new Error("Invalid Discord webhook URL");
  }
}

async function sendOnce(
  provider: NotificationProvider,
  notification: ScanNotification,
  config: {
    slackToken?: string;
    slackChannel?: string;
    discordWebhookUrl?: string;
  },
  request: NotificationRequest,
): Promise<Response> {
  if (provider === "slack") {
    if (!config.slackToken || !config.slackChannel) {
      throw new Error("Slack is not configured");
    }
    return request("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.slackToken}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel: config.slackChannel,
        ...buildSlackMessage(notification),
      }),
    });
  }

  if (!config.discordWebhookUrl) throw new Error("Discord is not configured");
  assertDiscordWebhookUrl(config.discordWebhookUrl);
  return request(`${config.discordWebhookUrl}?wait=true`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildDiscordMessage(notification)),
  });
}

export async function deliverNotification(input: {
  provider: NotificationProvider;
  notification: ScanNotification;
  preferences: NotificationPreferences;
  config: {
    slackToken?: string;
    slackChannel?: string;
    discordWebhookUrl?: string;
  };
  repository: DeliveryLogRepository;
  request?: NotificationRequest;
  maxAttempts?: number;
}): Promise<DeliveryLog | null> {
  if (!shouldNotify(input.notification, input.preferences)) return null;

  const attempts: DeliveryAttempt[] = [];
  const maxAttempts = Math.min(Math.max(input.maxAttempts ?? 3, 1), 5);
  const request = input.request ?? fetch;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await sendOnce(
        input.provider,
        input.notification,
        input.config,
        request,
      );
      let providerError: string | undefined;
      if (input.provider === "slack") {
        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
        };
        if (!data.ok)
          providerError = data.error ?? "Slack rejected the message";
      }
      if (response.ok && !providerError) {
        attempts.push({
          attempt,
          status: "delivered",
          statusCode: response.status,
          createdAt: new Date().toISOString(),
        });
        break;
      }
      attempts.push({
        attempt,
        status: "failed",
        statusCode: response.status,
        error: providerError ?? `HTTP ${response.status}`,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      attempts.push({
        attempt,
        status: "failed",
        error: error instanceof Error ? error.message : "Delivery failed",
        createdAt: new Date().toISOString(),
      });
    }
  }

  const delivered = attempts.some((attempt) => attempt.status === "delivered");
  const log: DeliveryLog = {
    id: crypto.randomUUID(),
    provider: input.provider,
    kind: input.notification.kind,
    scanId: input.notification.scanId,
    status: delivered ? "delivered" : "failed",
    attempts,
    createdAt: new Date().toISOString(),
  };
  await input.repository.save(log);
  return log;
}
