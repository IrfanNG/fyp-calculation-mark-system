import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";

const MarkSchema = z.object({
  projectId: z.string().min(1),
  mark: z.number().min(0).max(100),
  // Optional component marks (0-100) used by the FYP1/FYP2 scheme.
  progressMark: z.number().min(0).max(100).optional(),
  presentationMark: z.number().min(0).max(100).optional(),
  reportMark: z.number().min(0).max(100).optional(),
  paperMark: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = MarkSchema.parse(json);

    // Verify this lecturer is the supervisor for this project
    const project = await prisma.fypProject.findUnique({ where: { id: payload.projectId } });
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    if (project.supervisorId !== auth.lecturer.id && !auth.lecturer.isAdmin) {
      return Response.json({ error: "Forbidden: you are not the supervisor" }, { status: 403 });
    }

    const mark = await prisma.supervisorMark.upsert({
      where: { projectId: payload.projectId },
      create: {
        projectId: payload.projectId,
        supervisorId: auth.lecturer.id,
        mark: payload.mark,
        progressMark: payload.progressMark,
        presentationMark: payload.presentationMark,
        reportMark: payload.reportMark,
        paperMark: payload.paperMark,
        notes: payload.notes,
      },
      update: {
        mark: payload.mark,
        progressMark: payload.progressMark,
        presentationMark: payload.presentationMark,
        reportMark: payload.reportMark,
        paperMark: payload.paperMark,
        notes: payload.notes,
        gradedAt: new Date(),
      },
    });

    return Response.json({ mark });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
