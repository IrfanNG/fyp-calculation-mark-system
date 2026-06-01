import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";

const FeedbackSchema = z.object({
  projectId: z.string().min(1),
  content: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = FeedbackSchema.parse(json);

    // Verify access: must be supervisor or assigned assessor
    const project = await prisma.fypProject.findUnique({
      where: { id: payload.projectId },
      include: {
        assessorAssignments: { select: { assessorId: true } },
      },
    });
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

    const isSuper = project.supervisorId === auth.lecturer.id;
    const isAssessor = project.assessorAssignments.some((a) => a.assessorId === auth.lecturer.id);
    if (!isSuper && !isAssessor && !auth.lecturer.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const feedback = await prisma.fypFeedback.create({
      data: {
        projectId: payload.projectId,
        authorId: auth.lecturer.id,
        content: payload.content,
      },
      include: { author: { select: { name: true, staffId: true } } },
    });

    return Response.json({ feedback }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
