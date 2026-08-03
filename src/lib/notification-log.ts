import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  DeliveryLog,
  DeliveryLogRepository,
  NotificationPreferences,
} from "./notifications";

export class JsonDeliveryLogRepository implements DeliveryLogRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath = process.env.NOTIFICATION_LOG_PATH ??
      path.join(process.cwd(), ".data", "notification-deliveries.json"),
  ) {}

  private async read(): Promise<DeliveryLog[]> {
    try {
      return JSON.parse(await readFile(this.filePath, "utf8")) as DeliveryLog[];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async save(log: DeliveryLog) {
    this.queue = this.queue.then(async () => {
      const logs = await this.read();
      logs.unshift(log);
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(
        this.filePath,
        JSON.stringify(logs.slice(0, 200), null, 2),
        "utf8",
      );
    });
    await this.queue;
  }

  async list() {
    await this.queue;
    return this.read();
  }
}

export class JsonNotificationPreferencesRepository {
  constructor(
    private readonly filePath = process.env.NOTIFICATION_PREFERENCES_PATH ??
      path.join(process.cwd(), ".data", "notification-preferences.json"),
  ) {}

  async get(): Promise<NotificationPreferences> {
    try {
      return JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as NotificationPreferences;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { scanCompleted: true, criticalAlerts: true };
      }
      throw error;
    }
  }

  async save(preferences: NotificationPreferences) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(
      this.filePath,
      JSON.stringify(preferences, null, 2),
      "utf8",
    );
    return preferences;
  }
}
