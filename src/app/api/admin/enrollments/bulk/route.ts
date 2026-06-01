import { prisma } from "@/lib/prisma";
import { requireAdminForApi } from "@/lib/apiAuth";

export async function POST(request: Request) {
  const { errorResponse } = await requireAdminForApi();
  if (errorResponse) return errorResponse;

  try {
    const { enrollments } = await request.json();

    if (!Array.isArray(enrollments) || enrollments.length === 0) {
      return Response.json({ error: "Invalid enrollments array" }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const item of enrollments) {
      try {
        const { studentId, courseCode, className } = item;

        if (!studentId || !courseCode || !className) {
          results.errors.push(`Missing fields for row: ${JSON.stringify(item)}`);
          results.failed++;
          continue;
        }

        const student = await prisma.student.findUnique({ where: { studentId } });
        if (!student) {
          results.errors.push(`Student ${studentId} not found`);
          results.failed++;
          continue;
        }

        const courseClass = await prisma.courseClass.findFirst({
          where: {
            name: className,
            course: { code: courseCode },
          },
        });

        if (!courseClass) {
          results.errors.push(`Class "${className}" not found for course "${courseCode}"`);
          results.failed++;
          continue;
        }

        // Check duplicate
        const existing = await prisma.enrollment.findUnique({
          where: {
            studentId_courseClassId: {
              studentId: student.id,
              courseClassId: courseClass.id,
            },
          },
        });

        if (existing) {
          results.errors.push(`Student ${studentId} already enrolled in ${courseCode} ${className}`);
          results.failed++;
          continue;
        }

        await prisma.enrollment.create({
          data: {
            studentId: student.id,
            courseClassId: courseClass.id,
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
