import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForApi } from "@/lib/apiAuth";
import { upsertFinalMarkForProject } from "@/lib/fypFinalMark";

// Coordinator enters the Progress 10% component used by the FYP1/FYP2 scheme.
const ProgressSchema = z.object({
  projectId: z.string().min(1),
  progressMark: z.number().min(0).max(100),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = ProgressSchema.parse(json);

    const project = await prisma.fypProject.findUnique({ where: { id: payload.projectId } });
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    const mark = await prisma.coordinatorMark.upsert({
      where: { projectId: payload.projectId },
      create: {
        projectId: payload.projectId,
        coordinatorId: auth.lecturer.id,
        progressMark: payload.progressMark,
        notes: payload.notes,
      },
      update: {
        progressMark: payload.progressMark,
        notes: payload.notes,
        gradedAt: new Date(),
      },
    });

    const finalMark = await upsertFinalMarkForProject(payload.projectId);

    return Response.json({ mark, finalMark });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function GET() {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const marks = await prisma.coordinatorMark.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      project: {
        select: {
          id: true,
          title: true,
          phase: true,
          student: { select: { studentId: true, name: true } },
        },
      },
    },
  });

  return Response.json({ marks });
}
