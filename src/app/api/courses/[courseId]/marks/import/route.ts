import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session || !session.lecturerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { courseId, courseClassId, marks } = await request.json();

    if (!courseId || !Array.isArray(marks)) {
      return Response.json({ error: "Invalid data" }, { status: 400 });
    }

    // Get lecturer details to check admin status
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: session.lecturerId },
      select: { isAdmin: true },
    });
    if (!lecturer) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        id: true,
        lecturers: {
          where: { lecturerId: session.lecturerId },
          select: { lecturerId: true },
        },
      },
    });
    if (!course) {
      return Response.json({ error: "Course not found" }, { status: 404 });
    }
    if (!lecturer.isAdmin && course.lecturers.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const row of marks) {
      try {
        const { studentName, studentId, assessmentName, rawMark } = row;

        const assessment = await prisma.assessment.findFirst({
          where: { courseId, name: assessmentName },
        });

        if (!assessment) {
          results.errors.push(`Assessment "${assessmentName}" not found`);
          results.failed++;
          continue;
        }

        await prisma.markEntry.upsert({
          where: {
            id: `${courseId}-${courseClassId || "null"}-${assessment.id}-${studentName}-${studentId || "null"}`,
          },
          create: {
            courseId,
            courseClassId: courseClassId || null,
            assessmentId: assessment.id,
            studentName,
            studentId: studentId || null,
            rawMark: parseFloat(rawMark),
            fullMark: assessment.fullMark || null,
          },
          update: {
            rawMark: parseFloat(rawMark),
          },
        });

        results.success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(msg);
        results.failed++;
      }
    }

    return Response.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
