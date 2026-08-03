export type ScanAnalysisSuggestion = {
  title: string;
  detail: string;
};

export type ScanAnalysis = {
  summary: string;
  suggestions: ScanAnalysisSuggestion[];
};

export type ScanAnalysisPayload = {
  url: string;
  finalUrl: string;
  pageTitle: string;
  httpStatus: number;
  loadTime: number;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: Array<{
    url: string;
    resourceType: string;
    status: number;
    error: string;
  }>;
};

export function buildAnalysisPrompt(payload: ScanAnalysisPayload): string {
  const compactPayload = trimAnalysisPayload(JSON.stringify(payload));

  return `Launch Check AI analysis for ${payload.url}\nFocus on the most relevant issues and propose a concise fix plan.\nPayload: ${compactPayload}`;
}

export function trimAnalysisPayload(value: string): string {
  if (value.length <= 600) {
    return value;
  }

  return `${value.slice(0, 597)}...`;
}

export function buildFallbackAnalysis(
  payload: ScanAnalysisPayload,
): ScanAnalysis {
  const suggestions: ScanAnalysisSuggestion[] = [];

  if (payload.httpStatus >= 400) {
    suggestions.push({
      title: "Inspect the failing response",
      detail:
        "Check the server response and verify the target route is available.",
    });
  }

  if (payload.pageErrors.length > 0) {
    suggestions.push({
      title: "Review runtime errors",
      detail:
        "Inspect the reported runtime error and fix the originating script or component.",
    });
  }

  if (payload.consoleErrors.length > 0) {
    suggestions.push({
      title: "Tackle console warnings",
      detail:
        "Resolve the console errors so failures are visible before launch.",
    });
  }

  if (payload.failedRequests.length > 0) {
    suggestions.push({
      title: "Fix failed requests",
      detail:
        "Verify that the referenced assets or endpoints are reachable and returning successful responses.",
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: "Keep monitoring",
      detail: "No critical issues were detected in this scan snapshot.",
    });
  }

  const issueSignals =
    payload.failedRequests.length +
    payload.pageErrors.length +
    payload.consoleErrors.length;
  const statusSummary =
    payload.httpStatus >= 400
      ? `HTTP ${payload.httpStatus}`
      : "healthy response";

  return {
    summary: `The scan found ${issueSignals} issue signals and reported ${statusSummary}. Review the recommendations below before launch.`,
    suggestions,
  };
}
