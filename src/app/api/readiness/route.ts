import { buildReadinessReport } from "@/lib/readiness";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = buildReadinessReport();
  return Response.json(report, {
    status: report.status === "ready" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
