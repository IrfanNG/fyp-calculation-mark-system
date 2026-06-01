import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";
import { z } from "zod";

const UpdateStatusSchema = z.object({
  projectId: z.string(),
  status: z.enum(["approved", "rejected"]),
});

export async function PATCH(req: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await req.json();
    const { projectId, status } = UpdateStatusSchema.parse(json);

    const project = await prisma.fypProject.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Only supervisor or admin can approve/reject
    if (project.supervisorId !== auth.lecturer.id && !auth.lecturer.isAdmin) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedProject = await prisma.fypProject.update({
      where: { id: projectId },
      data: { status },
    });

    return Response.json({ project: updatedProject });
  } catch (error) {
    return Response.json({ error: "Failed to update project status" }, { status: 500 });
  }
}
