import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { requireAdminForApi } from "@/lib/apiAuth";
import { isValidUniklId, isStrongPassword, UNIKL_ID_MESSAGE, PASSWORD_POLICY_MESSAGE } from "@/lib/validation";

const CreateLecturerSchema = z.object({
  staffId: z.string().trim().min(3).max(32),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(6).max(200),
  isAdmin: z.boolean().optional(),
  role: z.enum(["supervisor", "assessor"]).optional(),
  courseIds: z.array(z.string().min(1)).max(50).optional(),
});

function defaultClassNames() {
  return ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];
}

export async function GET() {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  const lecturers = await prisma.lecturer.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, staffId: true, name: true, isAdmin: true, role: true, createdAt: true },
  });

  return Response.json({ lecturers });
}

export async function POST(request: Request) {
  const auth = await requireAdminForApi();
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const json = await request.json().catch(() => null);
    const payload = CreateLecturerSchema.parse(json);

    if (!isValidUniklId(payload.staffId)) {
      return Response.json({ error: UNIKL_ID_MESSAGE }, { status: 400 });
    }

    if (!isStrongPassword(payload.password)) {
      return Response.json({ error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
    }

    const existing = await prisma.lecturer.findUnique({ where: { staffId: payload.staffId } });
    if (existing) {
      return Response.json({ error: "Staff ID already exists" }, { status: 409 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const lecturer = await tx.lecturer.create({
        data: {
          staffId: payload.staffId,
          name: payload.name,
          passwordHash: hashPassword(payload.password),
          isAdmin: payload.isAdmin ?? false,
          role: payload.isAdmin ? "supervisor" : (payload.role ?? "supervisor"),
        },
        select: { id: true, staffId: true, name: true, isAdmin: true, role: true, createdAt: true },
      });

      const ids = (payload.courseIds ?? []).filter(Boolean);
      for (const courseId of ids) {
        const course = await tx.course.findUnique({
          where: { id: courseId },
          select: {
            id: true,
            lecturers: { select: { lecturerId: true } },
          },
        });
        if (!course) throw new Error("Selected course not found");
        if (course.lecturers.length > 0) {
          throw new Error("Selected course is already assigned to a lecturer");
        }
        await tx.courseLecturer.create({
          data: { courseId, lecturerId: lecturer.id },
        });
        const existingClasses = await tx.courseClass.count({ where: { courseId } });
        if (existingClasses === 0) {
          await tx.courseClass.createMany({
            data: defaultClassNames().map((name) => ({ courseId, name })),
          });
        }
      }

      return lecturer;
    });

    return Response.json({ lecturer: created }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 400 });
  }
}

