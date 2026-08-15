import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ReportIssueStatus, ReportSnapshot } from "./report";

export interface ReportRepository {
  save(report: ReportSnapshot): Promise<ReportSnapshot>;
  get(reportId: string): Promise<ReportSnapshot | null>;
  list(options?: { workspaceId?: string | null }): Promise<ReportSnapshot[]>;
  updateFindingStatus(input: {
    reportId: string;
    findingId: string;
    status: ReportIssueStatus;
    actorId?: string | null;
    updatedAt: string;
  }): Promise<ReportSnapshot | null>;
}

export class JsonReportRepository implements ReportRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath = process.env.REPORT_STORE_PATH ??
      path.join(process.cwd(), ".data", "reports.json"),
  ) {}

  private async read(): Promise<ReportSnapshot[]> {
    try {
      return JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as ReportSnapshot[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  private async write(reports: ReportSnapshot[]): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(reports, null, 2), "utf8");
  }

  async save(report: ReportSnapshot): Promise<ReportSnapshot> {
    this.queue = this.queue.then(async () => {
      const reports = await this.read();
      const withoutCurrent = reports.filter(
        (item) => item.reportId !== report.reportId,
      );
      await this.write([report, ...withoutCurrent].slice(0, 1000));
    });
    await this.queue;
    return structuredClone(report);
  }

  async get(reportId: string): Promise<ReportSnapshot | null> {
    await this.queue;
    const report = (await this.read()).find(
      (item) => item.reportId === reportId,
    );
    return report ? structuredClone(report) : null;
  }

  async list(options: { workspaceId?: string | null } = {}) {
    await this.queue;
    const reports = await this.read();
    const filtered = options.workspaceId
      ? reports.filter((report) => report.workspaceId === options.workspaceId)
      : reports;
    return structuredClone(filtered);
  }

  async updateFindingStatus(input: {
    reportId: string;
    findingId: string;
    status: ReportIssueStatus;
    actorId?: string | null;
    updatedAt: string;
  }): Promise<ReportSnapshot | null> {
    let updated: ReportSnapshot | null = null;
    this.queue = this.queue.then(async () => {
      const reports = await this.read();
      const reportIndex = reports.findIndex(
        (report) => report.reportId === input.reportId,
      );
      if (reportIndex < 0) return;
      const findingIndex = reports[reportIndex].findings.findIndex(
        (finding) => finding.id === input.findingId,
      );
      if (findingIndex < 0) return;

      const nextReport = structuredClone(reports[reportIndex]);
      nextReport.findings[findingIndex] = {
        ...nextReport.findings[findingIndex],
        issueStatus: input.status,
        statusUpdatedAt: new Date(input.updatedAt).toISOString(),
        statusActorId: input.actorId?.trim() || null,
      };
      reports[reportIndex] = nextReport;
      await this.write(reports);
      updated = structuredClone(nextReport);
    });
    await this.queue;
    return updated;
  }
}
