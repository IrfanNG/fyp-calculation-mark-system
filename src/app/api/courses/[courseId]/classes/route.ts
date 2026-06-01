import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

function defaultClassNames() {
  return ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"];
}

export async function GET(_request: Request, ctx: { params: Promise<{ courseId: string }> }) {
  try {
    const { courseId } = await ctx.params;

    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Get lecturer details to check admin status
    const lecturer = await prisma.lecturer.findUnique({
      where: { id: session.lecturerId },
      select: { isAdmin: true },
    });
    if (!lecturer) return Response.json({ error: "Unauthorized" }, { status: 401 });

    // Check if course exists and lecturer is assigned (or is admin)
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
    if (!course) return Response.json({ error: "Course not found" }, { status: 404 });
    if (!lecturer.isAdmin && course.lecturers.length === 0) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingCount = await prisma.courseClass.count({ where: { courseId } });
    if (existingCount === 0) {
      await prisma.courseClass.createMany({
        data: defaultClassNames().map((name) => ({ courseId, name })),
      });
    }

    const classes = await prisma.courseClass.findMany({
      where: { courseId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return Response.json({ classes });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return Response.json({ error: err.flatten() }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
