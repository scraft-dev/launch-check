import fs from "node:fs/promises";
import path from "node:path";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceMember = {
  id: string;
  email: string;
  role: WorkspaceRole;
  status: "active" | "pending";
};

export type Workspace = {
  id: string;
  name: string;
  ownerId: string;
  members: WorkspaceMember[];
  shareScanHistory: boolean;
  settings: Record<string, boolean | number | string>;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceCreateInput = {
  name: string;
  ownerId: string;
  shareScanHistory?: boolean;
  settings?: Record<string, boolean | number | string>;
};

export type WorkspaceUpdateInput = {
  name?: string;
  shareScanHistory?: boolean;
  settings?: Record<string, boolean | number | string>;
};

export type WorkspaceMemberInviteInput = {
  email: string;
  role: WorkspaceRole;
};

export interface WorkspaceRepository {
  list(): Promise<Workspace[]>;
  get(id: string): Promise<Workspace | null>;
  create(workspace: Workspace): Promise<Workspace>;
  update(workspace: Workspace): Promise<Workspace>;
  delete(id: string): Promise<void>;
}

export class LocalWorkspaceRepository implements WorkspaceRepository {
  constructor(private readonly filePath: string) {}

  private async readAll(): Promise<Workspace[]> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Workspace[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async writeAll(workspaces: Workspace[]): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(workspaces, null, 2));
  }

  async list(): Promise<Workspace[]> {
    return this.readAll();
  }

  async get(id: string): Promise<Workspace | null> {
    const workspaces = await this.readAll();
    return workspaces.find((workspace) => workspace.id === id) ?? null;
  }

  async create(workspace: Workspace): Promise<Workspace> {
    const workspaces = await this.readAll();
    workspaces.push(workspace);
    await this.writeAll(workspaces);
    return workspace;
  }

  async update(workspace: Workspace): Promise<Workspace> {
    const workspaces = await this.readAll();
    const index = workspaces.findIndex((item) => item.id === workspace.id);
    if (index === -1) {
      throw new Error("Workspace not found");
    }
    workspaces[index] = workspace;
    await this.writeAll(workspaces);
    return workspace;
  }

  async delete(id: string): Promise<void> {
    const workspaces = await this.readAll();
    const next = workspaces.filter((workspace) => workspace.id !== id);
    await this.writeAll(next);
  }
}

export class WorkspaceService {
  constructor(private readonly repo: WorkspaceRepository) {}

  async listWorkspaces(): Promise<Workspace[]> {
    return this.repo.list();
  }

  async getWorkspace(id: string): Promise<Workspace | null> {
    return this.repo.get(id);
  }

  async createWorkspace(input: WorkspaceCreateInput): Promise<Workspace> {
    if (!input.name.trim()) {
      throw new Error("Workspace name is required");
    }
    const workspace: Workspace = {
      id: `workspace_${Math.random().toString(36).slice(2, 10)}`,
      name: input.name.trim(),
      ownerId: input.ownerId,
      members: [],
      shareScanHistory: input.shareScanHistory ?? false,
      settings: {
        allowMemberInvites: true,
        ...(input.settings ?? {}),
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return this.repo.create(workspace);
  }

  async updateWorkspace(
    id: string,
    updates: WorkspaceUpdateInput,
    actorId: string,
    actorRole: WorkspaceRole,
  ): Promise<Workspace> {
    const workspace = await this.requireWorkspace(id);
    this.ensurePermission(workspace, actorId, actorRole, ["owner", "admin"]);

    const next: Workspace = {
      ...workspace,
      name: updates.name?.trim() || workspace.name,
      shareScanHistory: updates.shareScanHistory ?? workspace.shareScanHistory,
      settings: {
        ...workspace.settings,
        ...(updates.settings ?? {}),
      },
      updatedAt: new Date().toISOString(),
    };

    return this.repo.update(next);
  }

  async deleteWorkspace(
    id: string,
    actorId: string,
    actorRole: WorkspaceRole,
  ): Promise<void> {
    const workspace = await this.requireWorkspace(id);
    this.ensurePermission(workspace, actorId, actorRole, ["owner"]);
    await this.repo.delete(id);
  }

  async inviteMember(
    id: string,
    input: WorkspaceMemberInviteInput,
    actorId: string,
    actorRole: WorkspaceRole,
  ): Promise<WorkspaceMember> {
    const workspace = await this.requireWorkspace(id);
    this.ensurePermission(workspace, actorId, actorRole, ["owner", "admin"]);

    const member: WorkspaceMember = {
      id: `member_${Math.random().toString(36).slice(2, 10)}`,
      email: input.email,
      role: input.role,
      status: "pending",
    };
    workspace.members.push(member);
    workspace.updatedAt = new Date().toISOString();
    await this.repo.update(workspace);
    return member;
  }

  async setMemberRole(
    id: string,
    memberId: string,
    role: WorkspaceRole,
    actorId: string,
    actorRole: WorkspaceRole,
  ): Promise<Workspace> {
    const workspace = await this.requireWorkspace(id);
    this.ensurePermission(workspace, actorId, actorRole, ["owner", "admin"]);

    const nextMembers = workspace.members.map((member) =>
      member.id === memberId ? { ...member, role } : member,
    );
    const next: Workspace = {
      ...workspace,
      members: nextMembers,
      updatedAt: new Date().toISOString(),
    };
    return this.repo.update(next);
  }

  private async requireWorkspace(id: string): Promise<Workspace> {
    const workspace = await this.repo.get(id);
    if (!workspace) {
      throw new Error("Workspace not found");
    }
    return workspace;
  }

  private ensurePermission(
    workspace: Workspace,
    actorId: string,
    actorRole: WorkspaceRole,
    allowedRoles: WorkspaceRole[],
  ): void {
    if (actorId === workspace.ownerId && actorRole === "owner") {
      return;
    }

    const roleRank = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    } satisfies Record<WorkspaceRole, number>;

    const actorRank = roleRank[actorRole];
    const minimumRank = Math.min(...allowedRoles.map((role) => roleRank[role]));
    if (actorRank < minimumRank) {
      throw new Error("Permission denied");
    }
  }
}
