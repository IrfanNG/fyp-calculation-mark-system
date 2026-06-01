import { prisma } from "@/lib/prisma";
import { requireAdminForApi } from "@/lib/apiAuth";

export async function GET() {
  const { errorResponse } = await requireAdminForApi();
  if (errorResponse) return errorResponse;

  const enrollments = await prisma.enrollment.findMany({
    orderBy: { enrolledAt: "desc" },
    include: {
      student: { select: { studentId: true, name: true } },
      courseClass: {
        select: {
          name: true,
          course: { select: { code: true, name: true, semester: true, year: true } },
        },
      },
    },
    take: 100,
  });

  return Response.json({ enrollments });
}

export async function POST(request: Request) {
  const { errorResponse } = await requireAdminForApi();
  if (errorResponse) return errorResponse;

  try {
    const { studentId, courseClassId } = await request.json();

    if (!studentId || !courseClassId) {
      return Response.json({ error: "Missing studentId or courseClassId" }, { status: 400 });
    }

    // Validate student exists
    const student = await prisma.student.findUnique({ where: { studentId } });
    if (!student) {
      return Response.json({ error: "Student not found" }, { status: 404 });
    }

    // Validate class exists
    const courseClass = await prisma.courseClass.findUnique({ where: { id: courseClassId } });
    if (!courseClass) {
      return Response.json({ error: "Class not found" }, { status: 404 });
    }

    // Check if already enrolled
    const existing = await prisma.enrollment.findUnique({
      where: {
        studentId_courseClassId: {
          studentId: student.id,
          courseClassId,
        },
      },
    });

    if (existing) {
      return Response.json({ error: "Student already enrolled" }, { status: 400 });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseClassId,
      },
    });

    return Response.json({ enrollment }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { errorResponse } = await requireAdminForApi();
  if (errorResponse) return errorResponse;

  try {
    const { enrollmentId } = await request.json();

    if (!enrollmentId) {
      return Response.json({ error: "Missing enrollmentId" }, { status: 400 });
    }

    await prisma.enrollment.delete({ where: { id: enrollmentId } });

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
