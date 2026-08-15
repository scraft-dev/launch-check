import { buildScanReport, type IssueSeverity, type ScanResponse } from "./scan";

export const REPORT_SCHEMA_VERSION = "1" as const;
export const LEGACY_LAUNCH_SCORE_POLICY_VERSION = "legacy-scan-report-v1";

export type LaunchPriority = "critical" | "high" | "medium" | "low";
export type ReportIssueStatus = "open" | "fixed" | "ignored";

export type ReportFinding = {
  id: string;
  title: string;
  technicalSeverity: IssueSeverity;
  launchPriority: LaunchPriority | null;
  issueStatus: ReportIssueStatus | null;
  location: {
    pageUrl: string;
    category: string | null;
  };
  evidence: string;
  cause: string;
  recommendedFix: string;
};

export type ReportSnapshot = {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  reportId: string;
  targetUrl: string;
  finalUrl: string;
  pageTitle: string;
  scannedAt: string;
  launchScore: number;
  severitySummary: Record<IssueSeverity, number>;
  summary: string;
  findings: ReportFinding[];
  policyVersions: {
    launchScore: string;
    launchPriority: string | null;
    launchDecision: string | null;
  };
};

export type CreateReportSnapshotInput = {
  reportId: string;
  scannedAt: string;
  scanResult: ScanResponse;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }

  return normalized;
}

function normalizeTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("scannedAt must be a valid timestamp.");
  }

  return timestamp.toISOString();
}

export function createReportSnapshot(
  input: CreateReportSnapshotInput,
): ReportSnapshot {
  const reportId = normalizeRequiredText(input.reportId, "reportId");
  const scannedAt = normalizeTimestamp(input.scannedAt);
  const scanReport = buildScanReport(input.scanResult);

  return {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportId,
    targetUrl: input.scanResult.url,
    finalUrl: input.scanResult.finalUrl,
    pageTitle: input.scanResult.pageTitle,
    scannedAt,
    launchScore: scanReport.launchScore,
    severitySummary: { ...scanReport.severitySummary },
    summary: scanReport.summary,
    findings: scanReport.issues.map((issue, index) => ({
      id: `${reportId}-finding-${String(index + 1).padStart(3, "0")}`,
      title: issue.title,
      technicalSeverity: issue.severity,
      launchPriority: null,
      issueStatus: null,
      location: {
        pageUrl: issue.pageUrl ?? input.scanResult.finalUrl,
        category: issue.category ?? null,
      },
      evidence: issue.detail,
      cause: issue.detail,
      recommendedFix:
        issue.recommendation ??
        "Review the observed evidence and correct the underlying implementation.",
    })),
    policyVersions: {
      launchScore: LEGACY_LAUNCH_SCORE_POLICY_VERSION,
      launchPriority: null,
      launchDecision: null,
    },
  };
}
