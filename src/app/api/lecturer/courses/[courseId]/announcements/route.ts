import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getSessionCookieName, parseSessionValue } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await params;
    const cookieStore = await cookies();
    const raw = cookieStore.get(getSessionCookieName())?.value;
    const session = parseSessionValue(raw);
    
    if (!session || !session.lecturerId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify lecturer teaches this course
    const courseLecturer = await prisma.courseLecturer.findUnique({
      where: {
        courseId_lecturerId: {
          courseId,
          lecturerId: session.lecturerId,
        },
      },
    });

    if (!courseLecturer) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Get all class IDs for this course
    const classes = await prisma.courseClass.findMany({
      where: { courseId },
      select: { id: true },
    });
    const classIds = classes.map((c) => c.id);

    // Get announcements for this course's classes or course-wide (null courseClassId)
    const announcements = await prisma.announcement.findMany({
      where: {
        lecturerId: session.lecturerId,
        OR: [
          { courseClassId: { in: classIds } },
          { courseClassId: null },
        ],
      },
      orderBy: { publishedAt: "desc" },
      include: {
        courseClass: {
          select: { name: true },
        },
      },
    });

    return Response.json({ announcements });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
