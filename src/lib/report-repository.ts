import path from "node:path";
import { JsonReportRepository } from "./report-store";

const defaultPath = process.env.VERCEL
  ? "/tmp/launch-check-reports.json"
  : path.join(process.cwd(), ".data", "reports.json");

export const reportRepository = new JsonReportRepository(
  process.env.REPORT_STORE_PATH ?? defaultPath,
);
