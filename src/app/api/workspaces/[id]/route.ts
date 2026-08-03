import { NextResponse } from "next/server";
import { LocalWorkspaceRepository, WorkspaceService } from "@/lib/workspaces";

const repository = new LocalWorkspaceRepository(
  process.env.WORKSPACE_DATA_PATH ?? "/tmp/launch-check-workspaces.json",
);
const service = new WorkspaceService(repository);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const workspace = await service.getWorkspace(id);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }
  return NextResponse.json(workspace);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const member = await service.inviteMember(
      id,
      { email: body.email, role: body.role ?? "viewer" },
      body.actorId ?? "system",
      body.actorRole ?? "owner",
    );
    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to invite member";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
