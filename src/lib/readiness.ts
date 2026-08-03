export type ReadinessCheck = {
  id: string;
  required: boolean;
  ready: boolean;
  message: string;
};

export function buildReadinessReport(
  env: Record<string, string | undefined> = process.env,
) {
  const production = env.NODE_ENV === "production";
  const checks: ReadinessCheck[] = [
    {
      id: "runtime",
      required: true,
      ready: Boolean(process.version),
      message: "Node.js runtime is available",
    },
    {
      id: "public-url",
      required: production,
      ready: Boolean(env.APP_URL?.startsWith("https://")),
      message: production
        ? "APP_URL must be a production HTTPS URL"
        : "APP_URL is optional outside production",
    },
    {
      id: "github-app",
      required: false,
      ready: Boolean(
        env.GITHUB_APP_ID &&
        env.GITHUB_APP_PRIVATE_KEY &&
        env.GITHUB_WEBHOOK_SECRET,
      ),
      message: "GitHub App integration configuration",
    },
    {
      id: "slack",
      required: false,
      ready: Boolean(env.SLACK_BOT_TOKEN && env.SLACK_CHANNEL_ID),
      message: "Slack notification configuration",
    },
    {
      id: "discord",
      required: false,
      ready: Boolean(env.DISCORD_WEBHOOK_URL),
      message: "Discord notification configuration",
    },
  ];
  const ready = checks
    .filter((check) => check.required)
    .every((check) => check.ready);
  return {
    status: ready ? "ready" : "not_ready",
    version: "1.0.0",
    checks,
    checkedAt: new Date().toISOString(),
  } as const;
}
