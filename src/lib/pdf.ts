import { buildPdfBuffer } from "./pdf-generator";

export type PdfReport = {
  title: string;
  summary: string;
  findings: string[];
  screenshots: string[];
  score?: number;
  details: string[];
  pdfBase64: string;
};

export async function buildPdfReport(
  title: string,
  summary: string,
  findings: string[],
  screenshots: string[],
  metadata?: { score?: number; details?: string[] },
): Promise<PdfReport> {
  const details = metadata?.details ?? [];
  const score = metadata?.score;
  const pdfBuffer = await buildPdfBuffer({
    title,
    summary,
    findings,
    screenshots,
    score,
    details,
  });

  return {
    title,
    summary,
    findings,
    screenshots,
    score,
    details,
    pdfBase64: pdfBuffer.toString("base64"),
  };
}

export function createPdfDownloadUrl(report: PdfReport): string {
  return `data:application/pdf;base64,${report.pdfBase64}`;
}
