import { NextResponse } from "next/server";
import { EnterpriseService, type EnterpriseRole } from "@/lib/enterprise";
import { JsonEnterpriseRepository } from "@/lib/enterprise-store";

const service = new EnterpriseService(new JsonEnterpriseRepository());

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const organizationId = url.searchParams.get("organizationId");
    const actorId = url.searchParams.get("actorId");
    const view = url.searchParams.get("view");
    if (organizationId && actorId && view === "audit") {
      return NextResponse.json({
        auditEvents: await service.auditEvents(organizationId, actorId),
      });
    }
    if (organizationId && actorId && view === "compliance") {
      return NextResponse.json({
        compliance: await service.compliance(organizationId, actorId),
      });
    }
    return NextResponse.json({ organizations: await service.list() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Enterprise request failed",
      },
      { status: 403 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "create") {
      return NextResponse.json({
        organization: await service.create({
          name: String(body.name ?? ""),
          slug: String(body.slug ?? ""),
          ownerId: String(body.ownerId ?? ""),
          ownerEmail: String(body.ownerEmail ?? ""),
        }),
      });
    }
    const organizationId = String(body.organizationId ?? "");
    const actorId = String(body.actorId ?? "");
    if (!organizationId || !actorId) {
      return NextResponse.json(
        { error: "Organization and actor are required" },
        { status: 400 },
      );
    }
    if (body.action === "invite") {
      return NextResponse.json({
        member: await service.invite(organizationId, actorId, {
          email: String(body.email ?? ""),
          role: body.role as EnterpriseRole,
        }),
      });
    }
    if (body.action === "role") {
      return NextResponse.json({
        member: await service.changeRole(
          organizationId,
          actorId,
          String(body.memberId ?? ""),
          body.role as EnterpriseRole,
        ),
      });
    }
    if (body.action === "security") {
      return NextResponse.json({
        organization: await service.update(organizationId, actorId, {
          sso: body.sso as Parameters<EnterpriseService["update"]>[2]["sso"],
          retention: body.retention as Parameters<
            EnterpriseService["update"]
          >[2]["retention"],
        }),
      });
    }
    return NextResponse.json(
      { error: "Unsupported enterprise action" },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enterprise request failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Permission denied" ? 403 : 400 },
    );
  }
}
