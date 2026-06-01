import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";

// PATCH: approve or reject a submission
const ReviewSchema = z.object({
  submissionId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  notes: z.string().max(1000).optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = ReviewSchema.parse(json);

    const submission = await prisma.fypSubmission.findUnique({
      where: { id: payload.submissionId },
      include: { project: true },
    });
    if (!submission) return Response.json({ error: "Submission not found" }, { status: 404 });

    // Only the supervisor of the project can review
    if (submission.project.supervisorId !== auth.lecturer.id && !auth.lecturer.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.fypSubmission.update({
      where: { id: payload.submissionId },
      data: {
        status: payload.status,
        notes: payload.notes,
        reviewedAt: new Date(),
      },
    });

    // If approved, update project status to "approved"
    if (payload.status === "approved" && submission.project.status === "submitted") {
      await prisma.fypProject.update({
        where: { id: submission.project.id },
        data: { status: "approved" },
      });
    }

    return Response.json({ submission: updated });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
