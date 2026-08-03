import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalWorkspaceRepository, WorkspaceService } from "./workspaces";

async function withTempRepository(
  testFn: (repo: LocalWorkspaceRepository) => Promise<void>,
) {
  const tempDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "launch-check-workspaces-"),
  );
  const repo = new LocalWorkspaceRepository(
    path.join(tempDir, "workspaces.json"),
  );
  try {
    await testFn(repo);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("creates, updates, lists, and deletes workspaces through the repository", async () => {
  await withTempRepository(async (repo) => {
    const service = new WorkspaceService(repo);
    const created = await service.createWorkspace({
      name: "Launch Ops",
      ownerId: "owner-1",
      shareScanHistory: true,
      settings: { allowMemberInvites: true },
    });

    const updated = await service.updateWorkspace(
      created.id,
      { name: "Launch Ops Updated" },
      "owner-1",
      "owner",
    );

    const listed = await service.listWorkspaces();
    assert.equal(listed.length, 1);
    assert.equal(updated.name, "Launch Ops Updated");

    await service.deleteWorkspace(created.id, "owner-1", "owner");
    const afterDelete = await service.listWorkspaces();
    assert.equal(afterDelete.length, 0);
  });
});

test("invites members and enforces role-based permissions", async () => {
  await withTempRepository(async (repo) => {
    const service = new WorkspaceService(repo);
    const workspace = await service.createWorkspace({
      name: "Product",
      ownerId: "owner-1",
      shareScanHistory: true,
    });

    const invited = await service.inviteMember(
      workspace.id,
      { email: "dev@example.com", role: "member" },
      "owner-1",
      "owner",
    );

    assert.equal(invited.status, "pending");
    assert.equal(invited.role, "member");

    await assert.rejects(
      service.inviteMember(
        workspace.id,
        { email: "viewer@example.com", role: "viewer" },
        "member-1",
        "viewer",
      ),
      /permission/i,
    );
  });
});

test("stores workspace settings and shareScanHistory flag", async () => {
  await withTempRepository(async (repo) => {
    const service = new WorkspaceService(repo);
    const workspace = await service.createWorkspace({
      name: "Analytics",
      ownerId: "owner-1",
      shareScanHistory: false,
      settings: { allowMemberInvites: false },
    });

    const updated = await service.updateWorkspace(
      workspace.id,
      {
        shareScanHistory: true,
        settings: {
          allowMemberInvites: true,
          requireApprovalForPublicLinks: true,
        },
      },
      "owner-1",
      "owner",
    );

    assert.equal(updated.shareScanHistory, true);
    assert.equal(updated.settings.allowMemberInvites, true);
    assert.equal(updated.settings.requireApprovalForPublicLinks, true);
  });
});

test("blocks non-owners from deleting a workspace", async () => {
  await withTempRepository(async (repo) => {
    const service = new WorkspaceService(repo);
    const workspace = await service.createWorkspace({
      name: "Restricted",
      ownerId: "owner-1",
      shareScanHistory: true,
    });

    await assert.rejects(
      service.deleteWorkspace(workspace.id, "someone-else", "viewer"),
      /permission/i,
    );
  });
});
