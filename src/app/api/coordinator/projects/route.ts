import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForApi } from "@/lib/apiAuth";

const CreateProjectSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).optional(),
  studentId: z.string().min(1),
  supervisorId: z.string().min(1),
  phase: z.enum(["FYP1", "FYP2"]).optional(),
});

const UpdateProjectSchema = z.object({
  projectId: z.string().min(1),
  phase: z.enum(["FYP1", "FYP2"]).optional(),
});

export async function GET() {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const students = await prisma.student.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      fypProject: {
        include: {
          supervisor: { select: { id: true, staffId: true, name: true } },
          supervisorMark: true,
          assessorMarks: true,
          coordinatorMark: true,
          finalMark: true,
          assessorAssignments: {
            include: { assessor: { select: { id: true, staffId: true, name: true } } },
          },
        },
      },
    },
  });

  return Response.json({ students });
}

export async function PATCH(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = UpdateProjectSchema.parse(json);

    const project = await prisma.fypProject.update({
      where: { id: payload.projectId },
      data: {
        ...(payload.phase ? { phase: payload.phase } : {}),
      },
    });

    return Response.json({ project });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = CreateProjectSchema.parse(json);

    // Check student exists
    const student = await prisma.student.findUnique({ where: { id: payload.studentId } });
    if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

    // Check student doesn't already have a project
    const existing = await prisma.fypProject.findUnique({ where: { studentId: payload.studentId } });
    if (existing) return Response.json({ error: "Student already has a project" }, { status: 409 });

    // Check supervisor exists
    const supervisor = await prisma.lecturer.findUnique({ where: { id: payload.supervisorId } });
    if (!supervisor) return Response.json({ error: "Supervisor not found" }, { status: 404 });

    const project = await prisma.fypProject.create({
      data: {
        title: payload.title,
        description: payload.description,
        studentId: payload.studentId,
        supervisorId: payload.supervisorId,
        ...(payload.phase ? { phase: payload.phase } : {}),
      },
      include: {
        student: { select: { id: true, studentId: true, name: true } },
        supervisor: { select: { id: true, staffId: true, name: true } },
      },
    });

    return Response.json({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
