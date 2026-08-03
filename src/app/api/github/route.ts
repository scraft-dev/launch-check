import { NextResponse } from "next/server";
import {
  connectGitHubRepository,
  createFindingIssue,
  createGitHubAppJwt,
  createGitHubRequest,
  createInstallationToken,
  linkScanToCommit,
  publishPullRequestCheck,
  readGitHubAppConfig,
} from "@/lib/github";

async function installationRequest(installationId: string) {
  const config = readGitHubAppConfig();
  if (!config) throw new Error("GitHub App is not configured");
  const appRequest = createGitHubRequest(createGitHubAppJwt(config));
  const token = await createInstallationToken(installationId, appRequest);
  return createGitHubRequest(token);
}

export async function GET() {
  return NextResponse.json({ configured: Boolean(readGitHubAppConfig()) });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = String(body.action ?? "");
    const repository = String(body.repository ?? "");
    const installationId = String(body.installationId ?? "");
    if (!repository || !installationId) {
      return NextResponse.json(
        { error: "Repository and installation ID are required" },
        { status: 400 },
      );
    }
    const github = await installationRequest(installationId);

    if (action === "connect") {
      return NextResponse.json({
        repository: await connectGitHubRepository(repository, github),
      });
    }
    if (action === "create-issue") {
      const finding = body.finding as {
        title: string;
        detail: string;
        severity: "critical" | "high" | "medium" | "low";
        scanId: string;
      };
      return NextResponse.json({
        issue: await createFindingIssue(
          repository,
          finding,
          String(body.scanUrl ?? ""),
          github,
        ),
      });
    }
    if (action === "link-commit") {
      return NextResponse.json({
        status: await linkScanToCommit(
          repository,
          String(body.sha ?? ""),
          String(body.scanId ?? ""),
          String(body.scanUrl ?? ""),
          github,
        ),
      });
    }
    if (action === "publish-check") {
      return NextResponse.json({
        check: await publishPullRequestCheck(
          repository,
          String(body.sha ?? ""),
          {
            scanId: String(body.scanId ?? ""),
            scanUrl: String(body.scanUrl ?? ""),
            score: Number(body.score ?? 0),
            summary: String(body.summary ?? ""),
          },
          github,
        ),
      });
    }
    return NextResponse.json(
      { error: "Unsupported GitHub action" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GitHub request failed";
    const status = message === "GitHub App is not configured" ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
