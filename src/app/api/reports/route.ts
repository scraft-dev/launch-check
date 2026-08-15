import crypto from "node:crypto";
import { NextResponse } from "next/server";
import type { ScanAnalysis } from "@/lib/ai-analysis";
import { createReportSnapshot } from "@/lib/report";
import { reportRepository } from "@/lib/report-repository";
import type { ScanResponse } from "@/lib/scan";

export const runtime = "nodejs";

type CreateReportBody = {
  scanResult?: ScanResponse & { analysis?: ScanAnalysis };
  previousReportId?: string | null;
  workspaceId?: string | null;
};

function isScanResponse(value: unknown): value is ScanResponse {
  if (!value || typeof value !== "object") return false;
  const scan = value as Partial<ScanResponse>;
  return (
    typeof scan.url === "string" &&
    typeof scan.finalUrl === "string" &&
    typeof scan.pageTitle === "string" &&
    typeof scan.httpStatus === "number" &&
    typeof scan.loadTime === "number" &&
    Array.isArray(scan.consoleErrors) &&
    Array.isArray(scan.pageErrors) &&
    Array.isArray(scan.failedRequests)
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateReportBody;
    if (!isScanResponse(body.scanResult)) {
      return NextResponse.json(
        { error: "A valid scanResult is required." },
        { status: 400 },
      );
    }

    const previousReport = body.previousReportId
      ? await reportRepository.get(body.previousReportId)
      : null;
    if (body.previousReportId && !previousReport) {
      return NextResponse.json(
        { error: "Previous Report was not found." },
        { status: 404 },
      );
    }

    const reportId = `report_${crypto.randomUUID().replaceAll("-", "")}`;
    const analysis = body.scanResult.analysis;
    const report = createReportSnapshot({
      reportId,
      scannedAt: new Date().toISOString(),
      scanResult: body.scanResult,
      previousReport,
      workspaceId: body.workspaceId,
      assistance: analysis
        ? {
            summary: analysis.summary,
            suggestions: analysis.suggestions.map(
              (suggestion) => `${suggestion.title}: ${suggestion.detail}`,
            ),
          }
        : null,
    });
    await reportRepository.save(report);
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to create Report.",
      },
      { status: 400 },
    );
  }
}
