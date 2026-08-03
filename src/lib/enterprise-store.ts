import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AuditEvent,
  EnterpriseOrganization,
  EnterpriseRepository,
} from "./enterprise";

type EnterpriseStore = {
  organizations: EnterpriseOrganization[];
  auditEvents: AuditEvent[];
};

export class JsonEnterpriseRepository implements EnterpriseRepository {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath = process.env.ENTERPRISE_STORE_PATH ??
      path.join(process.cwd(), ".data", "enterprise.json"),
  ) {}

  private async read(): Promise<EnterpriseStore> {
    try {
      return JSON.parse(
        await readFile(this.filePath, "utf8"),
      ) as EnterpriseStore;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { organizations: [], auditEvents: [] };
      }
      throw error;
    }
  }

  private async mutate(change: (store: EnterpriseStore) => void) {
    this.queue = this.queue.then(async () => {
      const store = await this.read();
      change(store);
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, JSON.stringify(store, null, 2), "utf8");
    });
    await this.queue;
  }

  async listOrganizations() {
    await this.queue;
    return (await this.read()).organizations;
  }

  async saveOrganization(organization: EnterpriseOrganization) {
    await this.mutate((store) => {
      const index = store.organizations.findIndex(
        (item) => item.id === organization.id,
      );
      if (index >= 0) store.organizations[index] = organization;
      else store.organizations.push(organization);
    });
  }

  async deleteOrganization(id: string) {
    await this.mutate((store) => {
      store.organizations = store.organizations.filter(
        (item) => item.id !== id,
      );
      store.auditEvents = store.auditEvents.filter(
        (event) => event.organizationId !== id,
      );
    });
  }

  async listAuditEvents(organizationId: string) {
    await this.queue;
    return (await this.read()).auditEvents.filter(
      (event) => event.organizationId === organizationId,
    );
  }

  async saveAuditEvent(event: AuditEvent) {
    await this.mutate((store) => {
      store.auditEvents.unshift(event);
      store.auditEvents = store.auditEvents.slice(0, 5000);
    });
  }
}
