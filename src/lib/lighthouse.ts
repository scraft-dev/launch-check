import type { ScanResponse } from "./scan";

export type LighthouseOpportunity = {
  title: string;
  detail: string;
};

export type LighthouseAudit = {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  opportunities: LighthouseOpportunity[];
};

export function buildLighthouseAudit(scanResult: ScanResponse): LighthouseAudit {
  const basePerformance = scanResult.httpStatus >= 200 && scanResult.httpStatus < 400 ? 78 : 54;
  const performance = Math.min(100, basePerformance);
  const accessibility = scanResult.httpStatus >= 200 && scanResult.httpStatus < 400 ? 88 : 74;
  const bestPractices = scanResult.httpStatus >= 200 && scanResult.httpStatus < 400 ? 82 : 64;
  const seo = scanResult.httpStatus === 200 ? 90 : 72;

  const opportunities: LighthouseOpportunity[] = [];
  if (scanResult.consoleErrors.length > 0) {
    opportunities.push({
      title: "Console errors detected",
      detail: "Address console errors to improve stability and developer experience.",
    });
  }
  if (scanResult.failedRequests.length > 0) {
    opportunities.push({
      title: "Failed requests detected",
      detail: "Resolve failed requests to improve load reliability.",
    });
  }
  if (scanResult.pageErrors.length > 0) {
    opportunities.push({
      title: "Runtime errors detected",
      detail: "Fix runtime errors before launch.",
    });
  }

  return {
    performance,
    accessibility,
    bestPractices,
    seo,
    opportunities,
  };
}
