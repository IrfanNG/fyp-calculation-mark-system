import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForApi } from "@/lib/apiAuth";

const AssignSchema = z.object({
  projectId: z.string().min(1),
  assessorId: z.string().min(1),
  scheduleId: z.string().optional(),
});

const UnassignSchema = z.object({
  projectId: z.string().min(1),
  assessorId: z.string().min(1),
});

export async function GET() {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const assignments = await prisma.assessorAssignment.findMany({
    orderBy: { assignedAt: "desc" },
    include: {
      project: {
        include: { student: { select: { studentId: true, name: true } } },
      },
      assessor: { select: { id: true, staffId: true, name: true } },
      schedule: true,
    },
  });

  return Response.json({ assignments });
}

export async function POST(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = AssignSchema.parse(json);

    const project = await prisma.fypProject.findUnique({ where: { id: payload.projectId } });
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    const assessor = await prisma.lecturer.findUnique({ where: { id: payload.assessorId } });
    if (!assessor) return Response.json({ error: "Assessor not found" }, { status: 404 });

    const assignment = await prisma.assessorAssignment.upsert({
      where: { projectId_assessorId: { projectId: payload.projectId, assessorId: payload.assessorId } },
      create: {
        projectId: payload.projectId,
        assessorId: payload.assessorId,
        scheduleId: payload.scheduleId ?? null,
      },
      update: {
        scheduleId: payload.scheduleId ?? null,
      },
      include: {
        assessor: { select: { id: true, staffId: true, name: true } },
        schedule: true,
      },
    });

    return Response.json({ assignment }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = UnassignSchema.parse(json);

    await prisma.assessorAssignment.delete({
      where: { projectId_assessorId: { projectId: payload.projectId, assessorId: payload.assessorId } },
    });

    return Response.json({ ok: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
