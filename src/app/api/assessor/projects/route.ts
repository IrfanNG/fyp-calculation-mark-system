import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";

export async function GET() {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const assignments = await prisma.assessorAssignment.findMany({
    where: { assessorId: auth.lecturer.id },
    orderBy: { assignedAt: "desc" },
    include: {
      project: {
        include: {
          student: { select: { id: true, studentId: true, name: true } },
          supervisor: { select: { id: true, staffId: true, name: true } },
          submissions: {
            orderBy: { submittedAt: "desc" },
          },
          feedbacks: {
            orderBy: { createdAt: "desc" },
            include: { author: { select: { name: true, staffId: true } } },
          },
          supervisorMark: true,
          assessorMarks: {
            where: { assessorId: auth.lecturer.id },
          },
          finalMark: true,
        },
      },
      schedule: true,
    },
  });

  return Response.json({ assignments });
}
