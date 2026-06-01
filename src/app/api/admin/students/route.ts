import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminForApi, requireLecturerForApi } from "@/lib/apiAuth";
import { hashPassword } from "@/lib/auth";
import { isValidUniklId, UNIKL_ID_MESSAGE } from "@/lib/validation";

const CreateStudentSchema = z.object({
  studentId: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(120),
  supervisorId: z.string().optional(),
  assessorId: z.string().optional(),
});

export async function GET() {
  // Allow all authenticated lecturers to see the student list with project details
  const auth = await requireLecturerForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const students = await prisma.student.findMany({
    orderBy: { name: "asc" },
    include: {
      fypProject: {
        include: {
          supervisor: {
            select: { name: true }
          },
          assessorAssignments: {
            include: {
              assessor: {
                select: { name: true }
              }
            }
          }
        }
      }
    },
  });

  return Response.json({ students });
}

export async function POST(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = CreateStudentSchema.parse(json);

    if (!isValidUniklId(payload.studentId)) {
      return Response.json({ error: UNIKL_ID_MESSAGE }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({ where: { studentId: payload.studentId } });
    if (existing) {
      return Response.json({ error: "Student ID already exists" }, { status: 409 });
    }

    const passwordHash = hashPassword(payload.studentId);

    const student = await prisma.student.create({
      data: {
        studentId: payload.studentId,
        name: payload.name,
        passwordHash: passwordHash
      },
      select: { id: true, studentId: true, name: true, createdAt: true },
    });

    if (payload.supervisorId) {
      const project = await prisma.fypProject.create({
        data: {
          title: "Pending Title",
          studentId: student.id,
          supervisorId: payload.supervisorId,
          phase: "FYP1",
          status: "draft"
        }
      });

      if (payload.assessorId) {
        await prisma.assessorAssignment.create({
          data: {
            projectId: project.id,
            assessorId: payload.assessorId
          }
        });
      }
    }

    return Response.json({ student }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}
