import assert from "node:assert/strict";
import test from "node:test";
import {
  MemoryDeliveryLogRepository,
  buildDiscordMessage,
  buildSlackMessage,
  deliverNotification,
  readNotificationConfig,
  shouldNotify,
  testDiscordConnection,
  testSlackConnection,
  type NotificationRequest,
  type ScanNotification,
} from "./notifications";

const notification: ScanNotification = {
  kind: "scan_completed",
  scanId: "scan_1",
  siteUrl: "https://example.com",
  score: 82,
  summary: "Two improvements are available.",
  reportUrl: "https://launch.test/history/scan_1",
};

test("reports Slack and Discord configuration without exposing values", () => {
  const config = readNotificationConfig({
    SLACK_BOT_TOKEN: "xoxb-secret",
    SLACK_CHANNEL_ID: "C123",
    DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/1/token",
  });
  assert.equal(config.slackConfigured, true);
  assert.equal(config.discordConfigured, true);
});

test("builds scan completion and critical alert messages", () => {
  assert.match(buildSlackMessage(notification).text, /82/);
  const discord = buildDiscordMessage({
    ...notification,
    kind: "critical_alert",
    score: 20,
  });
  assert.equal(discord.embeds[0].color, 0xdc2626);
  assert.deepEqual(discord.allowed_mentions, { parse: [] });
});

test("applies notification preferences", () => {
  assert.equal(
    shouldNotify(notification, { scanCompleted: true, criticalAlerts: true }),
    true,
  );
  assert.equal(
    shouldNotify(notification, { scanCompleted: false, criticalAlerts: true }),
    false,
  );
  assert.equal(
    shouldNotify(
      { ...notification, score: 90 },
      { scanCompleted: true, criticalAlerts: true, minimumScore: 80 },
    ),
    false,
  );
});

test("tests Slack and Discord connections", async () => {
  const slackRequest: NotificationRequest = async () =>
    new Response(JSON.stringify({ ok: true, team: "Launch Ops" }), {
      status: 200,
    });
  assert.equal(
    (await testSlackConnection("token", slackRequest)).team,
    "Launch Ops",
  );
  const discordRequest: NotificationRequest = async () =>
    new Response(JSON.stringify({ name: "Launch alerts" }), { status: 200 });
  assert.equal(
    (
      await testDiscordConnection(
        "https://discord.com/api/webhooks/1/token",
        discordRequest,
      )
    ).name,
    "Launch alerts",
  );
  await assert.rejects(
    () => testDiscordConnection("https://example.com/hook", discordRequest),
    /Invalid Discord/,
  );
});

test("retries failed deliveries and stores safe delivery logs", async () => {
  let calls = 0;
  const request: NotificationRequest = async () => {
    calls += 1;
    return calls === 1
      ? new Response(JSON.stringify({ ok: false, error: "rate_limited" }), {
          status: 429,
        })
      : new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const repository = new MemoryDeliveryLogRepository();
  const result = await deliverNotification({
    provider: "slack",
    notification,
    preferences: { scanCompleted: true, criticalAlerts: true },
    config: { slackToken: "secret", slackChannel: "C123" },
    repository,
    request,
    maxAttempts: 3,
  });
  assert.equal(result?.status, "delivered");
  assert.equal(result?.attempts.length, 2);
  assert.equal((await repository.list()).length, 1);
  assert.doesNotMatch(JSON.stringify(result), /secret/);
});

test("records a safe failure after retry exhaustion", async () => {
  const repository = new MemoryDeliveryLogRepository();
  const result = await deliverNotification({
    provider: "discord",
    notification: { ...notification, kind: "critical_alert" },
    preferences: { scanCompleted: true, criticalAlerts: true },
    config: { discordWebhookUrl: "https://discord.com/api/webhooks/1/token" },
    repository,
    request: async () => new Response("failed", { status: 500 }),
    maxAttempts: 2,
  });
  assert.equal(result?.status, "failed");
  assert.equal(result?.attempts.length, 2);
});
