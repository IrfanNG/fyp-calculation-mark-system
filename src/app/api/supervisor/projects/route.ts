import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireLecturerForApi } from "@/lib/apiAuth";

const CreateProjectSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(1000).optional(),
  studentId: z.string().min(1),
  phase: z.enum(["FYP1", "FYP2"]).optional(),
});

const UpdateProjectSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  phase: z.enum(["FYP1", "FYP2"]).optional(),
});

export async function GET() {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const projects = await prisma.fypProject.findMany({
    where: { supervisorId: auth.lecturer.id },
    orderBy: { createdAt: "desc" },
    include: {
      student: { select: { id: true, studentId: true, name: true } },
      submissions: {
        orderBy: { submittedAt: "desc" },
      },
      feedbacks: {
        orderBy: { createdAt: "desc" },
        include: { author: { select: { name: true, staffId: true } } },
      },
      supervisorMark: true,
      assessorMarks: true,
      finalMark: true,
      assessorAssignments: {
        include: { assessor: { select: { id: true, staffId: true, name: true } } },
      },
    },
  });

  return Response.json({ projects });
}

export async function POST(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = CreateProjectSchema.parse(json);

    // Check student exists
    const student = await prisma.student.findUnique({ where: { id: payload.studentId } });
    if (!student) return Response.json({ error: "Student not found" }, { status: 404 });

    // Check if student already has a project
    const existing = await prisma.fypProject.findUnique({ where: { studentId: payload.studentId } });

    let project;
    if (existing) {
      // Transfer project to current supervisor
      project = await prisma.fypProject.update({
        where: { id: existing.id },
        data: {
          title: payload.title,
          description: payload.description,
          supervisorId: auth.lecturer.id,
          phase: payload.phase || existing.phase,
          status: "approved",
        },
        include: {
          student: { select: { id: true, studentId: true, name: true } },
        },
      });
    } else {
      // Create new project
      project = await prisma.fypProject.create({
        data: {
          title: payload.title,
          description: payload.description,
          studentId: payload.studentId,
          supervisorId: auth.lecturer.id,
          phase: payload.phase || "FYP1",
          status: "approved",
        },
        include: {
          student: { select: { id: true, studentId: true, name: true } },
        },
      });
    }

    return Response.json({ project }, { status: existing ? 200 : 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = UpdateProjectSchema.parse(json);

    // Ensure project belongs to this supervisor
    const existing = await prisma.fypProject.findUnique({
      where: { id: payload.projectId },
    });

    if (!existing) return Response.json({ error: "Project not found" }, { status: 404 });
    if (existing.supervisorId !== auth.lecturer.id && !auth.lecturer.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const project = await prisma.fypProject.update({
      where: { id: payload.projectId },
      data: {
        ...(payload.title ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
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
