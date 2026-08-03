import { NextResponse } from "next/server";
import {
  JsonDeliveryLogRepository,
  JsonNotificationPreferencesRepository,
} from "@/lib/notification-log";
import {
  deliverNotification,
  readNotificationConfig,
  testDiscordConnection,
  testSlackConnection,
  type NotificationPreferences,
  type NotificationProvider,
  type ScanNotification,
} from "@/lib/notifications";

const repository = new JsonDeliveryLogRepository();
const preferencesRepository = new JsonNotificationPreferencesRepository();

export async function GET() {
  const config = readNotificationConfig();
  return NextResponse.json({
    configured: {
      slack: config.slackConfigured,
      discord: config.discordConfigured,
    },
    deliveries: await repository.list(),
    preferences: await preferencesRepository.get(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const provider = body.provider as NotificationProvider;
    if (!(["slack", "discord"] as const).includes(provider)) {
      return NextResponse.json(
        { error: "Unsupported notification provider" },
        { status: 400 },
      );
    }
    const config = readNotificationConfig();

    if (body.action === "preferences") {
      const preferences = body.preferences as NotificationPreferences;
      if (
        typeof preferences?.scanCompleted !== "boolean" ||
        typeof preferences?.criticalAlerts !== "boolean"
      ) {
        return NextResponse.json(
          { error: "Valid notification preferences are required" },
          { status: 400 },
        );
      }
      return NextResponse.json({
        preferences: await preferencesRepository.save(preferences),
      });
    }

    if (body.action === "test") {
      const connection =
        provider === "slack"
          ? config.slackToken
            ? await testSlackConnection(config.slackToken)
            : null
          : config.discordWebhookUrl
            ? await testDiscordConnection(config.discordWebhookUrl)
            : null;
      if (!connection) {
        return NextResponse.json(
          { error: `${provider} is not configured` },
          { status: 503 },
        );
      }
      return NextResponse.json({ connection });
    }

    if (body.action === "deliver") {
      const notification = body.notification as ScanNotification;
      const preferences = body.preferences as NotificationPreferences;
      if (!notification?.scanId || !notification?.reportUrl || !preferences) {
        return NextResponse.json(
          { error: "Notification and preferences are required" },
          { status: 400 },
        );
      }
      const delivery = await deliverNotification({
        provider,
        notification,
        preferences,
        config,
        repository,
        maxAttempts: 3,
      });
      return NextResponse.json({ delivery, skipped: delivery === null });
    }

    return NextResponse.json(
      { error: "Unsupported notification action" },
      { status: 400 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Notification request failed",
      },
      { status: 502 },
    );
  }
}
