import { buildScanReport, type IssueSeverity, type ScanResponse } from "./scan";

export const REPORT_SCHEMA_VERSION = "2" as const;
export const LEGACY_LAUNCH_SCORE_POLICY_VERSION = "legacy-scan-report-v1";
export const LAUNCH_PRIORITY_POLICY_VERSION = "launch-priority-v1";
export const LAUNCH_DECISION_POLICY_VERSION = "launch-decision-v1";
export const FINDING_FINGERPRINT_VERSION = "finding-fingerprint-v1";

export type LaunchPriority = "critical" | "high" | "medium" | "low";
export type ReportIssueStatus = "open" | "fixed" | "ignored";
export type LaunchDecision = "ready" | "not-ready";
export type FindingChange = "fixed" | "new" | "remaining";

export const launchPriorities: LaunchPriority[] = [
  "critical",
  "high",
  "medium",
  "low",
];

export type PrioritySummary = Record<LaunchPriority, number>;

export type ReportFinding = {
  id: string;
  fingerprint: string;
  fingerprintVersion: typeof FINDING_FINGERPRINT_VERSION;
  title: string;
  technicalSeverity: IssueSeverity;
  launchPriority: LaunchPriority;
  issueStatus: ReportIssueStatus;
  statusUpdatedAt: string | null;
  statusActorId: string | null;
  location: {
    pageUrl: string;
    category: string | null;
  };
  evidence: string;
  cause: string;
  recommendedFix: string;
};

export type ReportComparison = {
  previousReportId: string;
  fixed: number;
  new: number;
  remaining: number;
  priorityDelta: Record<
    LaunchPriority,
    { previous: number; current: number; change: number }
  >;
  findings: Array<{
    fingerprint: string;
    change: FindingChange;
    title: string;
    launchPriority: LaunchPriority;
  }>;
};

export type ReportSnapshot = {
  schemaVersion: typeof REPORT_SCHEMA_VERSION;
  reportId: string;
  workspaceId: string | null;
  targetUrl: string;
  finalUrl: string;
  pageTitle: string;
  scannedAt: string;
  launchScore: number;
  launchDecision: LaunchDecision;
  severitySummary: Record<IssueSeverity, number>;
  prioritySummary: PrioritySummary;
  summary: string;
  findings: ReportFinding[];
  previousReportId: string | null;
  comparison: ReportComparison | null;
  assistance: {
    summary: string;
    suggestions: string[];
  } | null;
  policyVersions: {
    launchScore: string;
    launchPriority: string;
    launchDecision: string;
  };
};

export type CreateReportSnapshotInput = {
  reportId: string;
  scannedAt: string;
  scanResult: ScanResponse;
  workspaceId?: string | null;
  previousReport?: ReportSnapshot | null;
  assistance?: { summary: string; suggestions: string[] } | null;
};

function normalizeRequiredText(value: string, fieldName: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
}

function normalizeTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("scannedAt must be a valid timestamp.");
  }
  return timestamp.toISOString();
}

function emptyPrioritySummary(): PrioritySummary {
  return { critical: 0, high: 0, medium: 0, low: 0 };
}

export function getLaunchPriority(
  technicalSeverity: IssueSeverity,
): LaunchPriority {
  return technicalSeverity;
}

export function getLaunchDecision(
  prioritySummary: PrioritySummary,
): LaunchDecision {
  return prioritySummary.critical > 0 ? "not-ready" : "ready";
}

