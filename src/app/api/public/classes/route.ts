import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const classes = await prisma.courseClass.findMany({
      select: {
        id: true,
        name: true,
        courseId: true,
        course: {
          select: {
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        { course: { code: "asc" } },
        { name: "asc" },
      ],
    });

    const formatted = classes.map((c) => ({
      id: c.id,
      name: c.name,
      courseId: c.courseId,
      courseCode: c.course.code,
      courseName: c.course.name,
    }));

    return Response.json({ classes: formatted });
  } catch (error) {
    console.error("Failed to fetch classes:", error);
    return Response.json({ error: "Failed to fetch classes" }, { status: 500 });
  }
}
