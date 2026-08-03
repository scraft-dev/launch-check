import { NextResponse } from "next/server";
import { LocalWorkspaceRepository, WorkspaceService } from "@/lib/workspaces";

const repository = new LocalWorkspaceRepository(
  process.env.WORKSPACE_DATA_PATH ?? "/tmp/launch-check-workspaces.json",
);
const service = new WorkspaceService(repository);

function parseBody(request: Request) {
  return request.json();
}

export async function GET() {
  const workspaces = await service.listWorkspaces();
  return NextResponse.json(workspaces);
}

export async function POST(request: Request) {
  try {
    const body = await parseBody(request);
    const workspace = await service.createWorkspace({
      name: body.name,
      ownerId: body.ownerId ?? "system",
      shareScanHistory: body.shareScanHistory,
      settings: body.settings,
    });
    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create workspace";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await parseBody(request);
    const workspace = await service.updateWorkspace(
      body.id,
      body.updates ?? {},
      body.actorId ?? "system",
      body.actorRole ?? "owner",
    );
    return NextResponse.json(workspace);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update workspace";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await parseBody(request);
    await service.deleteWorkspace(
      body.id,
      body.actorId ?? "system",
      body.actorRole ?? "owner",
    );
    return NextResponse.json({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete workspace";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