function hashFinding(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createFindingFingerprint(input: {
  title: string;
  category: string | null;
  pageUrl: string;
  evidence: string;
}): string {
  const normalized = [
    input.title,
    input.category ?? "",
    input.pageUrl,
    input.evidence,
  ]
    .map((value) => value.trim().toLowerCase().replace(/\s+/g, " "))
    .join("\u001f");
  return hashFinding(normalized);
}

export function buildReportComparison(
  previous: ReportSnapshot,
  current: ReportSnapshot,
): ReportComparison {
  const previousByFingerprint = new Map(
    previous.findings.map((finding) => [finding.fingerprint, finding]),
  );
  const currentByFingerprint = new Map(
    current.findings.map((finding) => [finding.fingerprint, finding]),
  );

  const findings: ReportComparison["findings"] = [];
  for (const finding of previous.findings) {
    findings.push({
      fingerprint: finding.fingerprint,
      change: currentByFingerprint.has(finding.fingerprint)
        ? "remaining"
        : "fixed",
      title: finding.title,
      launchPriority: finding.launchPriority,
    });
  }
  for (const finding of current.findings) {
    if (!previousByFingerprint.has(finding.fingerprint)) {
      findings.push({
        fingerprint: finding.fingerprint,
        change: "new",
        title: finding.title,
        launchPriority: finding.launchPriority,
      });
    }
  }

  return {
    previousReportId: previous.reportId,
    fixed: findings.filter((finding) => finding.change === "fixed").length,
    new: findings.filter((finding) => finding.change === "new").length,
    remaining: findings.filter((finding) => finding.change === "remaining")
      .length,
    priorityDelta: Object.fromEntries(
      launchPriorities.map((priority) => {
        const previousCount = previous.prioritySummary[priority];
        const currentCount = current.prioritySummary[priority];
        return [
          priority,
          {
            previous: previousCount,
            current: currentCount,
            change: currentCount - previousCount,
          },
        ];
      }),
    ) as ReportComparison["priorityDelta"],
    findings,
  };
}

export function createReportSnapshot(
  input: CreateReportSnapshotInput,
): ReportSnapshot {
  const reportId = normalizeRequiredText(input.reportId, "reportId");
  const scannedAt = normalizeTimestamp(input.scannedAt);
  const scanReport = buildScanReport(input.scanResult);
  const prioritySummary = emptyPrioritySummary();

  const findings = scanReport.issues.map((issue, index): ReportFinding => {
    const launchPriority = getLaunchPriority(issue.severity);
    prioritySummary[launchPriority] += 1;
    const pageUrl = issue.pageUrl ?? input.scanResult.finalUrl;
    const category = issue.category ?? null;
    const fingerprint = createFindingFingerprint({
      title: issue.title,
      category,
      pageUrl,
      evidence: issue.detail,
    });
    return {
      id: `${reportId}-finding-${String(index + 1).padStart(3, "0")}`,
      fingerprint,
      fingerprintVersion: FINDING_FINGERPRINT_VERSION,
      title: issue.title,
      technicalSeverity: issue.severity,
      launchPriority,
      issueStatus: "open",
      statusUpdatedAt: null,
      statusActorId: null,
      location: { pageUrl, category },
      evidence: issue.detail,
      cause: issue.detail,
      recommendedFix:
        issue.recommendation ??
        "Review the observed evidence and correct the underlying implementation.",
    };
  });

  const report: ReportSnapshot = {
    schemaVersion: REPORT_SCHEMA_VERSION,
    reportId,
    workspaceId: input.workspaceId?.trim() || null,
    targetUrl: input.scanResult.url,
    finalUrl: input.scanResult.finalUrl,
    pageTitle: input.scanResult.pageTitle,
    scannedAt,
    launchScore: scanReport.launchScore,
    launchDecision: getLaunchDecision(prioritySummary),
    severitySummary: { ...scanReport.severitySummary },
    prioritySummary,
    summary: scanReport.summary,
    findings,
    previousReportId: input.previousReport?.reportId ?? null,
    comparison: null,
    assistance: input.assistance ?? null,
    policyVersions: {
      launchScore: LEGACY_LAUNCH_SCORE_POLICY_VERSION,
      launchPriority: LAUNCH_PRIORITY_POLICY_VERSION,
      launchDecision: LAUNCH_DECISION_POLICY_VERSION,
    },
  };

  if (input.previousReport) {
    report.comparison = buildReportComparison(input.previousReport, report);
  }
  return report;
}
