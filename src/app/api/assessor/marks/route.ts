import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";
import { upsertFinalMarkForProject } from "@/lib/fypFinalMark";

const MarkSchema = z.object({
  projectId: z.string().min(1),
  mark: z.number().min(0).max(100),
  presentationMark: z.number().min(0).max(100).optional(),
  reportMark: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = MarkSchema.parse(json);

    // Verify this lecturer is assigned as assessor for this project
    const assignment = await prisma.assessorAssignment.findUnique({
      where: { projectId_assessorId: { projectId: payload.projectId, assessorId: auth.lecturer.id } },
    });
    if (!assignment && !auth.lecturer.isAdmin) {
      return Response.json({ error: "Forbidden: you are not assigned as assessor" }, { status: 403 });
    }

    const project = await prisma.fypProject.findUnique({ where: { id: payload.projectId } });
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    const mark = await prisma.assessorMark.upsert({
      where: { projectId_assessorId: { projectId: payload.projectId, assessorId: auth.lecturer.id } },
      create: {
        projectId: payload.projectId,
        assessorId: auth.lecturer.id,
        mark: payload.mark,
        presentationMark: payload.presentationMark,
        reportMark: payload.reportMark,
        notes: payload.notes,
      },
      update: {
        mark: payload.mark,
        presentationMark: payload.presentationMark,
        reportMark: payload.reportMark,
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
