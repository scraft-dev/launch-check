export type PdfReport = {
  title: string;
  summary: string;
  findings: string[];
  screenshots: string[];
};

export function buildPdfReport(title: string, summary: string, findings: string[], screenshots: string[]): PdfReport {
  return {
    title,
    summary,
    findings,
    screenshots,
  };
}

export function createPdfDownloadUrl(report: PdfReport): string {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(JSON.stringify(report, null, 2))}`;
}
