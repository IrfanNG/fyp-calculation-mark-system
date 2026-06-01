import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;

    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session || !session.lecturerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newCode, newName, newSemester, newYear } = await request.json();

    // Get lecturer details to check admin status
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: session.lecturerId },
      select: { isAdmin: true },
    });
    if (!lecturer) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const originalCourse = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        clos: true,
        assessments: {
          include: {
            assessmentClo: {
              include: { clo: true },
            },
          },
        },
        lecturers: {
          where: { lecturerId: session.lecturerId },
          select: { lecturerId: true },
        },
      },
    });

    if (!originalCourse) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }
    if (!lecturer.isAdmin && originalCourse.lecturers.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const newCourse = await prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          code: newCode || originalCourse.code,
          name: newName || originalCourse.name,
          semester: newSemester || originalCourse.semester,
          year: newYear || originalCourse.year,
        },
      });

      // Assign cloning lecturer to the new course
      await tx.courseLecturer.create({
        data: {
          courseId: course.id,
          lecturerId: session.lecturerId,
        },
      });

      await tx.courseClass.createMany({
        data: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"].map((name) => ({
          courseId: course.id,
          name,
        })),
      });

      const cloMapping = new Map<string, string>();
      for (const clo of originalCourse.clos) {
        const newClo = await tx.clo.create({
          data: {
            courseId: course.id,
            code: clo.code,
            description: clo.description,
          },
        });
        cloMapping.set(clo.id, newClo.id);
      }

      for (const assessment of originalCourse.assessments) {
        const newAssessment = await tx.assessment.create({
          data: {
            courseId: course.id,
            name: assessment.name,
            weightage: assessment.weightage,
            fullMark: assessment.fullMark,
          },
        });

        for (const mapping of assessment.assessmentClo) {
          const newCloId = cloMapping.get(mapping.cloId);
          if (newCloId) {
            await tx.assessmentClo.create({
              data: {
                assessmentId: newAssessment.id,
                cloId: newCloId,
              },
            });
          }
        }
      }

      return course;
    });

    return Response.json({ course: newCourse }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
