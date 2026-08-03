import { NextResponse } from "next/server";
import {
  handleGitHubWebhook,
  readGitHubAppConfig,
  verifyGitHubWebhook,
} from "@/lib/github";

export async function POST(request: Request) {
  const config = readGitHubAppConfig();
  if (!config)
    return NextResponse.json(
      { error: "GitHub App is not configured" },
      { status: 503 },
    );
  const rawBody = await request.text();
  if (
    !verifyGitHubWebhook(
      rawBody,
      request.headers.get("x-hub-signature-256"),
      config.webhookSecret,
    )
  ) {
    return NextResponse.json(
      { error: "Invalid GitHub signature" },
      { status: 401 },
    );
  }
  try {
    const result = handleGitHubWebhook(
      request.headers.get("x-github-event"),
      request.headers.get("x-github-delivery"),
      JSON.parse(rawBody),
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid webhook" },
      { status: 400 },
    );
  }
}
