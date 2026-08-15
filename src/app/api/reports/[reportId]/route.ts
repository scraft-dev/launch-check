import { NextResponse } from "next/server";
import type { ReportIssueStatus } from "@/lib/report";
import { reportRepository } from "@/lib/report-repository";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ reportId: string }> };

const allowedStatuses = new Set<ReportIssueStatus>([
  "open",
  "fixed",
  "ignored",
]);

export async function GET(_request: Request, context: RouteContext) {
  const { reportId } = await context.params;
  const report = await reportRepository.get(reportId);
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }
  return NextResponse.json(report);
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { reportId } = await context.params;
    const body = (await request.json()) as {
      findingId?: string;
      status?: ReportIssueStatus;
      actorId?: string | null;
    };
    if (!body.findingId || !body.status || !allowedStatuses.has(body.status)) {
      return NextResponse.json(
        { error: "findingId and a valid status are required." },
        { status: 400 },
      );
    }
    const report = await reportRepository.updateFindingStatus({
      reportId,
      findingId: body.findingId,
      status: body.status,
      actorId: body.actorId,
      updatedAt: new Date().toISOString(),
    });
    if (!report) {
      return NextResponse.json(
        { error: "Report or finding not found." },
        { status: 404 },
      );
    }
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update Report.",
      },
      { status: 400 },
    );
  }
}
